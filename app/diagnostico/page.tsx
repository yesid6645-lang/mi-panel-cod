import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Revisa la configuración del panel publicado sin mostrar ninguna clave:
// solo si cada variable existe, qué tipo de clave parece y si Supabase responde.

const tipoClave = (v?: string) =>
  !v ? "falta" : v.startsWith("sb_secret_") ? "secret (nueva)" : v.startsWith("sb_publishable_") ? "publishable (nueva)" : v.startsWith("eyJ") ? "legacy (eyJ…)" : "formato desconocido";

const rolJwt = (v?: string) => {
  try {
    return v?.startsWith("eyJ") ? JSON.parse(Buffer.from(v.split(".")[1], "base64").toString()).role : null;
  } catch {
    return null;
  }
};

export default async function Diagnostico() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const filas: [string, string, boolean][] = [];

  let host = "falta";
  try {
    host = url ? new URL(url).host : "falta";
  } catch {
    host = "no es una dirección válida";
  }
  filas.push(["SUPABASE_URL", host, !!url && host.endsWith(".supabase.co") && !url.includes("/rest")]);
  filas.push(["SUPABASE_ANON_KEY", `${tipoClave(anon)}${rolJwt(anon) ? ` · rol ${rolJwt(anon)}` : ""}`, !!anon && rolJwt(anon) !== "service_role" && !anon.startsWith("sb_secret_")]);
  filas.push(["SUPABASE_SERVICE_ROLE_KEY", `${tipoClave(servicio)}${rolJwt(servicio) ? ` · rol ${rolJwt(servicio)}` : ""}`, !!servicio && (rolJwt(servicio) === "service_role" || servicio.startsWith("sb_secret_"))]);
  filas.push(["CORREOS_PERMITIDOS", process.env.CORREOS_PERMITIDOS ? `${process.env.CORREOS_PERMITIDOS.split(",").length} correo(s)` : "vacío (entra cualquier usuario de Supabase)", true]);
  filas.push(["APP_URL", process.env.APP_URL ?? "falta (necesaria para Meta)", !!process.env.APP_URL]);

  let prueba = "no se probó (faltan variables)";
  let pruebaOk = false;
  if (url && servicio) {
    try {
      const { error } = await createClient(url.replace(/\/$/, ""), servicio, { auth: { persistSession: false } }).from("tiendas").select("id").limit(1);
      prueba = error ? `error: ${error.message}` : "conectó y leyó la tabla tiendas ✓";
      pruebaOk = !error;
    } catch (e) {
      prueba = `error: ${(e as Error).message}`;
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Diagnóstico de CRM Service</h1>
      <div className="tarjeta divide-y divide-gray-100">
        {filas.map(([n, v, ok]) => (
          <div key={n} className="flex items-center justify-between gap-4 p-4 text-sm">
            <code className="font-medium">{n}</code>
            <span className={ok ? "text-emerald-600" : "text-red-600"}>{ok ? "✓" : "✗"} {v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 p-4 text-sm">
          <span className="font-medium">Prueba con Supabase</span>
          <span className={pruebaOk ? "text-emerald-600" : "text-red-600"}>{prueba}</span>
        </div>
      </div>
      <p className="text-xs text-gray-400">Esta página no muestra ninguna clave, solo si están puestas y si funcionan.</p>
    </div>
  );
}
