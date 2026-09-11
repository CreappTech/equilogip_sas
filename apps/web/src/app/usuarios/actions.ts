"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getPermisos,
  requireUser,
} from "@/lib/auth/permisos";
import { contarAdminActivos } from "@/lib/queries/roles";
import {
  actualizarUsuarioSchema,
  asignarRolesSchema,
  cambiarEstadoSchema,
  eliminarUsuarioSchema,
  registrarUsuarioSchema,
  rolSchema,
} from "@/lib/schemas/usuarios";
import type { ActualizarUsuarioInput } from "@/lib/schemas/usuarios";
import type {
  RegistrarInput,
  EstadoUsuario,
  Resultado,
} from "@/lib/types/usuario";

async function autorizar(codigo: string): Promise<boolean> {
  const permisos = await getPermisos();
  return permisos.includes("*") || permisos.includes(codigo);
}

async function actorEsSuperAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_roles");
  const roles = (data ?? []) as { codigo: string }[];
  return roles.some((r) => r.codigo === "AUTH_SUPER_ADMIN");
}

async function rolIdsACodigos(rolIds: string[]): Promise<Set<string>> {
  const supabase = await createClient();
  if (rolIds.length === 0) return new Set();
  const { data } = await supabase.from("roles").select("id, codigo").in("id", rolIds);
  return new Set((data ?? []).map((r) => r.codigo));
}

async function usuarioTieneRolAdmin(usuarioId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuarios_roles")
    .select("roles(codigo)")
    .eq("usuario_id", usuarioId);
  const codigos = (data ?? [])
    .map((u) => (u.roles as unknown as { codigo: string } | null)?.codigo)
    .filter((c): c is string => Boolean(c));
  return codigos.includes("AUTH_SUPER_ADMIN") || codigos.includes("AUTH_ADMIN");
}

export async function crearUsuario(
  input: RegistrarInput
): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.usuarios.crear"))) {
    return { ok: false, error: "No tienes permiso para crear usuarios." };
  }

  const parsed = registrarUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;

  const actorSuper = await actorEsSuperAdmin();
  const codigosARol = await rolIdsACodigos(data.rolIds ?? []);
  if (codigosARol.has("AUTH_SUPER_ADMIN") && !actorSuper) {
    return { ok: false, error: "No puedes asignar el rol de Super Administrador." };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Servidor no configurado para crear usuarios." };
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.correo,
    password: data.password,
    email_confirm: true,
    user_metadata: { nombres: data.nombre, apellidos: data.apellido },
  });

  if (authError || !authData.user) {
    return {
      ok: false,
      error: /registered|existe|registrado/i.test(authError?.message ?? "")
        ? "El correo ya está en uso."
        : authError?.message ?? "No se pudo crear el usuario.",
    };
  }

  const nuevoId = authData.user.id;

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("profiles").insert({
    id: nuevoId,
    tenant_id: data.tenantId,
    numero_documento: data.numeroDocumento,
    nombres: data.nombre,
    apellidos: data.apellido,
    email_login: data.correo,
    telefono: data.telefono ?? null,
    estado: "activo",
    activo: true,
    rol: data.rol ?? "operario",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(nuevoId);
    return { ok: false, error: "No se pudo completar el alta del usuario." };
  }

  if (data.rolIds && data.rolIds.length > 0) {
    const { error: rolesError } = await supabase
      .from("usuarios_roles")
      .insert(data.rolIds.map((rid) => ({ usuario_id: nuevoId, rol_id: rid })));
    if (rolesError) {
      await admin.auth.admin.deleteUser(nuevoId);
      await supabase.from("profiles").delete().eq("id", nuevoId);
      return { ok: false, error: "No se pudo asignar los roles." };
    }
  }

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function cambiarEstado(
  input: { id: string; estado: EstadoUsuario }
): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.usuarios.desactivar"))) {
    return { ok: false, error: "No tienes permiso para cambiar el estado." };
  }

  const parsed = cambiarEstadoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { id, estado } = parsed.data;

  if (id === (await requireUser()).id) {
    return { ok: false, error: "No puedes cambiar tu propio estado." };
  }

  if (estado !== "activo" && (await usuarioTieneRolAdmin(id))) {
    const admins = await contarAdminActivos();
    if (admins <= 1) {
      return {
        ok: false,
        error: "No puedes inactivar al último administrador activo.",
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ estado, activo: estado === "activo" })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  if (estado !== "activo") {
    const banError = await adminBanUser(id);
    if (banError) return { ok: false, error: banError };
  } else {
    const unbanError = await adminUnbanUser(id);
    if (unbanError) return { ok: false, error: unbanError };
  }

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function asignarRoles(
  input: { usuarioId: string; rolIds: string[] }
): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.usuarios.asignar_roles"))) {
    return { ok: false, error: "No tienes permiso para gestionar roles." };
  }

  const parsed = asignarRolesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { usuarioId, rolIds } = parsed.data;

  const errorReasignar = await reasignarRolesUsuario(usuarioId, rolIds);
  if (errorReasignar) return { ok: false, error: errorReasignar };

  revalidatePath("/usuarios");
  return { ok: true };
}

