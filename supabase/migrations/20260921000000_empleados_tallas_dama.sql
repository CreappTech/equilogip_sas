-- ============================================================================
-- Empleados — tallas de dotación de dama
--   * talla_pantalon: se agregan tallas de dama 6–20 (pares) a las de
--     caballero 28–42 ya existentes.
--   * talla_zapato: se agregan tallas 36 y 37 (dama) a las 38–45 existentes.
--   Solo se amplían los CHECK; los valores previos siguen siendo válidos.
-- ============================================================================

alter table public.empleados
  drop constraint empleados_talla_pantalon_check;

alter table public.empleados
  add constraint empleados_talla_pantalon_check check (
    talla_pantalon in ('6', '8', '10', '12', '14', '16', '18', '20', '28', '30', '32', '34', '36', '38', '40', '42')
  );

alter table public.empleados
  drop constraint empleados_talla_zapato_check;

alter table public.empleados
  add constraint empleados_talla_zapato_check check (
    talla_zapato in ('36', '37', '38', '39', '40', '41', '42', '43', '44', '45')
  );