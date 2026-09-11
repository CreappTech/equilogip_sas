import { createClient } from "@/lib/supabase/server";

export type Permiso = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  modulo: string;
  recurso: string;
  accion: string;
  estado: string;
};

export type PermisoAgrupado = {
  modulo: string;
  recursos: {
    recurso: string;
    permisos: Permiso[];
  }[];
};

export async function listarPermisos(activosSolo = true): Promise<Permiso[]> {
  const supabase = await createClient();
  let query = supabase
    .from("permisos")
    .select(
      "id, nombre, codigo, descripcion, modulo, recurso, accion, estado"
    )
    .order("modulo", { ascending: true })
    .order("recurso", { ascending: true })
    .order("accion", { ascending: true });

  if (activosSolo) {
    query = query.eq("estado", "activo");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Permiso[];
}

export async function agruparPermisosPorModulo(
  activosSolo = true
): Promise<PermisoAgrupado[]> {
  const permisos = await listarPermisos(activosSolo);

  const porModulo = new Map<string, Map<string, Permiso[]>>();
  for (const p of permisos) {
    if (!porModulo.has(p.modulo)) porModulo.set(p.modulo, new Map());
    const recursos = porModulo.get(p.modulo)!;
    if (!recursos.has(p.recurso)) recursos.set(p.recurso, []);
    recursos.get(p.recurso)!.push(p);
  }

  return Array.from(porModulo.entries()).map(([modulo, recursosMap]) => ({
    modulo,
    recursos: Array.from(recursosMap.entries()).map(([recurso, permisosList]) => ({
      recurso,
      permisos: permisosList,
    })),
  }));
}
