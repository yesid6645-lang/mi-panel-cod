import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Publicado: todo el panel (pantallas y API) pide sesión. En tu computador,
// sin las variables de Supabase, no hace nada.
export async function middleware(req: NextRequest) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of lista) res.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  const permitidos = (process.env.CORREOS_PERMITIDOS ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  const correo = data.user?.email?.toLowerCase();
  const autorizado = !!correo && (permitidos.length === 0 || permitidos.includes(correo));

  if (req.nextUrl.pathname.startsWith("/login")) return res;
  if (!autorizado) {
    if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
    const login = new URL("/login", req.url);
    login.searchParams.set("siguiente", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
