-- Actualiza los codigos de permisos del modulo auth:
--   'usuarios.ver'    -> 'auth.usuarios.ver'
--   'usuarios.crear'  -> 'auth.usuarios.crear'
--   'usuarios.editar' -> 'auth.usuarios.editar'
--   'usuarios.estado' -> 'auth.usuarios.estado'
--   'usuarios.roles'  -> 'auth.usuarios.roles'
--   'roles.ver'       -> 'auth.roles.ver'
--   'roles.crear'     -> 'auth.roles.crear'
--   'roles.editar'    -> 'auth.roles.editar'
--   'roles.permisos'  -> 'auth.roles.permisos'
--
-- Actualiza los codigos de roles del sistema:
--   'ADMIN'      -> 'AUTH_ADMIN'
--   'SUPER_ADMIN'-> 'AUTH_SUPER_ADMIN'
--
-- Idempotente: usa ON CONFLICT para tolerar ya estar renombrado.

update public.permisos
set codigo = 'auth.' || codigo,
    modulo  = 'auth',
    updated_at = now()
where modulo = 'usuarios' or modulo = 'roles'
  and not codigo like 'auth.%';

update public.roles
set codigo = 'AUTH_' || codigo,
    updated_at = now()
where codigo in ('ADMIN', 'SUPER_ADMIN')
  and not codigo like 'AUTH_%';
