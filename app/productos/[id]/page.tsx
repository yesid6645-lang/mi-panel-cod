import Link from "next/link";
import { notFound } from "next/navigation";
import { leerTienda } from "@/lib/tiendas";
import { resumen, serieDiaria, decision } from "@/lib/metrics";
import { periodoDesdeParams, mismoTramoMesAnterior, ventana } from "@/lib/periodo";
import { ritmoSemanal, composicion, calendarioCpa, estadoActual, diaRecuperado, type ColorDia } from "@/lib/analisis";
import { dinero, pct, veces, dec, nombreMes } from "@/lib/formato";

const nombreDia = (f: string) => `${Number(f.slice(8))} de ${nombreMes(f.slice(0, 7)).split(" ")[0]}`;
import { SelectorMes } from "@/components/SelectorMes";
import { LineaDiaria, MargenPorDolar, Recuperacion, BarrasSimples } from "@/components/Graficas";

export const dynamic = "force-dynamic";

const PESTANAS = [
  ["resumen", "Resumen"],
  ["tendencias", "Tendencias"],
  ["calendario", "Calendario"],
  ["diagrama", "Diagrama"],
] as const;

const COLOR_DIA: Record<ColorDia, [string, string]> = {
  sinMovimiento: ["bg-gray-100 text-gray-400", "Sin movimiento"],
  ganaste: ["bg-emerald-500 text-white", "Ganaste"],
  porPoco: ["bg-amber-500 text-white", "Por poco"],
  equilibrio: ["bg-blue-500 text-white", "Equilibrio"],
  perdiste: ["bg-red-500 text-white", "Perdiste"],
};

const ESTILO_DECISION: Record<string, string> = {
  ESCALAR: "text-blue-600",
  MANTENER: "text-emerald-600",
  OPTIMIZAR: "text-amber-500",
  PAUSAR: "text-red-500",
  "SIN DATOS": "text-gray-400",
};

function Celda({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="p-5">
      <div className="etiqueta">{titulo}</div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{valor}</div>
      {nota && <div className="mt-1 text-xs text-gray-500">{nota}</div>}
    </div>
  );
}

