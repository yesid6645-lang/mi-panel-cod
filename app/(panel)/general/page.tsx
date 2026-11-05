import { leer } from "@/lib/db";
import { vista, PAISES } from "@/lib/tiendas";
import { resumen, type Resumen } from "@/lib/metrics";
import { periodoDesdeParams, mismoTramoMesAnterior } from "@/lib/periodo";
import { dineroEn, pct, veces } from "@/lib/formato";
import { variacion } from "@/lib/metrics";
import { SelectorMes } from "@/components/SelectorMes";
import { elegirTienda } from "@/app/(panel)/configuracion/acciones";
import type { Tienda } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Unidades de la moneda de la tienda por 1 USD (null si no se sabe). */
function tasaUsd(t: Tienda) {
  if (t.moneda === "USD") return 1;
  if (t.tasaUsd) return t.tasaUsd;
  if (t.moneda === "COP") return Number(process.env.COP_PER_USD ?? 3900);
  return null;
}

const CAMPOS = ["ingresos", "facturacionEntregada", "esperada", "confirmada", "publicidad"] as const;

export default async function General({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes, periodo } = periodoDesdeParams(await searchParams);
  const db = await leer();
  const tiendas = db.tiendas.map((t) => {
    const v = vista(db, t.id);
    return {
      t,
      r: resumen(v.pedidos, v.pauta, periodo),
      previo: resumen(v.pedidos, v.pauta, mismoTramoMesAnterior(periodo)),
      tasa: tasaUsd(t),
    };
  });

  // Total del negocio en USD (solo tiendas con tasa conocida)
  const conTasa = tiendas.filter((x) => x.tasa);
  const total = (r: "r" | "previo", campo: (typeof CAMPOS)[number]) => conTasa.reduce((a, x) => a + x[r][campo] / x.tasa!, 0);
  const ventas = tiendas.reduce((a, x) => a + x.r.ventas, 0);
  const devs = tiendas.reduce((a, x) => a + x.r.devoluciones, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="etiqueta">Principal</div>
          <h1 className="text-2xl font-semibold">Vista general</h1>
          <p className="text-sm text-gray-500">Todas las tiendas juntas · totales en dólares</p>
        </div>
        <SelectorMes mes={mes} base="/general" />
      </header>

      <section className="tarjeta grid gap-px overflow-hidden bg-gray-100 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Facturación", dineroEn(total("r", "ingresos"), "USD"), variacion(total("r", "ingresos"), total("previo", "ingresos"))],
          ["Ya cobrado", dineroEn(total("r", "facturacionEntregada"), "USD"), variacion(total("r", "facturacionEntregada"), total("previo", "facturacionEntregada"))],
          ["Ganancia esperada", dineroEn(total("r", "esperada"), "USD"), variacion(total("r", "esperada"), total("previo", "esperada"))],
          ["Ganancia confirmada", dineroEn(total("r", "confirmada"), "USD"), variacion(total("r", "confirmada"), total("previo", "confirmada"))],
          ["Publicidad", dineroEn(total("r", "publicidad"), "USD"), null],
          ["Ventas · devolución", `${ventas} · ${pct(ventas ? devs / ventas : null)}`, null],
        ].map(([t, v, d]) => (
          <div key={t as string} className="bg-white p-5">
            <div className="etiqueta">{t}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{v}</div>
            {typeof d === "number" && (
              <div className={`text-xs ${d >= 0 ? "text-emerald-600" : "text-red-500"}`}>{d >= 0 ? "↑" : "↓"} {pct(Math.abs(d))} vs mes anterior</div>
            )}
          </div>
        ))}
      </section>
      {conTasa.length < tiendas.length && (
        <p className="text-xs text-amber-600">
          Algunas tiendas no entran en el total porque falta su tasa a dólares (Tiendas y conexiones → la tienda → Tasa a dólares).
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tiendas.map(({ t, r, previo }) => (
          <TarjetaTienda key={t.id} t={t} r={r} previo={previo} />
        ))}
        {tiendas.length === 0 && <p className="text-sm text-gray-400">Aún no hay tiendas.</p>}
      </section>
    </div>
  );
}

function TarjetaTienda({ t, r, previo }: { t: Tienda; r: Resumen; previo: Resumen }) {
  const m = t.moneda;
  const v = variacion(r.ingresos, previo.ingresos);
  const fin = r.entregados + r.devoluciones + r.enTransito + r.enOficina || 1;
  return (
    <div className="tarjeta space-y-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{t.nombre}</div>
          <div className="text-xs text-gray-500">{PAISES[t.pais]?.nombre ?? t.pais} · {m}</div>
        </div>
        <form action={elegirTienda}>
          <input type="hidden" name="tienda" value={t.id} />
          <input type="hidden" name="volver" value="/" />
          <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50">Ver tienda →</button>
        </form>
      </div>
      <div>
        <div className="etiqueta">Facturación</div>
        <div className="text-2xl font-semibold tabular-nums">{dineroEn(r.ingresos, m)}</div>
        {v !== null && <div className={`text-xs ${v >= 0 ? "text-emerald-600" : "text-red-500"}`}>{v >= 0 ? "↑" : "↓"} {pct(Math.abs(v))} vs mes anterior</div>}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Dato t="Ganancia esperada" v={dineroEn(r.esperada, m)} c={r.esperada < 0 ? "text-red-500" : ""} />
        <Dato t="Ganancia confirmada" v={dineroEn(r.confirmada, m)} c={r.confirmada < 0 ? "text-red-500" : "text-emerald-600"} />
        <Dato t="Ventas" v={String(r.ventas)} />
        <Dato t="Devolución" v={pct(r.pctDevolucion)} c={(r.pctDevolucion ?? 0) > 0.15 ? "text-red-500" : ""} />
        <Dato t="Publicidad" v={dineroEn(r.publicidad, m)} />
        <Dato t="ROAS · CPA" v={r.publicidad ? `${veces(r.roas)} · ${dineroEn(r.cpa, m)}` : "—"} />
      </dl>
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100" title="entregados · en camino · devueltos">
        <div className="bg-emerald-500" style={{ width: `${(r.entregados / fin) * 100}%` }} />
        <div className="bg-blue-400" style={{ width: `${((r.enTransito + r.enOficina) / fin) * 100}%` }} />
        <div className="bg-red-400" style={{ width: `${(r.devoluciones / fin) * 100}%` }} />
      </div>
    </div>
  );
}

function Dato({ t, v, c = "" }: { t: string; v: string; c?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{t}</dt>
      <dd className={`font-medium tabular-nums ${c}`}>{v}</dd>
    </div>
  );
}
