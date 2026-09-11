import type { Metadata } from "next";

import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu cuenta",
};

export default function LoginPage() {
  return <SignInForm />;
}
