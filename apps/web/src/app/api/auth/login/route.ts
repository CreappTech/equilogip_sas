import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { identificador, contraseña } = await request.json();

    if (!identificador || !contraseña) {
      return NextResponse.json(
        { message: "Por favor, completa todos los campos." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const valor = identificador.trim();

    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: valor,
        password: contraseña,
      }
    );

    if (signInError || !data.user) {
      return NextResponse.json(
        { message: "Credenciales inválidas. Por favor, verifica tus datos." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email_login, activo")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile || !profile.activo) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { message: "Credenciales inválidas. Por favor, verifica tus datos." },
        { status: 401 }
      );
    }

    return NextResponse.json({ message: "Inicio de sesión exitoso." });
  } catch {
    return NextResponse.json(
      { message: "Ocurrió un error al iniciar sesión. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