async function reasignarRolesUsuario(
  usuarioId: string,
  rolIds: string[]
): Promise<string | null> {
  const actorSuper = await actorEsSuperAdmin();
  const codigosARol = await rolIdsACodigos(rolIds);
  if (codigosARol.has("AUTH_SUPER_ADMIN") && !actorSuper) {
    return "No puedes asignar el rol de Super Administrador.";
  }

  const supabase = await createClient();

  const { data: actuales } = await supabase
    .from("usuarios_roles")
    .select("roles(codigo), id")
    .eq("usuario_id", usuarioId);
  const codigosActuales = (actuales ?? [])
    .map((u) => (u.roles as unknown as { codigo: string } | null)?.codigo)
    .filter((c): c is string => Boolean(c));

  const pierdeAdmin =
    (codigosActuales.includes("AUTH_SUPER_ADMIN") && !codigosARol.has("AUTH_SUPER_ADMIN")) ||
    (codigosActuales.includes("AUTH_ADMIN") && !codigosARol.has("AUTH_ADMIN"));

  if (pierdeAdmin && (await usuarioTieneRolAdmin(usuarioId))) {
    const admins = await contarAdminActivos();
    if (admins <= 1) {
      return "No puedes quitar el rol administrativo al último administrador activo.";
    }
  }

  const { error: delError } = await supabase
    .from("usuarios_roles")
    .delete()
    .eq("usuario_id", usuarioId);

  if (delError) return delError.message;

  if (rolIds.length > 0) {
    const { error: insError } = await supabase
      .from("usuarios_roles")
      .insert(rolIds.map((rid) => ({ usuario_id: usuarioId, rol_id: rid })));
    if (insError) return insError.message;
  }

  return null;
}

export async function actualizarUsuario(
  input: ActualizarUsuarioInput
): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.usuarios.editar"))) {
    return { ok: false, error: "No tienes permiso para editar usuarios." };
  }

  const parsed = actualizarUsuarioSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { id, nombre, apellido, numeroDocumento, telefono, rolIds } = parsed.data;

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      nombres: nombre,
      apellidos: apellido,
      numero_documento: numeroDocumento,
      telefono: telefono ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, error: error.message };

  if (rolIds !== undefined) {
    if (!(await autorizar("auth.usuarios.asignar_roles"))) {
      return { ok: false, error: "No tienes permiso para gestionar roles." };
    }
    const errorRoles = await reasignarRolesUsuario(id, rolIds);
    if (errorRoles) return { ok: false, error: errorRoles };
  }

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function eliminarUsuario(input: { id: string }): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.usuarios.desactivar"))) {
    return { ok: false, error: "No tienes permiso para eliminar usuarios." };
  }

  const parsed = eliminarUsuarioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { id } = parsed.data;

  if (id === (await requireUser()).id) {
    return { ok: false, error: "No puedes eliminar tu propio usuario." };
  }

  if (await usuarioTieneRolAdmin(id)) {
    const admins = await contarAdminActivos();
    if (admins <= 1) {
      return {
        ok: false,
        error: "No puedes eliminar al último administrador activo.",
      };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString(), activo: false })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, error: error.message };

  const banError = await adminBanUser(id);
  if (banError) return { ok: false, error: banError };

  revalidatePath("/usuarios");
  return { ok: true };
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function adminBanUser(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (error) return error.message;
    await admin.auth.admin.signOut(userId, "global");
    return null;
  } catch {
    return "No se pudo revocar el acceso del usuario.";
  }
}

