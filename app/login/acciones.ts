"use server";

import { redirect } from "next/navigation";
import { clienteAuth, correoPermitido } from "@/lib/auth";

export async function entrar(form: FormData) {
  const correo = String(form.get("correo") ?? "").trim();
  const clave = String(form.get("clave") ?? "");
  const siguiente = String(form.get("siguiente") || "/");
  if (!correoPermitido(correo)) redirect(`/login?error=${encodeURIComponent("Ese correo no tiene acceso.")}`);
  const { error } = await (await clienteAuth()).auth.signInWithPassword({ email: correo, password: clave });
  if (error) redirect(`/login?error=${encodeURIComponent("Correo o contraseña incorrectos.")}`);
  redirect(siguiente.startsWith("/") ? siguiente : "/");
}

export async function salir() {
  await (await clienteAuth()).auth.signOut();
  redirect("/login");
}