export default async function DetalleProducto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { mes, periodo } = periodoDesdeParams(sp);
  const tab = PESTANAS.some(([k]) => k === sp.tab) ? sp.tab! : "resumen";

  const { db, tienda } = await leerTienda();
  const producto = db.productos.find((p) => p.id === id);
  if (!producto) notFound();
  const pedidos = db.pedidos.filter((p) => p.productoId === id);
  const pauta = db.pauta.filter((p) => p.productoId === id);

  const r = resumen(pedidos, pauta, periodo);
  const previo = resumen(pedidos, pauta, mismoTramoMesAnterior(periodo));
  const d = decision(r);
  const serie = serieDiaria(pedidos, pauta, periodo);
  const ultimos7 = ventana(periodo, 7, 0);
  const anteriores7 = ventana(periodo, 7, 7);
  const s7 = resumen(pedidos, pauta, ultimos7);
  const s7a = resumen(pedidos, pauta, anteriores7);
  const base = `/productos/${id}?mes=${mes}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="tarjeta space-y-4 p-6">
        <Link href={`/productos?mes=${mes}`} className="inline-block rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50">
          ← Volver a mis productos
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{producto.nombre}</h1>
            <p className="text-sm text-gray-500">
              {r.dias} días · {r.diasConVentas} con ventas · {r.ventas} ventas · cifras en {tienda?.moneda}
            </p>
          </div>
          <SelectorMes mes={mes} base={`/productos/${id}`} />
        </div>
        <nav className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 text-sm">
          {PESTANAS.map(([k, label]) => (
            <Link key={k} href={`${base}&tab=${k}`} className={`rounded-lg px-3 py-1.5 ${tab === k ? "bg-white font-medium shadow-sm" : "text-gray-600"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="tarjeta grid gap-4 p-6 md:grid-cols-[200px_1fr]">
        <div>
          <div className="etiqueta">Recomendación</div>
          <div className={`text-xl font-bold ${ESTILO_DECISION[d.decision]}`}>{d.decision}</div>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-gray-700">{d.motivo}</p>
          <div className="rounded-xl bg-blue-50 p-3">
            <div className="text-[11px] font-semibold uppercase text-blue-600">Siguiente paso</div>
            {d.siguientePaso}
          </div>
        </div>
      </section>

      {tab === "resumen" && <Resumen pedidos={pedidos} pauta={pauta} periodo={periodo} r={r} previo={previo} />}

      {tab === "tendencias" && (
        <>
          <section className="tarjeta space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">Cómo se movieron tus ventas</h2>
                <p className="text-xs text-gray-500">{r.diasConVentas} de {r.dias} días con ventas</p>
              </div>
              <div className="text-right"><div className="text-2xl font-semibold">{r.ventas}</div><div className="text-xs text-gray-500">ventas en total</div></div>
            </div>
            <Chips items={[["Ventas", s7.ventas, s7a.ventas, false], ["Ganancia", s7.esperada, s7a.esperada, false]]} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Mini titulo="Ganancia" valor={dinero(r.bruta)} clase="text-emerald-600" />
              <Mini titulo="Gasto pub." valor={dinero(r.publicidad)} clase="text-red-500" />
              <Mini titulo="Profit neto" valor={dinero(r.esperada)} clase={r.esperada >= 0 ? "text-emerald-600" : "text-red-500"} />
              <Mini titulo="Devoluciones" valor={String(r.devoluciones)} clase="text-red-500" />
            </div>
            <LineaDiaria datos={serie} campo="ventas" color="#3b82f6" promedio={r.ventas / (r.dias || 1)} />
          </section>

          <section className="tarjeta space-y-4 p-6">
            <h2 className="font-semibold">Cómo se movieron tus devoluciones</h2>
            <Chips items={[["Devoluciones", s7.devoluciones, s7a.devoluciones, true]]} />
            <div className="grid grid-cols-3 gap-3">
              <Mini titulo="Promedio diario" valor={dec(r.devoluciones / (r.dias || 1))} />
              <Mini titulo="Días afectados" valor={`${serie.filter((s) => s.devoluciones > 0).length}/${r.dias}`} />
              <Mini titulo="Pico del período" valor={(() => { const p = serie.reduce((a, b) => (b.devoluciones > a.devoluciones ? b : a), serie[0]); return p ? `${p.devoluciones} · ${Number(p.fecha.slice(8))}` : "—"; })()} />
            </div>
            <LineaDiaria datos={serie} campo="devoluciones" color="#ef4444" promedio={r.devoluciones / (r.dias || 1)} />
          </section>

          <section className="tarjeta space-y-4 p-6">
            <div className="etiqueta">Margen por peso invertido en ads</div>
            <h2 className="text-lg font-semibold">
              Por cada $1 en publicidad, el margen entregado cubre{" "}
              <span className="text-amber-500">${dec(r.roiEntregados === null ? null : 1 + r.roiEntregados, 2)}</span>
              <span className="font-normal text-gray-500"> — te quedan ${dec(r.roiEntregados, 2)} limpios.</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Mini titulo="Días con profit (pasan el $1)" valor={`${serie.filter((s) => (s.margenPorDolar ?? 0) > 1).length} de ${serie.filter((s) => s.publicidad > 0).length} días`} clase="text-emerald-600" />
              <Mini titulo="Mejor · peor día" valor={(() => { const v = serie.map((s) => s.margenPorDolar).filter((x): x is number => x !== null); return v.length ? `$${Math.max(...v).toFixed(2)} · $${Math.min(...v).toFixed(2)}` : "—"; })()} />
            </div>
            <MargenPorDolar datos={serie} />
            <p className="text-center text-xs text-gray-500">Cada barra es un día: margen entregado menos devoluciones y fees ÷ pauta del día. Lo que sobresale del $1 es ganancia operativa.</p>
          </section>

          <RecuperacionSeccion pedidos={pedidos} pauta={pauta} periodo={periodo} serie={serie} publicidad={r.publicidad} />
        </>
      )}

      {tab === "calendario" && <Calendario dias={calendarioCpa(pedidos, pauta, periodo)} cpa={r.cpa} />}

      {tab === "diagrama" && <Diagrama e={estadoActual(pedidos, periodo)} r={r} />}
    </div>
  );
}

