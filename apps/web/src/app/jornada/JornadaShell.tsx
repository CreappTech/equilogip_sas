"use client";

import AdminShell from "@/components/layout/AdminShell";

interface JornadaShellProps {
  userName: string;
  userEmail: string;
  signOut: () => Promise<void>;
  permisos: string[];
  children: React.ReactNode;
}

export default function JornadaShell({
  userName,
  userEmail,
  signOut,
  permisos,
  children,
}: JornadaShellProps) {
  return (
    <AdminShell
      userName={userName}
      userEmail={userEmail}
      signOut={signOut}
      permisos={permisos}
    >
      {children}
    </AdminShell>
  );
}
