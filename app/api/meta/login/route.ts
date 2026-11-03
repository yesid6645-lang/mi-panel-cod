import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { urlLogin } from "@/lib/meta";

// Botón "Conectar Meta": manda a Facebook a pedir permiso de solo lectura (ads_read).
export async function GET() {
  const state = randomBytes(16).toString("hex");
  try {
    const res = NextResponse.redirect(urlLogin(state));
    res.cookies.set("meta_state", state, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
    return res;
  } catch (e) {
    return NextResponse.redirect(new URL(`/configuracion?error=${encodeURIComponent((e as Error).message)}`, process.env.APP_URL ?? "http://localhost:3000"));
  }
}
