import type { Pedido, PautaDia, Periodo } from "./types";

// Fórmulas verificadas contra WinTrack con los números de Belani (oct 2026).
// Ver ESPECIFICACION.md.

export const gananciaPedido = (p: Pedido) => p.total - p.costoProducto - p.flete - (p.otrosCostos ?? 0);

const dia = (iso: string) => iso.slice(0, 10);
const enPeriodo = (fecha: string, per: Periodo) => fecha >= per.desde && fecha <= per.hasta;
const div = (a: number, b: number) => (b === 0 ? null : a / b);
const suma = <T>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

export function diasDelPeriodo(per: Periodo): string[] {
  const out: string[] = [];
  const d = new Date(per.desde + "T00:00:00Z");
  const fin = new Date(per.hasta + "T00:00:00Z");
  while (d <= fin) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Ventas del período: pedidos creados en el período, sin cancelados. */
export function ventasDelPeriodo(pedidos: Pedido[], per: Periodo) {
  return pedidos.filter((p) => p.grupo !== "cancelado" && enPeriodo(dia(p.creadoEn), per));
}

export interface Resumen {
  ventas: number;
  ingresos: number; // facturación: lo que suman los pedidos del período
  facturacionEntregada: number; // lo que ya se cobró (pedidos entregados)
  facturacionEnCamino: number; // lo que aún puede cobrarse (tránsito, oficina, por despachar)
  bruta: number;
  publicidad: number;
  conversaciones: number;
  entregados: number;
  margenEntregado: number;
  devoluciones: number;
  costoDevoluciones: number;
  fees: number;
  enTransito: number;
  enOficina: number;
  esperada: number;
  confirmada: number;
  gastosTotales: number;
  pctDevolucion: number | null;
  roas: number | null;
  roasEquilibrio: number | null;
  roiEntregados: number | null;
  cpa: number | null;
  cpaMaximo: number | null; // lo máximo que puedes pagar por venta sin perder: (bruta − devoluciones) ÷ ventas
  cpaExitosa: number | null;
  conversion: number | null;
  costoChat: number | null;
  eficienciaPauta: number | null;
  brutaPorVenta: number | null;
  sinDevolver: number;
  diasConVentas: number;
  dias: number;
}

export function resumen(pedidos: Pedido[], pauta: PautaDia[], per: Periodo): Resumen {
  const v = ventasDelPeriodo(pedidos, per);
  const pautaPer = pauta.filter((x) => enPeriodo(x.fecha, per));
  const entregados = v.filter((p) => p.grupo === "entregado");
  const devueltos = v.filter((p) => p.grupo === "devolucion");

  const ventas = v.length;
  const ingresos = suma(v, (p) => p.total);
  const bruta = suma(v, gananciaPedido);
  const publicidad = suma(pautaPer, (x) => x.gasto);
  const conversaciones = suma(pautaPer, (x) => x.conversaciones);
  const margenEntregado = suma(entregados, gananciaPedido);
  const costoDevoluciones = suma(devueltos, (p) => p.costoDevolucion);
  const fees = suma(v, (p) => p.fees);

  const esperada = bruta - publicidad - costoDevoluciones;
  const confirmada = margenEntregado - publicidad - costoDevoluciones - fees;
  const sinDevolver = ventas - devueltos.length;
  const diasVenta = new Set(v.map((p) => dia(p.creadoEn)));

  return {
    ventas,
    ingresos,
    facturacionEntregada: suma(entregados, (p) => p.total),
    facturacionEnCamino: suma(v.filter((p) => ["transito", "oficina", "pendiente"].includes(p.grupo)), (p) => p.total),
    bruta,
    publicidad,
    conversaciones,
    entregados: entregados.length,
    margenEntregado,
    devoluciones: devueltos.length,
    costoDevoluciones,
    fees,
    enTransito: v.filter((p) => p.grupo === "transito").length,
    enOficina: v.filter((p) => p.grupo === "oficina").length,
    esperada,
    confirmada,
    gastosTotales: publicidad + costoDevoluciones,
    pctDevolucion: div(devueltos.length, ventas),
    roas: div(ingresos, publicidad),
    roasEquilibrio: div(ingresos, bruta - costoDevoluciones),
    roiEntregados: div(confirmada, publicidad),
    cpa: div(publicidad, ventas),
    cpaMaximo: div(bruta - costoDevoluciones, ventas),
    cpaExitosa: div(publicidad, sinDevolver),
    conversion: div(ventas, conversaciones),
    costoChat: div(publicidad, conversaciones),
    eficienciaPauta: div(esperada, publicidad),
    brutaPorVenta: div(bruta, ventas),
    sinDevolver,
    diasConVentas: diasVenta.size,
    dias: diasDelPeriodo(per).length,
  };
}

/** Serie diaria para las gráficas de tendencia, margen por $1 y recuperación. */
export function serieDiaria(pedidos: Pedido[], pauta: PautaDia[], per: Periodo) {
  let acumulado = 0;
  return diasDelPeriodo(per).map((fecha) => {
    const r = resumen(pedidos, pauta, { desde: fecha, hasta: fecha });
    acumulado += r.confirmada;
    return {
      fecha,
      ventas: r.ventas,
      facturacion: r.ingresos,
      devoluciones: r.devoluciones,
      bruta: r.bruta,
      publicidad: r.publicidad,
      esperada: r.esperada,
      confirmada: r.confirmada,
      acumulado,
      // Cuánto cubre el margen entregado (neto de devoluciones y fees) por cada $1 de pauta
      margenPorDolar: div(r.margenEntregado - r.costoDevoluciones - r.fees, r.publicidad),
      margenPorDolarEstimado: div(r.bruta - r.costoDevoluciones, r.publicidad),
      cpa: r.cpa,
      brutaPorVenta: r.brutaPorVenta,
    };
  });
}

// ---- Semáforo y decisión -------------------------------------------------

export type Color = "excelente" | "bien" | "atencion" | "malo" | "sinDatos";

export const UMBRALES = {
  pctDevolucion: { excelente: 0.08, bien: 0.12, atencion: 0.15 }, // menor es mejor
  roi: { excelente: 0.5, bien: 0.15, atencion: 0 }, // mayor es mejor
  ventasMinimas: 10,
};

export function colorDevolucion(pct: number | null): Color {
  if (pct === null) return "sinDatos";
  const u = UMBRALES.pctDevolucion;
  return pct <= u.excelente ? "excelente" : pct <= u.bien ? "bien" : pct <= u.atencion ? "atencion" : "malo";
}

export function colorRoi(roi: number | null): Color {
  if (roi === null) return "sinDatos";
  const u = UMBRALES.roi;
  return roi >= u.excelente ? "excelente" : roi >= u.bien ? "bien" : roi >= u.atencion ? "atencion" : "malo";
}

export type Decision = "ESCALAR" | "MANTENER" | "OPTIMIZAR" | "PAUSAR" | "SIN DATOS";

/**
 * Recomendación para un producto. `ultimos7` (opcional) son los últimos 7 días:
 * si ahí el CPA ya pasó el máximo rentable, se pide pausar aunque el mes vaya bien.
 */
export function decision(r: Resumen, ultimos7?: Resumen): { decision: Decision; motivo: string; siguientePaso: string } {
  if (r.ventas < UMBRALES.ventasMinimas)
    return {
      decision: "SIN DATOS",
      motivo: `Solo ${r.ventas} ventas en el período; aún no hay suficiente información.`,
      siguientePaso: "Deja correr la pauta hasta tener al menos 10 ventas antes de decidir.",
    };
  const dev = colorDevolucion(r.pctDevolucion);
  if (ultimos7?.cpa != null && r.cpaMaximo != null && ultimos7.ventas > 0 && ultimos7.cpa > r.cpaMaximo)
    return {
      decision: "PAUSAR",
      motivo: `En los últimos 7 días cada venta costó ${ultimos7.cpa.toFixed(2)} y lo máximo rentable es ${r.cpaMaximo.toFixed(2)}.`,
      siguientePaso: "Pausa los conjuntos con CPA más alto o cambia creativos; no escales hasta bajar del CPA máximo.",
    };
  if (r.esperada < 0)
    return {
      decision: "PAUSAR",
      motivo: "Aun si todo lo despachado se entrega, el producto pierde dinero.",
      siguientePaso: "Pausa la pauta o revisa precio y costo antes de seguir invirtiendo.",
    };
  if (r.roas !== null && r.roasEquilibrio !== null && r.roas >= r.roasEquilibrio * 1.3 && (dev === "excelente" || dev === "bien"))
    return {
      decision: "ESCALAR",
      motivo: `ROAS ${r.roas.toFixed(2)}x frente a un equilibrio de ${r.roasEquilibrio.toFixed(2)}x y devoluciones en rango.`,
      siguientePaso: "Escala 1-2 anuncios ganadores y monitorea CPA/ROAS por 48h.",
    };
  if (dev === "malo" || dev === "atencion")
    return {
      decision: "OPTIMIZAR",
      motivo: "Las devoluciones se están comiendo el margen.",
      siguientePaso: "Refuerza la confirmación de pedidos y revisa ciudades/transportadoras con más devoluciones.",
    };
  return {
    decision: "MANTENER",
    motivo: "Rentable pero con poco colchón sobre el punto de equilibrio.",
    siguientePaso: "Mantén el presupuesto y prueba creativos nuevos para bajar el CPA.",
  };
}

/** Variación porcentual frente al período anterior (null si no hay base). */
export const variacion = (actual: number, anterior: number) =>
  anterior === 0 ? null : (actual - anterior) / Math.abs(anterior);

/** Mismo número de días inmediatamente antes. */
export function periodoAnterior(per: Periodo): Periodo {
  const n = diasDelPeriodo(per).length;
  const d = new Date(per.desde + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const hasta = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() - (n - 1));
  return { desde: d.toISOString().slice(0, 10), hasta };
}
