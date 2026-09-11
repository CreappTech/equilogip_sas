import { createClient } from "@/lib/supabase/server";

export type ListadoUsuario = {
  id: string;
  nombres: string;
  apellidos: string;
  email_login: string;
  numero_documento: string;
  telefono: string | null;
  estado: string;
  activo: boolean;
  fecha_ultimo_acceso: string | null;
  created_at: string;
  roles: { id: string; codigo: string; nombre: string }[];
};

export type FiltrosUsuarios = {
  busqueda?: string;
  estado?: string;
  rolId?: string;
};

export async function listarUsuarios(
  filtros: FiltrosUsuarios = {}
): Promise<ListadoUsuario[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(
      `id, nombres, apellidos, email_login, numero_documento, telefono, estado, activo, fecha_ultimo_acceso, created_at`
    )
    .is("deleted_at", null)
    .order("nombres", { ascending: true });

  if (filtros.busqueda) {
    const b = filtros.busqueda.trim();
    query = query.or(
      `nombres.ilike.%${b}%,apellidos.ilike.%${b}%,email_login.ilike.%${b}%`
    );
  }

  if (filtros.estado && filtros.estado !== "todos") {
    query = query.eq("estado", filtros.estado);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const perfiles = data ?? [];

  if (filtros.rolId && filtros.rolId !== "todos") {
    const { data: ucs } = await supabase
      .from("usuarios_roles")
      .select("usuario_id")
      .eq("rol_id", filtros.rolId);
    const ids = new Set((ucs ?? []).map((u) => u.usuario_id));
    const filtrados = perfiles.filter((p) => ids.has(p.id));
    const conRoles = await adjuntarRoles(filtrados);
    return conRoles;
  }

  return adjuntarRoles(perfiles);
}

async function adjuntarRoles(
  perfiles: Array<Record<string, unknown> & { id: string }>
): Promise<ListadoUsuario[]> {
  if (perfiles.length === 0) return [];

  const supabase = await createClient();
  const ids = perfiles.map((p) => p.id);

  const { data: urSel } = await supabase
    .from("usuarios_roles")
    .select("usuario_id, roles(id, codigo, nombre)")
    .in("usuario_id", ids);

  const rolPorUsuario: Record<
    string,
    { id: string; codigo: string; nombre: string }[]
  > = {};
  for (const fila of urSel ?? []) {
    const rol = fila.roles as unknown as {
      id: string;
      codigo: string;
      nombre: string;
    } | null;
    if (!rol) continue;
    (rolPorUsuario[fila.usuario_id] ??= []).push(rol);
  }

  return perfiles.map((p) => ({
    id: p.id,
    nombres: (p.nombres as string) ?? "",
    apellidos: (p.apellidos as string) ?? "",
    email_login: (p.email_login as string) ?? "",
    numero_documento: (p.numero_documento as string) ?? "",
    telefono: (p.telefono as string | null) ?? null,
    estado: (p.estado as string) ?? "activo",
    activo: (p.activo as boolean) ?? true,
    fecha_ultimo_acceso: (p.fecha_ultimo_acceso as string | null) ?? null,
    created_at: (p.created_at as string) ?? "",
    roles: rolPorUsuario[p.id] ?? [],
  }));
}

export async function obtenerUsuario(id: string): Promise<ListadoUsuario | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, nombres, apellidos, email_login, numero_documento, telefono, estado, activo, fecha_ultimo_acceso, created_at`
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  const listado = await adjuntarRoles([data as never]);
  return listado[0] ?? null;
}

export async function permisosEfectivosUsuario(
  usuarioId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuarios_roles")
    .select("roles(codigo)")
    .eq("usuario_id", usuarioId);

  const codigosRoles = (data ?? [])
    .map((f) => f.roles as unknown as { codigo: string })
    .map((r) => r.codigo);

  if (codigosRoles.includes("AUTH_SUPER_ADMIN")) {
    return ["*"];
  }

  if (codigosRoles.length === 0) return [];

  const { data: rolesSel } = await supabase
    .from("roles")
    .select("id, codigo")
    .in("codigo", codigosRoles);
  const rolIds = (rolesSel ?? []).map((r) => r.id);

  if (rolIds.length === 0) return [];

  const { data: rp2 } = await supabase
    .from("roles_permisos")
    .select("permisos(codigo)")
    .in("rol_id", rolIds);

  return (rp2 ?? [])
    .map((f) => f.permisos as unknown as { codigo: string })
    .map((p) => p.codigo);
}

export async function esSuperAdmin(usuarioId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuarios_roles")
    .select("roles(codigo)")
    .eq("usuario_id", usuarioId)
    .eq("roles.codigo", "AUTH_SUPER_ADMIN");
  return (
    (data ?? []).filter(
      (f) =>
        (f.roles as unknown as { codigo: string } | null)?.codigo ===
        "AUTH_SUPER_ADMIN"
    ).length > 0
  );
}
