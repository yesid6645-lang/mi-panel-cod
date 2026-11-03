import { NextResponse, type NextRequest } from "next/server";
import { conectar, appUrl } from "@/lib/meta";
import { leer, guardar } from "@/lib/db";

// Facebook vuelve aquí después de que aceptas el permiso.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const volver = (q: string) => NextResponse.redirect(`${appUrl()}/configuracion?${q}`);

  if (p.get("error")) return volver(`error=${encodeURIComponent(p.get("error_description") ?? "Cancelaste el permiso en Facebook.")}`);
  if (!p.get("state") || p.get("state") !== req.cookies.get("meta_state")?.value)
    return volver(`error=${encodeURIComponent("El inicio de sesión expiró; inténtalo de nuevo.")}`);

  try {
    const db = await leer();
    db.meta = await conectar(p.get("code")!);
    await guardar(db);
    const res = volver("conectado=1");
    res.cookies.delete("meta_state");
    return res;
  } catch (e) {
    return volver(`error=${encodeURIComponent((e as Error).message)}`);
  }
}
