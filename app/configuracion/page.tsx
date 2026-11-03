import { leer } from "@/lib/db";
import { listarCampanas, diasParaVencer, DIAS_AVISO, type Campana } from "@/lib/meta";
import { guardarCampanas, desconectarMeta } from "./acciones";

export const dynamic = "force-dynamic";

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Guayaquil", dateStyle: "medium", timeStyle: "short" }) : "—";

export default async function Configuracion({ searchParams }: { searchParams: Promise<{ error?: string; conectado?: string }> }) {
  const sp = await searchParams;
  const db = await leer();
  const dias = diasParaVencer(db.meta);

  let campanas: Campana[] = [];
  let errorCampanas: string | null = null;
  if (db.meta) {
    try {
      campanas = await listarCampanas(db.meta);
    } catch (e) {
      errorCampanas = (e as Error).message;
    }
  }
  const asignadaA = (id: string) => db.productos.find((p) => p.campanasMeta?.includes(id))?.id;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Productos y conexiones</h1>

      {sp.error && <div className="tarjeta border-red-200 bg-red-50 p-4 text-sm text-red-700">{sp.error}</div>}
      {sp.conectado && <div className="tarjeta border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">¡Meta quedó conectado! Ahora asigna las campañas a cada producto.</div>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="tarjeta space-y-2 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Dropi</h2>
            <span className={`rounded-full px-2 py-1 text-xs ${db.ultimaActualizacion?.dropi ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              {db.ultimaActualizacion?.dropi ? "Conectado" : "Sin datos"}
            </span>
          </div>
          <p className="text-sm text-gray-600">{db.pedidos.length} pedidos guardados · última actualización {fecha(db.ultimaActualizacion?.dropi)}</p>
          <p className="text-xs text-gray-400">Se conecta con el token de Dropi → Mis integraciones (DROPI_TOKEN).</p>
        </div>

        <div className="tarjeta space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Meta Ads</h2>
            {db.meta ? (
              <span className={`rounded-full px-2 py-1 text-xs ${dias !== null && dias <= DIAS_AVISO ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                {dias !== null && dias < 0 ? "Vencido" : "Conectado"}
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Sin conectar</span>
            )}
          </div>
          {db.meta ? (
            <>
              <p className="text-sm text-gray-600">
                {db.meta.usuario} · {db.meta.cuentas.length} cuentas publicitarias
                <br />
                {dias !== null && dias >= 0 ? `Vence en ${dias} días (${fecha(db.meta.expira)})` : "El permiso venció: vuelve a conectar."}
              </p>
              <ul className="text-xs text-gray-500">
                {db.meta.cuentas.map((c) => <li key={c.id}>{c.nombre} · {c.moneda}</li>)}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-600">Inicia sesión con Facebook y acepta el permiso de solo lectura de anuncios.</p>
          )}
          <div className="flex gap-2">
            <a href="/api/meta/login" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {db.meta ? "Renovar conexión" : "Conectar Meta"}
            </a>
            {db.meta && (
              <form action={desconectarMeta}>
                <button className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Desconectar</button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="tarjeta space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Campañas por producto</h2>
          <p className="text-sm text-gray-500">
            Marca qué campañas de Meta corresponden a cada producto. Si un producto no tiene ninguna marcada, se le asignan las campañas cuyo nombre contenga el nombre del producto.
          </p>
        </div>
        {!db.meta && <p className="text-sm text-gray-400">Conecta Meta para ver tus campañas.</p>}
        {errorCampanas && <p className="text-sm text-red-600">{errorCampanas}</p>}
        {db.meta && !errorCampanas && (
          <form action={guardarCampanas} className="space-y-5">
            {db.productos.map((p) => (
              <fieldset key={p.id} className="rounded-xl border border-gray-200 p-4">
                <legend className="px-1 font-medium">{p.nombre}</legend>
                <div className="grid gap-1 md:grid-cols-2">
                  {campanas.map((c) => {
                    const otra = asignadaA(c.id);
                    return (
                      <label key={c.id} className={`flex items-start gap-2 text-sm ${otra && otra !== p.id ? "opacity-40" : ""}`}>
                        <input type="checkbox" name={`campanas:${p.id}`} value={c.id} defaultChecked={p.campanasMeta?.includes(c.id)} className="mt-1" />
                        <span>
                          {c.nombre}
                          <span className="block text-xs text-gray-400">{c.cuenta} · {c.estado === "ACTIVE" ? "activa" : "pausada"}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white">Guardar asignación</button>
            <p className="text-xs text-gray-400">Después dale a “Actualizar Dropi y Meta” para recalcular la pauta con esta asignación.</p>
          </form>
        )}
      </section>
    </div>
  );
}
