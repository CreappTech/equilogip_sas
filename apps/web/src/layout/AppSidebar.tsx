"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { usePermissions } from "@/lib/auth/permissions-provider";
import {
  BoxIcon,
  ChartBarIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  IdCardIcon,
  ListIcon,
  LockIcon,
} from "@/icons";

interface AppSidebarProps {
  permisos?: string[];
}

const AppSidebar: React.FC<AppSidebarProps> = ({ permisos = [] }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { permisos: permisosProvider } = usePermissions();
  const pathname = usePathname();

  const isActive = pathname === "/";

  const permisosActivos = permisos.length > 0 ? permisos : permisosProvider;

  const puedeGestionarUsuarios =
    permisosActivos.includes("*") ||
    permisosActivos.includes("auth.usuarios.ver") ||
    permisosActivos.includes("auth.usuarios.crear") ||
    permisosActivos.includes("auth.usuarios.editar");

  const puedeVerRoles =
    permisosActivos.includes("*") ||
    permisosActivos.includes("auth.roles.ver");

  const puedeVerActivos =
    permisosActivos.includes("*") ||
    permisosActivos.some((p) => p.startsWith("activos."));

  const puedeVerEmpleados =
    permisosActivos.includes("*") ||
    permisosActivos.some((p) => p.startsWith("empleados."));

  const puedeVerCatalogos =
    permisosActivos.includes("*") ||
    permisosActivos.some((p) => p.startsWith("catalogos."));

  const puedeVerOperaciones =
    permisosActivos.includes("*") ||
    permisosActivos.some((p) => p.startsWith("operaciones."));

  const puedeVerReportes =
    permisosActivos.includes("*") ||
    permisosActivos.includes("operaciones.actividades.ver");

  const puedeVerActas =
    permisosActivos.includes("*") ||
    permisosActivos.includes("operaciones.actas.ver");

  const puedeVerJornada =
    permisosActivos.includes("*") ||
    permisosActivos.some((p) => p.startsWith("jornada."));

  const navExpanded = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
              ? "w-[290px]"
              : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="Logo"
                width={150}
                height={40}
                priority
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="Logo"
                width={150}
                height={40}
                priority
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="Logo"
              width={32}
              height={32}
              priority
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menú"
                ) : (
                  <HorizontaLDots />
                )}
              </h2>
              <ul className="flex flex-col gap-4">
                <li>
                  <Link
                    href="/"
                    className={`menu-item group ${
                      isActive ? "menu-item-active" : "menu-item-inactive"
                    }`}
                  >
                    <span
                      className={
                        isActive
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                      }
                    >
                      <GridIcon />
                    </span>
                    {navExpanded && (
                      <span className="menu-item-text">Dashboard</span>
                    )}
                  </Link>
                </li>
              </ul>
            </div>

            {(puedeVerActivos || puedeVerEmpleados) && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Operación"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                <ul className="flex flex-col gap-4">
                  <li>
                    <Link
                      href="/activos"
                      className={`menu-item group ${
                        pathname.startsWith("/activos")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname.startsWith("/activos")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <BoxIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">Activos</span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/empleados"
                      className={`menu-item group ${
                        pathname.startsWith("/empleados")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname.startsWith("/empleados")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <IdCardIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">Empleados</span>
                      )}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {puedeVerOperaciones && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Operaciones"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                <ul className="flex flex-col gap-4">
                  <li>
                    <Link
                      href="/operaciones"
                      className={`menu-item group ${
                        pathname === "/operaciones" ||
                        pathname.startsWith("/operaciones/nuevo")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname === "/operaciones" ||
                          pathname.startsWith("/operaciones/nuevo")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <ClipboardListIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">Actividades</span>
                      )}
                    </Link>
                  </li>
                  {puedeVerReportes && (
                    <li>
                      <Link
                        href="/operaciones/reportes"
                        className={`menu-item group ${
                          pathname.startsWith("/operaciones/reportes")
                            ? "menu-item-active"
                            : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={
                            pathname.startsWith("/operaciones/reportes")
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }
                        >
                          <ChartBarIcon />
                        </span>
                        {navExpanded && (
                          <span className="menu-item-text">Reportes</span>
                        )}
                      </Link>
                    </li>
                  )}
                  {puedeVerActas && (
                    <li>
                      <Link
                        href="/operaciones/actas"
                        className={`menu-item group ${
                          pathname.startsWith("/operaciones/actas")
                            ? "menu-item-active"
                            : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={
                            pathname.startsWith("/operaciones/actas")
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }
                        >
                          <FileTextIcon />
                        </span>
                        {navExpanded && (
                          <span className="menu-item-text">Actas</span>
                        )}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {puedeVerJornada && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Jornada de Trabajo"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                <ul className="flex flex-col gap-4">
                  <li>
                    <Link
                      href="/jornada/planeacion"
                      className={`menu-item group ${
                        pathname.startsWith("/jornada/planeacion")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname.startsWith("/jornada/planeacion")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <ClockIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">
                          Planeación Semanal
                        </span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/jornada/asistencia"
                      className={`menu-item group ${
                        pathname.startsWith("/jornada/asistencia")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname.startsWith("/jornada/asistencia")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <ClipboardListIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">Asistencia</span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/jornada/nomina"
                      className={`menu-item group ${
                        pathname.startsWith("/jornada/nomina")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname.startsWith("/jornada/nomina")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <ChartBarIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">
                          Resumen de Nómina
                        </span>
                      )}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/jornada/configuracion"
                      className={`menu-item group ${
                        pathname.startsWith("/jornada/configuracion")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname.startsWith("/jornada/configuracion")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <ListIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">
                          Configuración
                        </span>
                      )}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {puedeVerCatalogos && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Administración"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                <ul className="flex flex-col gap-4">
                  <li>
                    <Link
                      href="/catalogos"
                      className={`menu-item group ${
                        pathname.startsWith("/catalogos")
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          pathname.startsWith("/catalogos")
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }
                      >
                        <ListIcon />
                      </span>
                      {navExpanded && (
                        <span className="menu-item-text">Maestro de datos</span>
                      )}
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {(puedeGestionarUsuarios || puedeVerRoles) && (
              <div>
                <h2
                  className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                    !isExpanded && !isHovered
                      ? "lg:justify-center"
                      : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? (
                    "Seguridad"
                  ) : (
                    <HorizontaLDots />
                  )}
                </h2>
                <ul className="flex flex-col gap-4">
                  {puedeGestionarUsuarios && (
                    <li>
                      <Link
                        href="/usuarios"
                        className={`menu-item group ${
                          pathname === "/usuarios"
                            ? "menu-item-active"
                            : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={
                            pathname === "/usuarios"
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }
                        >
                          <GroupIcon />
                        </span>
                        {navExpanded && (
                          <span className="menu-item-text">
                            Gestión de Usuarios
                          </span>
                        )}
                      </Link>
                    </li>
                  )}
                  {puedeVerRoles && (
                    <li>
                      <Link
                        href="/usuarios/roles"
                        className={`menu-item group ${
                          pathname.startsWith("/usuarios/roles")
                            ? "menu-item-active"
                            : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={
                            pathname.startsWith("/usuarios/roles")
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }
                        >
                          <LockIcon />
                        </span>
                        {navExpanded && (
                          <span className="menu-item-text">
                            Gestión de Roles
                          </span>
                        )}
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
