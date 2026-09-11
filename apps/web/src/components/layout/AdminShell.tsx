"use client";
import React from "react";
import { useSidebar } from "@/context/SidebarContext";
import AppSidebar from "@/layout/AppSidebar";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";

interface AdminShellProps {
  userName: string;
  userEmail: string;
  signOut: () => Promise<void>;
  permisos?: string[];
  children: React.ReactNode;
}

const AdminShell: React.FC<AdminShellProps> = ({
  userName,
  userEmail,
  signOut,
  permisos = [],
  children,
}) => {
  const { isExpanded, isMobileOpen, isHovered } = useSidebar();

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar permisos={permisos} />
      <Backdrop />
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader
          userName={userName}
          userEmail={userEmail}
          signOut={signOut}
        />
        <div className="w-full p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminShell;
