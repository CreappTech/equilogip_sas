import type { Metadata } from "next";
import { Suspense } from "react";

import SignInForm from "@/components/auth/SignInForm";

import LoginNotice from "./LoginNotice";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu cuenta",
};

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={null}>
        <LoginNotice />
      </Suspense>
      <SignInForm />
    </>
  );
}
