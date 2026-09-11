-- Fase 6: Agregar permisos faltantes para gestión de usuarios y roles
-- Los permisos existentes (auth.usuarios.estado, auth.usuarios.roles) se mantienen
-- por compatibilidad; los nuevos son los que la UI de Fase 6 usará.

INSERT INTO permisos (id, nombre, codigo, descripcion, modulo, recurso, accion, estado)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Desactivar usuarios',    'auth.usuarios.desactivar',     'Cambiar estado de usuario y revocar acceso via Admin API', 'auth', 'usuarios', 'desactivar', 'activo'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Asignar roles a usuario', 'auth.usuarios.asignar_roles',  'Asignar o quitar roles a un usuario',                     'auth', 'usuarios', 'asignar_roles', 'activo'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Eliminar roles',          'auth.roles.eliminar',          'Eliminar roles del sistema (solo si no tienen usuarios)',   'auth', 'roles',    'eliminar', 'activo')
ON CONFLICT (codigo) DO NOTHING;

-- Asignar los nuevos permisos al rol AUTH_ADMIN
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.codigo = 'AUTH_ADMIN'
  AND p.codigo IN ('auth.usuarios.desactivar', 'auth.usuarios.asignar_roles', 'auth.roles.eliminar')
ON CONFLICT DO NOTHING;

-- Asignar los nuevos permisos al rol AUTH_SUPER_ADMIN
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.codigo = 'AUTH_SUPER_ADMIN'
  AND p.codigo IN ('auth.usuarios.desactivar', 'auth.usuarios.asignar_roles', 'auth.roles.eliminar')
ON CONFLICT DO NOTHING;
