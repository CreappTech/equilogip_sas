import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getPermisos(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_permisos");
  const raw = (data ?? []) as { codigo?: string }[];
  return raw
    .map((item) => item.codigo ?? "")
    .filter((codigo) => codigo.length > 0);
}

export async function getRoles(): Promise<
  { codigo: string; nombre: string }[]
> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("auth_roles");
  return (data ?? []) as { codigo: string; nombre: string }[];
}

export async function hasPermission(codigo: string): Promise<boolean> {
  const permisos = await getPermisos();
  return permisos.includes(codigo);
}

export async function requirePermission(codigo: string): Promise<void> {
  const permisos = await getPermisos();
  if (!permisos.includes(codigo)) {
    redirect("/login");
  }
}
