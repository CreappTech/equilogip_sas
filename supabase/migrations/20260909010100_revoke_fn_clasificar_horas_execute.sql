-- El proyecto revoca EXECUTE a public/anon en funciones security definer (ver
-- 20260905000000, 20260904000003). fn_clasificar_horas quedó ejecutable por
-- anon via /rest/v1/rpc; se alinea con el patron existente.
revoke execute on function public.fn_clasificar_horas(uuid) from public, anon;