async function adminUnbanUser(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (error) return error.message;
    return null;
  } catch {
    return "No se pudo restaurar el acceso del usuario.";
  }
}

export async function eliminarRol(rolId: string): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.roles.eliminar"))) {
    return { ok: false, error: "No tienes permiso para eliminar roles." };
  }

  const supabase = await createClient();

  const { data: rol, error: rolError } = await supabase
    .from("roles")
    .select("id, nombre, es_sistema")
    .eq("id", rolId)
    .single();

  if (rolError || !rol) {
    return { ok: false, error: "No se encontró el rol." };
  }

  if (rol.es_sistema) {
    return { ok: false, error: "No se puede eliminar un rol del sistema." };
  }

  const { count } = await supabase
    .from("usuarios_roles")
    .select("id", { count: "exact", head: true })
    .eq("rol_id", rolId);

  if (count && count > 0) {
    return {
      ok: false,
      error: `No se puede eliminar el rol "${rol.nombre}" porque tiene ${count} usuario(s) asignado(s). Quitá el rol de esos usuarios primero.`,
    };
  }

  const { error: delPermisos } = await supabase
    .from("roles_permisos")
    .delete()
    .eq("rol_id", rolId);
  if (delPermisos) return { ok: false, error: delPermisos.message };

  const { error: delRol } = await supabase.from("roles").delete().eq("id", rolId);
  if (delRol) return { ok: false, error: delRol.message };

  revalidatePath("/usuarios/roles");
  return { ok: true };
}

export async function crearRol(
  input: { nombre: string; codigo: string; descripcion?: string; permisoIds?: string[] }
): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.roles.crear"))) {
    return { ok: false, error: "No tienes permiso para crear roles." };
  }

  const parsed = rolSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;

  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("roles")
    .select("id")
    .eq("codigo", data.codigo)
    .single();

  if (existente) {
    return { ok: false, error: `Ya existe un rol con el código "${data.codigo}".` };
  }

  const { data: nuevoRol, error: rolError } = await supabase
    .from("roles")
    .insert({
      nombre: data.nombre,
      codigo: data.codigo,
      descripcion: data.descripcion ?? null,
      estado: data.estado ?? "activo",
      es_sistema: false,
    })
    .select("id")
    .single();

  if (rolError || !nuevoRol) {
    return { ok: false, error: "No se pudo crear el rol." };
  }

  if (data.permisoIds && data.permisoIds.length > 0) {
    const { error: rpError } = await supabase
      .from("roles_permisos")
      .insert(data.permisoIds.map((pid) => ({ rol_id: nuevoRol.id, permiso_id: pid })));
    if (rpError) {
      await supabase.from("roles").delete().eq("id", nuevoRol.id);
      return { ok: false, error: "No se pudieron asignar los permisos." };
    }
  }

  revalidatePath("/usuarios/roles");
  return { ok: true };
}

export async function actualizarPermisosRol(
  rolId: string,
  permisoIds: string[]
): Promise<Resultado> {
  await requireUser();
  if (!(await autorizar("auth.roles.editar"))) {
    return { ok: false, error: "No tienes permiso para editar roles." };
  }

  const supabase = await createClient();

  const { data: rol } = await supabase
    .from("roles")
    .select("id, es_sistema")
    .eq("id", rolId)
    .single();

  if (!rol) {
    return { ok: false, error: "No se encontró el rol." };
  }

  if (rol.es_sistema) {
    const actorSuper = await actorEsSuperAdmin();
    if (!actorSuper) {
      return {
        ok: false,
        error: "Solo un Super Administrador puede modificar permisos de un rol del sistema.",
      };
    }
  }

  const { error: delError } = await supabase
    .from("roles_permisos")
    .delete()
    .eq("rol_id", rolId);

  if (delError) return { ok: false, error: delError.message };

  if (permisoIds.length > 0) {
    const { error: insError } = await supabase
      .from("roles_permisos")
      .insert(permisoIds.map((pid) => ({ rol_id: rolId, permiso_id: pid })));
    if (insError) return { ok: false, error: insError.message };
  }

  revalidatePath("/usuarios/roles");
  return { ok: true };
}
