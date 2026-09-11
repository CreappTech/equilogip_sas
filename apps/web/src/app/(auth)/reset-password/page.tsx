import type { Metadata } from "next";

import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
  description: "Solicita un enlace para restablecer tu contraseña",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
