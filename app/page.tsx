import Link from "next/link";
import { leerTienda } from "@/lib/tiendas";
import { resumen, serieDiaria, decision } from "@/lib/metrics";
import { periodoDesdeParams, mismoTramoMesAnterior } from "@/lib/periodo";
import { estadoActual } from "@/lib/analisis";
import { alertas } from "@/lib/alertas";
import { dinero, pct, veces, simboloMoneda } from "@/lib/formato";
import { Kpi } from "@/components/Kpi";
import { SelectorMes } from "@/components/SelectorMes";
import { BotonActualizar } from "@/components/BotonActualizar";
import { FacturacionDiaria } from "@/components/Graficas";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes, periodo } = periodoDesdeParams(await searchParams);
  const { db, tienda } = await leerTienda();
  const r = resumen(db.pedidos, db.pauta, periodo);
  const previo = resumen(db.pedidos, db.pauta, mismoTramoMesAnterior(periodo));
  const serie = serieDiaria(db.pedidos, db.pauta, periodo);
  const e = estadoActual(db.pedidos, periodo);
  const pendientes = alertas(db.pedidos, db.gestiones).filter((a) => a.bandeja !== "finalizada").length;

  const productos = db.productos.map((p) => {
    const rp = resumen(db.pedidos.filter((x) => x.productoId === p.id), db.pauta.filter((x) => x.productoId === p.id), periodo);
    return { p, r: rp, d: decision(rp) };
  });
  const atencion = productos.filter((x) => x.d.decision === "PAUSAR" || x.d.decision === "OPTIMIZAR");
  const crecer = productos.filter((x) => x.d.decision === "ESCALAR");
  const t = e.total || 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">{tienda ? `${tienda.nombre} · ${tienda.moneda}` : "Crea tu primera tienda para empezar"}</p>
        </div>
        <SelectorMes mes={mes} base="/" />
        <BotonActualizar
          tiendaId={tienda?.id}
          desde={periodo.desde}
          hasta={periodo.hasta}
          ultima={tienda?.ultimaActualizacion?.dropi && new Date(tienda.ultimaActualizacion.dropi).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
        />
      </header>

      {!tienda && (
        <div className="tarjeta border-blue-200 bg-blue-50 p-6 text-sm">
          <a href="/configuracion?nueva=1" className="inline-block rounded-xl bg-blue-600 px-4 py-2 font-medium text-white">Crear mi primera tienda</a>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Facturación" valor={dinero(r.ingresos)} actual={r.ingresos} anterior={previo.ingresos} nota="lo que suman los pedidos del mes" />
        <Kpi titulo="Facturación entregada" valor={dinero(r.facturacionEntregada)} actual={r.facturacionEntregada} anterior={previo.facturacionEntregada} nota="ya cobrado al cliente" />
        <Kpi titulo="Ganancia esperada" valor={dinero(r.esperada)} actual={r.esperada} anterior={previo.esperada} nota="si todo lo despachado se entrega" />
        <Kpi titulo="Ganancia confirmada" valor={dinero(r.confirmada)} actual={r.confirmada} anterior={previo.confirmada} nota="solo entregados, menos pauta y devoluciones" />
        <Kpi titulo="Ganancia bruta" valor={dinero(r.bruta)} actual={r.bruta} anterior={previo.bruta} nota="antes de pauta y devoluciones" />
        <Kpi titulo="Ventas" valor={String(r.ventas)} actual={r.ventas} anterior={previo.ventas} />
        <Kpi titulo="Tasa de devolución" valor={pct(r.pctDevolucion)} actual={r.pctDevolucion ?? 0} anterior={previo.pctDevolucion ?? 0} menorEsMejor />
        <Kpi titulo="Publicidad" valor={dinero(r.publicidad)} nota={r.publicidad ? `ROAS ${veces(r.roas)} · CPA ${dinero(r.cpa)}` : "conecta Meta para ver la pauta"} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="tarjeta p-5">
          <div className="etiqueta">Tendencia</div>
          <h2 className="mb-3 font-semibold">Facturación y ganancia por día</h2>
          <FacturacionDiaria datos={serie} simbolo={simboloMoneda()} />
        </div>
        <div className="tarjeta space-y-4 p-5">
          <div>
            <div className="etiqueta">Pedidos del mes</div>
            <div className="text-3xl font-semibold">{e.total}</div>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="bg-emerald-500" style={{ width: `${(e.entregados / t) * 100}%` }} />
            <div className="bg-blue-500" style={{ width: `${(e.transito / t) * 100}%` }} />
            <div className="bg-amber-500" style={{ width: `${(e.oficina / t) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(e.devoluciones / t) * 100}%` }} />
          </div>
          <ul className="space-y-2 text-sm">
            {[
              ["bg-emerald-500", "Entregados", e.entregados],
              ["bg-blue-500", "En camino", e.transito],
              ["bg-amber-500", "En oficina", e.oficina],
              ["bg-red-500", "Devueltos", e.devoluciones],
            ].map(([c, n, v]) => (
              <li key={n as string} className="flex justify-between">
                <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${c}`} />{n}</span>
                <b>{v}</b>
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            Por cobrar: <b>{dinero(r.facturacionEnCamino)}</b>
            <div className="text-xs text-gray-500">facturación de pedidos que siguen en camino u oficina</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Lista titulo="Productos que requieren atención" vacio="✓ Todo bajo control" items={atencion.map(({ p, r: rp, d }) => ({ href: `/productos/${p.id}?mes=${mes}`, nombre: p.nombre, texto: d.motivo, etiqueta: d.decision, color: "bg-red-50 text-red-600", extra: `${pct(rp.pctDevolucion)} dev.` }))} />
        <Lista titulo="Productos listos para crecer" vacio="Aún no hay productos para escalar" items={crecer.map(({ p, r: rp }) => ({ href: `/productos/${p.id}?mes=${mes}`, nombre: p.nombre, texto: `${rp.ventas} ventas y ${dinero(rp.esperada)} de ganancia esperada`, etiqueta: "RENTABLE", color: "bg-emerald-50 text-emerald-700", extra: `${pct(rp.pctDevolucion)} dev.` }))} />
        <div className="tarjeta space-y-3 p-5">
          <div className="etiqueta">Logística</div>
          <h2 className="font-semibold">Pedidos por atender</h2>
          <div className={`text-3xl font-semibold ${pendientes ? "text-amber-600" : "text-emerald-600"}`}>{pendientes}</div>
          <p className="text-sm text-gray-500">en agencia, con novedad, estancados o sin despachar</p>
          <Link href="/logistica" className="inline-block rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50">Ir a Gestión logística →</Link>
        </div>
      </section>
    </div>
  );
}

function Lista({ titulo, vacio, items }: { titulo: string; vacio: string; items: { href: string; nombre: string; texto: string; etiqueta: string; color: string; extra: string }[] }) {
  return (
    <div className="tarjeta space-y-3 p-5">
      <h2 className="font-semibold">{titulo}</h2>
      {items.length === 0 && <p className="py-6 text-center text-sm text-gray-400">{vacio}</p>}
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="block rounded-xl border border-gray-100 p-3 hover:bg-gray-50">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{i.nombre}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${i.color}`}>{i.etiqueta}</span>
          </div>
          <p className="text-xs text-gray-500">{i.texto} · {i.extra}</p>
        </Link>
      ))}
    </div>
  );
}