function Mini({ titulo, valor, clase = "" }: { titulo: string; valor: string; clase?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-center">
      <div className="text-xs text-gray-500">{titulo}</div>
      <div className={`font-semibold tabular-nums ${clase}`}>{valor}</div>
    </div>
  );
}

function Chips({ items }: { items: [string, number, number, boolean][] }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {items.map(([t, a, b, menorEsMejor]) => {
        const v = b === 0 ? null : (a - b) / Math.abs(b);
        const bueno = v !== null && (menorEsMejor ? v <= 0 : v >= 0);
        return (
          <span key={t} className={`rounded-md px-2 py-1 ${v === null ? "bg-gray-100 text-gray-500" : bueno ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {t} {v === null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`} <span className="opacity-60">7d vs 7d</span>
          </span>
        );
      })}
    </div>
  );
}

function Resumen({ pedidos, pauta, periodo, r, previo }: { pedidos: Parameters<typeof resumen>[0]; pauta: Parameters<typeof resumen>[1]; periodo: Parameters<typeof resumen>[2]; r: ReturnType<typeof resumen>; previo: ReturnType<typeof resumen> }) {
  const ritmo = ritmoSemanal(pedidos, pauta, periodo);
  const c = composicion(pedidos, periodo);
  const frase =
    r.roiEntregados === null
      ? "Aún no hay pauta registrada en este período."
      : r.roiEntregados < 0
        ? `Pierde: por cada $1 de publicidad pierdes $${Math.abs(r.roiEntregados).toFixed(2)}.`
        : r.roiEntregados < 0.5
          ? `Gana por poco: por cada $1 de publicidad te quedan $${r.roiEntregados.toFixed(2)} limpios — cualquier subida de costos lo voltea.`
          : `Gana bien: por cada $1 de publicidad te quedan $${r.roiEntregados.toFixed(2)} limpios.`;
  return (
    <>
      <section className="tarjeta space-y-5 p-6">
        <div className="etiqueta">Resultado del período</div>
        <h2 className="text-xl font-semibold">{frase}</h2>
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="rounded-2xl bg-gray-50 p-5">
            <div className="etiqueta">Ganancia confirmada</div>
            <div className={`mt-2 text-3xl font-bold ${r.confirmada >= 0 ? "text-emerald-600" : "text-red-500"}`}>{dinero(r.confirmada)}</div>
            <p className="mt-2 text-sm text-gray-600">Margen de pedidos entregados, después de pauta, devoluciones y fees. No equivale a caja conciliada.</p>
            <div className="mt-3 flex justify-between border-t border-gray-200 pt-3 text-sm">
              <span className="text-gray-500">Si todo lo despachado entrega</span>
              <span className="font-semibold">{dinero(r.esperada)}</span>
            </div>
          </div>
          <Celda titulo="ROI de entregados" valor={veces(r.roiEntregados)} nota="margen neto entregado ÷ pauta · equilibrio 0x" />
          <Celda titulo="ROAS de ingresos" valor={veces(r.roas)} nota={`equilibrio ${veces(r.roasEquilibrio)}`} />
          <Celda titulo="Sin devolver" valor={String(r.sinDevolver)} nota={`de ${r.ventas} ventas (${pct(r.ventas ? r.sinDevolver / r.ventas : null)})`} />
        </div>
      </section>

      <section className="tarjeta p-6">
        <h2 className="font-semibold">Métricas clave</h2>
        <div className="grid divide-gray-100 sm:grid-cols-2 lg:grid-cols-3 [&>*]:border-b [&>*]:border-gray-100">
          <Celda titulo="Ventas" valor={String(r.ventas)} nota={`${dec(r.ventas / (r.dias || 1))} por día`} />
          <Celda titulo="Ganancia estimada" valor={dinero(r.bruta)} nota="antes de pauta y operación" />
          <Celda titulo="Costo por venta" valor={dinero(r.cpa)} nota="CPA promedio" />
          <Celda titulo="Conversión" valor={pct(r.conversion)} nota={`${r.conversaciones} chats`} />
          <Celda titulo="Devoluciones" valor={pct(r.pctDevolucion)} nota={`${r.devoluciones} devoluciones / ${r.ventas} ventas`} />
          <Celda titulo="Eficiencia de pauta" valor={pct(r.eficienciaPauta)} nota="ganancia limpia sobre pauta" />
          <Celda titulo="Ganancia bruta por venta" valor={dinero(r.brutaPorVenta)} nota="antes de pauta y operación" />
          <Celda titulo="Costo por chat" valor={dinero(r.costoChat)} />
          <Celda titulo="Costo por venta exitosa" valor={dinero(r.cpaExitosa)} nota="excluye devoluciones" />
          <Celda titulo="Pauta" valor={dinero(r.publicidad)} nota="inversión del período" />
          <Celda titulo="Días con ventas" valor={`${r.diasConVentas}/${r.dias}`} nota={pct(r.dias ? r.diasConVentas / r.dias : null) + " del período"} />
          <Celda titulo="Vs mes anterior" valor={pct(previo.ventas ? (r.ventas - previo.ventas) / previo.ventas : null)} nota="variación en ventas" />
        </div>
      </section>

      <section className="tarjeta space-y-4 p-6">
        <div className="etiqueta">El ritmo de tu semana</div>
        <h2 className="text-lg font-semibold">
          Tu día más fuerte es el <span className="text-blue-600">{ritmo.masFuerte.nombre}</span> — {dec(ritmo.masFuerte.promedio)} ventas en promedio.
        </h2>
        <BarrasSimples datos={ritmo.porDia.map((x) => ({ nombre: x.nombre, valor: x.promedio, destacado: x === ritmo.masFuerte }))} />
        <div className="grid gap-3 md:grid-cols-2">
          {ritmo.mejor && <Mini titulo="Tu mejor día del período" valor={`${ritmo.mejor.etiqueta} · ${ritmo.mejor.ventas} ventas · ${dinero(ritmo.mejor.bruta)}`} />}
          {ritmo.rentable && <Mini titulo="Tu día más rentable" valor={`${ritmo.rentable.etiqueta} · ${ritmo.rentable.ventas} ventas · ${dinero(ritmo.rentable.esperada)}`} />}
        </div>
      </section>

      <section className="tarjeta space-y-5 p-6">
        <div className="etiqueta">Pedidos y composición</div>
        <h2 className="text-lg font-semibold">Qué venden y qué se devuelve</h2>
        {c.finalizados > 0 && (
          <p className="text-sm">
            De cada 10 pedidos terminados, <b className="text-emerald-600">{dec((c.entregados / c.finalizados) * 10)}</b> llegan al cliente y{" "}
            <b className="text-red-500">{dec((c.devueltos / c.finalizados) * 10)}</b> se devuelven. <span className="text-gray-400">({c.finalizados} terminados)</span>
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Celda titulo="Ticket promedio" valor={dinero(c.ticket)} nota="pago promedio cliente" />
          <Celda titulo="Costo unitario" valor={dinero(c.costoUnitario)} />
          <Celda titulo="Unidades / orden" valor={dec(c.unidadesPorOrden, 2)} />
          <Celda titulo="Tasa de upsell" valor={pct(c.tasaUpsell)} nota="pedidos con +1 unidad" />
          <Celda titulo="Ticket 1 unidad" valor={dinero(c.ticketUno)} />
          <Celda titulo="Ticket con upsell" valor={dinero(c.ticketUpsell)} />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium">Combos y variantes</div>
          <div className="grid gap-3 md:grid-cols-2">
            {c.variantes.map((v) => {
              const fin = v.ok + v.dev;
              return (
                <div key={v.nombre} className="rounded-xl border border-gray-100 p-3 text-sm">
                  <div className="flex justify-between"><span className="font-medium">{v.nombre}</span><span className="text-gray-500">{v.ventas} ventas · {dinero(v.precio)}</span></div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="bg-emerald-500" style={{ width: `${(v.ok / (v.ventas || 1)) * 100}%` }} />
                    <div className="bg-red-400" style={{ width: `${(v.dev / (v.ventas || 1)) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-emerald-600">{v.ok} ok {fin ? `(${Math.round((v.ok / fin) * 100)}%)` : ""}</span>
                    {v.dev > 0 && <span className="text-red-500">{v.dev} dev. ({Math.round((v.dev / fin) * 100)}%)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="tarjeta space-y-4 p-6">
        <div className="etiqueta">El viaje del cliente</div>
        <h2 className="text-lg font-semibold">
          De cada 100 chats, {r.conversaciones ? Math.round((r.entregados / r.conversaciones) * 100) : "—"} terminan en una venta entregada.
        </h2>
        {[
          ["Chatearon", r.conversaciones, "conversaciones", "bg-blue-500", 1],
          ["Compraron", r.ventas, `${pct(r.conversion)} de los chats`, "bg-violet-500", r.conversaciones ? r.ventas / r.conversaciones : 0],
          ["Entregados", r.entregados, `${pct(r.ventas ? r.entregados / r.ventas : null)} de las ventas`, "bg-emerald-500", r.conversaciones ? r.entregados / r.conversaciones : 0],
          ["Aún en camino u oficina", r.enTransito + r.enOficina, "pueden llegar o devolverse", "bg-gray-300", r.conversaciones ? (r.enTransito + r.enOficina) / r.conversaciones : 0],
        ].map(([t, n, s, color, w]) => (
          <div key={t as string} className="flex items-center gap-4">
            <div className="w-1/2">
              <div className={`h-9 rounded-lg ${color}`} style={{ width: `${Math.max(4, Math.sqrt(w as number) * 100)}%` }} />
            </div>
            <div><span className="text-lg font-semibold">{n}</span> <span className="font-medium">{t}</span><div className="text-xs text-gray-500">{s}</div></div>
          </div>
        ))}
      </section>
    </>
  );
}

function RecuperacionSeccion({ pedidos, pauta, periodo, serie, publicidad }: { pedidos: Parameters<typeof resumen>[0]; pauta: Parameters<typeof resumen>[1]; periodo: Parameters<typeof resumen>[2]; serie: ReturnType<typeof serieDiaria>; publicidad: number }) {
  const rec = diaRecuperado(pedidos, pauta, periodo);
  return (
    <section className="tarjeta space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="etiqueta">Recuperación de la inversión</div>
          <h2 className="text-lg font-semibold">
            {rec.dia ? (
              <>Recuperaste lo invertido el <span className="text-emerald-600">{nombreDia(rec.dia)}</span> y vas <span className="text-emerald-600">{dinero(rec.acumulado)}</span>.</>
            ) : (
              <>Aún no recuperas lo invertido: vas <span className="text-red-500">{dinero(rec.acumulado)}</span>.</>
            )}
          </h2>
          <p className="text-xs text-gray-500">Ganancia operativa acumulada (margen entregado − pauta − devoluciones − fees) frente a $0.</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-3 text-right">
          <div className="etiqueta">ROI neto</div>
          <div className="text-2xl font-bold text-amber-500">{veces(rec.roi)}</div>
          <div className="text-xs text-gray-500">Meta 1,0x{rec.roi !== null && rec.roi < 1 ? ` · faltan ${(1 - rec.roi).toFixed(2)}x` : ""}</div>
        </div>
      </div>
      <Recuperacion datos={serie} meta={publicidad} />
    </section>
  );
}

function Calendario({ dias, cpa }: { dias: ReturnType<typeof calendarioCpa>; cpa: number | null }) {
  const vacios = dias.length ? dias[0].diaSemana : 0;
  const cuenta = (c: ColorDia) => dias.filter((d) => d.color === c).length;
  return (
    <section className="tarjeta space-y-4 p-6">
      <div className="flex justify-between">
        <h2 className="font-semibold">Tu costo por venta, día a día</h2>
        <div className="text-right"><div className="text-xl font-semibold">{dinero(cpa)}</div><div className="text-xs text-gray-500">CPA promedio</div></div>
      </div>
      <p className="text-center text-xs text-gray-500">Cada día compara su CPA con el margen que dejaron sus ventas antes de pauta.</p>
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {(Object.keys(COLOR_DIA) as ColorDia[]).map((c) => (
          <span key={c} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${COLOR_DIA[c][0]}`} />{COLOR_DIA[c][1]} ({cuenta(c)})</span>
        ))}
      </div>
      <div className="mx-auto grid max-w-2xl grid-cols-7 gap-1.5 text-center text-xs sm:gap-2">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => <div key={d} className="text-gray-400">{d}</div>)}
        {Array.from({ length: vacios }, (_, i) => <div key={"v" + i} />)}
        {dias.map((d) => (
          <div key={d.fecha} title={d.cpa !== null ? `CPA ${dinero(d.cpa)}` : ""} className={`grid aspect-square place-content-center rounded-lg ${COLOR_DIA[d.color][0]}`}>
            <div className="text-sm font-semibold">{Number(d.fecha.slice(8))}</div>
            <div className="text-[10px] opacity-80">{d.ventas}v</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Diagrama({ e, r }: { e: ReturnType<typeof estadoActual>; r: ReturnType<typeof resumen> }) {
  const t = e.total || 1;
  const grupos = [
    ["Entregados", e.entregados, "bg-emerald-500", "Ya llegaron al cliente."],
    ["En tránsito", e.transito, "bg-blue-500", "En ruta con la transportadora o por despachar."],
    ["En oficina", e.oficina, "bg-amber-500", "En oficina de destino, esperando que el cliente reclame."],
    ["Devoluciones", e.devoluciones, "bg-red-500", "Devueltos al remitente."],
  ] as const;
  return (
    <>
      <section className="tarjeta space-y-4 p-6">
        <h2 className="font-semibold">Dónde están hoy tus pedidos</h2>
        <p className="text-xs text-gray-500">Estado actual de los {e.total} pedidos creados en el período.</p>
        <div className="grid grid-cols-3 gap-3">
          <Mini titulo="Tasa de entrega" valor={`${pct(e.entregados / t)} (${e.entregados} de ${e.total})`} clase="text-emerald-600" />
          <Mini titulo="Tasa de devolución" valor={`${pct(e.devoluciones / t)} (${e.devoluciones} de ${e.total})`} clase="text-red-500" />
          <Mini titulo="En camino" valor={`${e.transito + e.oficina} (tránsito + oficina)`} />
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          {grupos.map(([n, v, c]) => <div key={n} className={c} style={{ width: `${(v / t) * 100}%` }} />)}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {grupos.map(([n, v, c, s]) => (
          <div key={n} className="tarjeta p-5">
            <div className="flex justify-between text-sm font-medium"><span>{n}</span><span className="text-gray-500">{pct(v / t)}</span></div>
            <div className="mt-1 text-2xl font-semibold">{v} <span className="text-sm font-normal text-gray-400">de {e.total} pedidos</span></div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100"><div className={`h-1.5 rounded-full ${c}`} style={{ width: `${(v / t) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-gray-500">{s}</p>
          </div>
        ))}
      </section>
      <p className="text-center text-xs text-gray-400">CPA exitosa del período: {dinero(r.cpaExitosa)}</p>
    </>
  );
}
