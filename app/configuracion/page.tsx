import { leerTienda, PAISES } from "@/lib/tiendas";
import { listarCampanas, diasParaVencer, DIAS_AVISO, type Campana } from "@/lib/meta";
import type { ConexionMeta, Tienda } from "@/lib/types";
import { guardarCampanas, desconectarMeta, guardarTienda, eliminarTienda } from "./acciones";

export const dynamic = "force-dynamic";

const fecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" }) : "—";
const campo = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm";

export default async function Configuracion({ searchParams }: { searchParams: Promise<{ error?: string; conectado?: string; nueva?: string }> }) {
  const sp = await searchParams;
  const { db, tienda, tiendas } = await leerTienda();
  const dias = diasParaVencer(db.meta);

  let campanas: Campana[] = [];
  let errorCampanas: string | null = null;
  if (db.meta && tienda?.cuentasMeta.length) {
    try {
      campanas = await listarCampanas(db.meta, tienda.cuentasMeta);
    } catch (e) {
      errorCampanas = (e as Error).message;
    }
  }
  const asignadaA = (id: string) => db.productos.find((p) => p.campanasMeta?.includes(id))?.id;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Tiendas y conexiones</h1>

      {sp.error && <div className="tarjeta border-red-200 bg-red-50 p-4 text-sm text-red-700">{sp.error}</div>}
      {sp.conectado && <div className="tarjeta border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">¡Meta quedó conectado! Ahora elige las cuentas publicitarias de cada tienda.</div>}

      <MetaTarjeta meta={db.meta} dias={dias} />

      <section className="space-y-3">
        <h2 className="font-semibold">Tus tiendas</h2>
        {tiendas.map((t) => (
          <FormTienda key={t.id} tienda={t} meta={db.meta} abierta={t.id === tienda?.id} />
        ))}
        <details className="tarjeta p-5" open={tiendas.length === 0 || !!sp.nueva}>
          <summary className="cursor-pointer font-medium text-blue-600">+ Agregar tienda</summary>
          <div className="mt-4"><CamposTienda meta={db.meta} /></div>
        </details>
      </section>

      {tienda && (
        <section className="tarjeta space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Campañas por producto · {tienda.nombre}</h2>
            <p className="text-sm text-gray-500">
              Marca qué campañas de Meta corresponden a cada producto. Si un producto no tiene ninguna marcada, se le asignan las campañas cuyo nombre contenga el nombre del producto.
            </p>
          </div>
          {!db.meta && <p className="text-sm text-gray-400">Conecta Meta para ver tus campañas.</p>}
          {db.meta && !tienda.cuentasMeta.length && <p className="text-sm text-gray-400">Elige arriba las cuentas publicitarias de esta tienda.</p>}
          {db.productos.length === 0 && <p className="text-sm text-gray-400">Dale a “Actualizar Dropi y Meta” en Productos para traer los productos de esta tienda.</p>}
          {errorCampanas && <p className="text-sm text-red-600">{errorCampanas}</p>}
          {campanas.length > 0 && db.productos.length > 0 && (
            <form action={guardarCampanas} className="space-y-5">
              <input type="hidden" name="tiendaId" value={tienda.id} />
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
      )}
    </div>
  );
}

function MetaTarjeta({ meta, dias }: { meta?: ConexionMeta; dias: number | null }) {
  return (
    <section className="tarjeta space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Meta Ads · portafolio</h2>
        {meta ? (
          <span className={`rounded-full px-2 py-1 text-xs ${dias !== null && dias <= DIAS_AVISO ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {dias !== null && dias < 0 ? "Vencido" : "Conectado"}
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">Sin conectar</span>
        )}
      </div>
      <p className="text-sm text-gray-600">
        {meta
          ? `${meta.usuario} · ${meta.cuentas.length} cuentas publicitarias · ${dias !== null && dias >= 0 ? `vence en ${dias} días (${fecha(meta.expira)})` : "el permiso venció, vuelve a conectar"}`
          : "Una sola conexión para todas las tiendas: inicia sesión con Facebook y acepta el permiso de solo lectura de anuncios."}
      </p>
      <div className="flex gap-2">
        <a href="/api/meta/login" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {meta ? "Renovar conexión" : "Conectar Meta"}
        </a>
        {meta && (
          <form action={desconectarMeta}>
            <button className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50">Desconectar</button>
          </form>
        )}
      </div>
    </section>
  );
}

function FormTienda({ tienda, meta, abierta }: { tienda: Tienda; meta?: ConexionMeta; abierta: boolean }) {
  const p = PAISES[tienda.pais];
  return (
    <details className="tarjeta p-5" open={abierta}>
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{tienda.nombre} <span className="text-sm font-normal text-gray-500">· {p?.nombre ?? tienda.pais} · {tienda.moneda}</span></span>
        <span className="flex gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 ${tienda.dropiToken || tienda.ultimaActualizacion?.dropi ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            Dropi {tienda.dropiToken || tienda.ultimaActualizacion?.dropi ? "✓" : "sin token"}
          </span>
          <span className={`rounded-full px-2 py-1 ${tienda.cuentasMeta.length ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            Meta {tienda.cuentasMeta.length ? `${tienda.cuentasMeta.length} cuenta(s)` : "sin cuentas"}
          </span>
        </span>
      </summary>
      <p className="mt-2 text-xs text-gray-400">Última actualización de Dropi: {fecha(tienda.ultimaActualizacion?.dropi)}</p>
      <div className="mt-4"><CamposTienda tienda={tienda} meta={meta} /></div>
      <form action={eliminarTienda} className="mt-3 text-right">
        <input type="hidden" name="id" value={tienda.id} />
        <button className="text-xs text-red-500 hover:underline">Eliminar tienda y sus datos guardados</button>
      </form>
    </details>
  );
}

function CamposTienda({ tienda, meta }: { tienda?: Tienda; meta?: ConexionMeta }) {
  return (
    <form action={guardarTienda} className="grid gap-4 md:grid-cols-2">
      {tienda && <input type="hidden" name="id" value={tienda.id} />}
      <label className="space-y-1 text-sm">
        <span className="font-medium">Nombre</span>
        <input name="nombre" required defaultValue={tienda?.nombre} placeholder="Zorvix Colombia" className={campo} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">País</span>
        <select name="pais" defaultValue={tienda?.pais ?? "CO"} className={campo}>
          {Object.entries(PAISES).map(([k, v]) => <option key={k} value={k}>{v.nombre} ({v.moneda})</option>)}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Token de Dropi</span>
        <input name="dropiToken" type="password" autoComplete="off" placeholder={tienda?.dropiToken ? "•••••••• guardado (escribe uno nuevo para cambiarlo)" : "Dropi → Mis integraciones"} className={campo} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Dirección de la API de Dropi <span className="font-normal text-gray-400">(opcional)</span></span>
        <input name="dropiUrl" defaultValue={tienda?.dropiUrl} placeholder="se pone sola según el país" className={campo} />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Tasa de la pauta <span className="font-normal text-gray-400">(si la cuenta paga en otra moneda)</span></span>
        <input name="tasaPauta" type="number" step="any" defaultValue={tienda?.tasaPauta} placeholder="p. ej. 3900 COP por 1 USD" className={campo} />
      </label>
      <fieldset className="space-y-1 text-sm md:col-span-2">
        <legend className="font-medium">Cuentas publicitarias de esta tienda</legend>
        {meta ? (
          <div className="grid gap-1 md:grid-cols-2">
            {meta.cuentas.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input type="checkbox" name="cuentasMeta" value={c.id} defaultChecked={tienda?.cuentasMeta.includes(c.id)} />
                {c.nombre} <span className="text-xs text-gray-400">{c.moneda}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">Conecta Meta arriba para elegirlas.</p>
        )}
      </fieldset>
      <div className="md:col-span-2">
        <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white">{tienda ? "Guardar cambios" : "Crear tienda"}</button>
      </div>
    </form>
  );
}
