import type { Metadata } from "next";
import { Suspense } from "react";

import ResetPasswordConfirmForm from "./ResetPasswordConfirmForm";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  description: "Establece tu nueva contraseña",
};

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
          Cargando...
        </div>
      }
    >
      <ResetPasswordConfirmForm />
    </Suspense>
  );
}
