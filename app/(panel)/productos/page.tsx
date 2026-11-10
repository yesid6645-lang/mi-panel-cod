import Link from "next/link";
import { leerTienda } from "@/lib/tiendas";
import { resumen, colorDevolucion, colorRoi, decision, type Color } from "@/lib/metrics";
import { periodoDesdeParams, mismoTramoMesAnterior, ventana } from "@/lib/periodo";
import { dinero, pct, dec } from "@/lib/formato";
import { Kpi } from "@/components/Kpi";
import { explicar } from "@/lib/explicaciones";
import { SelectorMes } from "@/components/SelectorMes";
import { BotonActualizar } from "@/components/BotonActualizar";

export const dynamic = "force-dynamic";

const TEXTO: Record<Color, string> = {
  excelente: "text-emerald-600",
  bien: "text-blue-600",
  atencion: "text-amber-500",
  malo: "text-red-500",
  sinDatos: "text-gray-400",
};
const PUNTO: Record<Color, string> = {
  excelente: "bg-excelente",
  bien: "bg-bien",
  atencion: "bg-atencion",
  malo: "bg-malo",
  sinDatos: "bg-sindatos",
};
const signo = (x: number): Color => (x > 0 ? "excelente" : x < 0 ? "malo" : "sinDatos");

export default async function Productos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes, periodo } = periodoDesdeParams(await searchParams);
  const { db, tienda } = await leerTienda();
  const total = resumen(db.pedidos, db.pauta, periodo);
  const previo = resumen(db.pedidos, db.pauta, mismoTramoMesAnterior(periodo));

  const filas = db.productos
    .map((p) => {
      const pedidos = db.pedidos.filter((x) => x.productoId === p.id);
      const pauta = db.pauta.filter((x) => x.productoId === p.id);
      const r = resumen(pedidos, pauta, periodo);
      const r7 = resumen(pedidos, pauta, ventana(periodo, 7, 0));
      return { p, r, r7, d: decision(r, r7) };
    })
    .sort((a, b) => b.r.ventas - a.r.ventas);

  const d = total.dias || 1;
  // Gasto de campañas que no se pudieron asignar (sí cuenta en los totales de arriba)
  const sinAsignar = db.pauta
    .filter((x) => x.productoId.endsWith("-sin-asignar") && x.fecha >= periodo.desde && x.fecha <= periodo.hasta)
    .reduce((a, x) => a + x.gasto, 0);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-gray-500">
            {periodo.desde} → {periodo.hasta} · {total.dias} días
          </p>
        </div>
        <SelectorMes mes={mes} base="/productos" />
        <BotonActualizar desde={periodo.desde} hasta={periodo.hasta} tiendaId={tienda?.id} ultima={tienda?.ultimaActualizacion?.dropi && new Date(tienda.ultimaActualizacion.dropi).toLocaleString("es-CO", { timeZone: "America/Guayaquil" })} />
      </header>

      {!tienda && (
        <div className="tarjeta space-y-3 border-blue-200 bg-blue-50 p-6 text-sm text-gray-700">
          <h2 className="text-lg font-semibold text-gray-900">👋 Bienvenido. Empecemos por tu primera tienda</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Crea la tienda con su país y su token de Dropi (Dropi → Mis integraciones).</li>
            <li>Vuelve aquí y dale a <b>Actualizar Dropi y Meta</b>.</li>
            <li>Haz clic en el nombre de un producto para ver su análisis completo.</li>
          </ol>
          <a href="/configuracion?nueva=1" className="inline-block rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Crear mi primera tienda</a>
        </div>
      )}
      {tienda && db.pedidos.length === 0 && (
        <div className="tarjeta border-amber-200 bg-amber-50 p-6 text-sm text-gray-700">
          <b>{tienda.nombre}</b> aún no tiene pedidos cargados. Dale a <b>↻ Actualizar Dropi y Meta</b> (arriba a la derecha) para traerlos.
          Si sale un error, revisa su token en <a href="/configuracion" className="text-blue-600 underline">Tiendas y conexiones</a>.
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi ayuda={explicar("bruta", total)} titulo="Ganancia bruta" valor={dinero(total.bruta)} actual={total.bruta} anterior={previo.bruta} />
        <Kpi ayuda={explicar("esperada", total)} titulo="Ganancia esperada" valor={dinero(total.esperada)} actual={total.esperada} anterior={previo.esperada} />
        <Kpi ayuda={explicar("confirmada", total)} titulo="Ganancia confirmada" valor={dinero(total.confirmada)} actual={total.confirmada} anterior={previo.confirmada} />
        <Kpi ayuda={explicar("ventas", total)} titulo="Número de ventas" valor={String(total.ventas)} actual={total.ventas} anterior={previo.ventas} />
        <Kpi ayuda={explicar("publicidad", total)} titulo="Publicidad" valor={dinero(total.publicidad)} actual={total.publicidad} anterior={previo.publicidad} menorEsMejor />
        <Kpi ayuda={explicar("costoDevoluciones", total)} titulo="Costo devoluciones" valor={dinero(total.costoDevoluciones)} actual={total.costoDevoluciones} anterior={previo.costoDevoluciones} menorEsMejor />
        <Kpi ayuda={explicar("gastosTotales", total)} titulo="Gastos totales" valor={dinero(total.gastosTotales)} actual={total.gastosTotales} anterior={previo.gastosTotales} menorEsMejor />
        <Kpi ayuda={explicar("devoluciones", total)} titulo="Devoluciones" valor={String(total.devoluciones)} actual={total.devoluciones} anterior={previo.devoluciones} menorEsMejor />
      </section>

      <section className="tarjeta overflow-x-auto">
        <table className="w-full min-w-[1100px] whitespace-nowrap text-sm tabular-nums">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
              {["Producto", "Ventas", "Facturación", "Chats", "Publicidad", "Entreg.", "Devol.", "C. dev.", "Bruta", "Esperada", "Confirmada", "% dev.", "CPA 7d / máx.", "Decisión"].map((h) => (
                <th key={h} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ p, r, r7, d: dec_ }) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/productos/${p.id}?mes=${mes}`} className="hover:underline">{p.nombre}</Link>
                </td>
                <td className="px-4 py-3">{r.ventas}</td>
                <td className="px-4 py-3">{dinero(r.ingresos)}</td>
                <td className="px-4 py-3">{r.conversaciones}</td>
                <td className="px-4 py-3">{dinero(r.publicidad)}</td>
                <td className="px-4 py-3 text-emerald-600">{r.entregados}</td>
                <td className="px-4 py-3">{r.devoluciones}</td>
                <td className="px-4 py-3 text-red-500">{dinero(r.costoDevoluciones)}</td>
                <td className="px-4 py-3">{dinero(r.bruta)}</td>
                <td className={`px-4 py-3 font-semibold ${TEXTO[signo(r.esperada)]}`}>{dinero(r.esperada)}</td>
                <td className={`px-4 py-3 font-semibold ${TEXTO[colorRoi(r.roiEntregados)]}`}>{dinero(r.confirmada)}</td>
                <td className={`px-4 py-3 ${TEXTO[colorDevolucion(r.pctDevolucion)]}`}>{pct(r.pctDevolucion)}</td>
                <td className="px-4 py-3" title="CPA de los últimos 7 días frente al máximo que puedes pagar por venta sin perder">
                  <span className={r7.cpa !== null && r.cpaMaximo !== null && r7.cpa > r.cpaMaximo ? "font-semibold text-red-500" : "text-gray-700"}>{dinero(r7.cpa)}</span>
                  <span className="text-gray-400"> / {dinero(r.cpaMaximo)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold">{dec_.decision}</span>
                </td>
              </tr>
            ))}
            {sinAsignar > 0 && (
              <tr className="border-b border-gray-100 bg-amber-50/50 text-amber-700">
                <td className="px-4 py-3" colSpan={4}>
                  Pauta sin asignar a ningún producto · <a href="/configuracion" className="underline">asignar campañas</a>
                </td>
                <td className="px-4 py-3">{dinero(sinAsignar)}</td>
                <td colSpan={9} />
              </tr>
            )}
            <tr className="bg-gray-50 font-medium">
              <td className="px-4 py-3">Promedio diario</td>
              <td className="px-4 py-3">{dec(total.ventas / d)}</td>
              <td className="px-4 py-3">{dinero(total.ingresos / d)}</td>
              <td className="px-4 py-3">{dec(total.conversaciones / d)}</td>
              <td className="px-4 py-3">{dinero(total.publicidad / d)}</td>
              <td className="px-4 py-3">{dec(total.entregados / d)}</td>
              <td className="px-4 py-3">{dec(total.devoluciones / d)}</td>
              <td className="px-4 py-3 text-red-500">{dinero(total.costoDevoluciones / d)}</td>
              <td className="px-4 py-3">{dinero(total.bruta / d)}</td>
              <td className="px-4 py-3">{dinero(total.esperada / d)}</td>
              <td className="px-4 py-3">{dinero(total.confirmada / d)}</td>
              <td className="px-4 py-3">{pct(total.pctDevolucion)}</td>
              <td />
              <td />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="tarjeta flex flex-wrap gap-6 p-4 text-xs text-gray-600">
        {(
          [
            ["excelente", "Excelente", "Muy por encima del objetivo"],
            ["bien", "Bien", "En rango rentable"],
            ["atencion", "Atención", "En el límite, conviene revisar"],
            ["malo", "Malo", "Fuera de rango, requiere acción"],
            ["sinDatos", "Sin datos", "Aún no hay suficiente información"],
          ] as const
        ).map(([c, t, s]) => (
          <div key={c} className="flex items-start gap-2">
            <span className={`mt-1 h-2 w-2 rounded-full ${PUNTO[c]}`} />
            <div>
              <div className="font-semibold text-gray-800">{t}</div>
              {s}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
