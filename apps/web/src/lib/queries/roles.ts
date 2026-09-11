import { createClient } from "@/lib/supabase/server";

export type Rol = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  es_sistema: boolean;
  estado: string;
  created_at: string;
};

export type RolConPermisos = Rol & {
  permisos: string[];
};

export async function listarRoles(activosSolo = false): Promise<Rol[]> {
  const supabase = await createClient();
  let query = supabase
    .from("roles")
    .select("id, nombre, codigo, descripcion, es_sistema, estado, created_at")
    .order("nombre", { ascending: true });

  if (activosSolo) {
    query = query.eq("estado", "activo");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Rol[];
}

export async function listarRolesConPermisos(): Promise<RolConPermisos[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select(
      "id, nombre, codigo, descripcion, es_sistema, estado, created_at, roles_permisos(permisos(codigo))"
    )
    .order("nombre", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    codigo: r.codigo,
    descripcion: r.descripcion,
    es_sistema: r.es_sistema,
    estado: r.estado,
    created_at: r.created_at,
    permisos: (r.roles_permisos ?? [])
      .map(
        (rp) =>
          (rp.permisos as unknown as { codigo: string } | null)?.codigo
      )
      .filter((c): c is string => Boolean(c)),
  }));
}

export async function obtenerRol(id: string): Promise<Rol | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, nombre, codigo, descripcion, es_sistema, estado, created_at")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Rol;
}

export async function contarAdminActivos(rolCodigo = "AUTH_SUPER_ADMIN"): Promise<number> {
  const supabase = await createClient();

  const { data: usrRoles } = await supabase
    .from("usuarios_roles")
    .select("usuario_id, roles(codigo)")
    .eq("roles.codigo", rolCodigo);
  const ids = (usrRoles ?? [])
    .filter(
      (u) =>
        (u.roles as unknown as { codigo: string } | null)?.codigo === rolCodigo
    )
    .map((u) => u.usuario_id);

  if (ids.length === 0) return 0;

  const { data: activos } = await supabase
    .from("profiles")
    .select("id")
    .in("id", ids)
    .eq("estado", "activo")
    .is("deleted_at", null);
  return activos?.length ?? 0;
}
