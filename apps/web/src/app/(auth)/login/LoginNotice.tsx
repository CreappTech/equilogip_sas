"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Alert from "@/components/ui/alert/Alert";

export default function LoginNotice() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const expired = searchParams.get("expired") === "1";

  useEffect(() => {
    if (expired) {
      router.replace("/login");
    }
  }, [expired, router]);

  if (!expired) {
    return null;
  }

  return (
    <Alert
      variant="warning"
      title="Tu sesión expiró"
      message="Inicia sesión nuevamente para continuar."
    />
  );
}