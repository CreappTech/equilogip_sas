-- ============================================================================
-- Fix: auth_permisos() no devolvía '*' para el rol AUTH_SUPER_ADMIN.
--
-- El UNION con el bypass buscaba r.codigo = 'SUPER_ADMIN' (valor previo al
-- renombrado de la migración 20260904000001_update_permisos_codigos_auth.sql),
-- por lo que el rol AUTH_SUPER_ADMIN nunca obtenía el comodín '*' y, en
-- ausencia de roles_permisos directos, el sidebar colapsaba a solo Dashboard.
-- ============================================================================

create or replace function public.auth_permisos()
returns table(codigo text)
language sql
security definer
stable
set search_path = public, auth
as $$
  SELECT DISTINCT p.codigo::text
  FROM public.roles r
  JOIN public.usuarios_roles ur ON ur.rol_id = r.id
  JOIN public.roles_permisos rp ON rp.rol_id = r.id
  JOIN public.permisos p ON p.id = rp.permiso_id
  WHERE ur.usuario_id = auth.uid()
    AND r.estado = 'activo'
    AND p.estado = 'activo'
  UNION
  SELECT '*'
  WHERE EXISTS (
    SELECT 1 FROM public.roles r
    JOIN public.usuarios_roles ur ON ur.rol_id = r.id
    WHERE ur.usuario_id = auth.uid() AND r.estado = 'activo' AND r.codigo = 'AUTH_SUPER_ADMIN'
  );
$$;