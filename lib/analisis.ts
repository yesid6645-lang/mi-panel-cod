import type { Pedido, PautaDia, Periodo } from "./types";
import { ventasDelPeriodo, serieDiaria, resumen } from "./metrics";

// Cálculos de las secciones del detalle de producto que no son KPIs sueltos.

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const diaSemana = (fecha: string) => new Date(fecha + "T00:00:00Z").getUTCDay();

export function ritmoSemanal(pedidos: Pedido[], pauta: PautaDia[], per: Periodo) {
  const serie = serieDiaria(pedidos, pauta, per);
  const porDia = DIAS.map((nombre, i) => {
    const dias = serie.filter((s) => diaSemana(s.fecha) === i);
    const ventas = dias.reduce((a, s) => a + s.ventas, 0);
    return { nombre, promedio: dias.length ? ventas / dias.length : 0 };
  });
  const masFuerte = porDia.reduce((a, b) => (b.promedio > a.promedio ? b : a));
  const mejor = serie.reduce((a, b) => (b.ventas > a.ventas ? b : a), serie[0]);
  const rentable = serie.reduce((a, b) => (b.esperada > a.esperada ? b : a), serie[0]);
  const etiqueta = (f: string) => `${["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][diaSemana(f)]} ${Number(f.slice(8))}`;
  return {
    porDia,
    masFuerte,
    mejor: mejor && { ...mejor, etiqueta: etiqueta(mejor.fecha) },
    rentable: rentable && { ...rentable, etiqueta: etiqueta(rentable.fecha) },
  };
}

export function composicion(pedidos: Pedido[], per: Periodo) {
  const v = ventasDelPeriodo(pedidos, per);
  const finalizados = v.filter((p) => p.grupo === "entregado" || p.grupo === "devolucion");
  const ok = finalizados.filter((p) => p.grupo === "entregado").length;
  const unidades = v.reduce((a, p) => a + p.unidades, 0);
  const prom = (xs: Pedido[]) => (xs.length ? xs.reduce((a, p) => a + p.total, 0) / xs.length : null);
  const uno = v.filter((p) => p.unidades === 1);
  const mas = v.filter((p) => p.unidades > 1);

  const variantes = new Map<string, Pedido[]>();
  for (const p of v) variantes.set(p.variante, [...(variantes.get(p.variante) ?? []), p]);

  return {
    finalizados: finalizados.length,
    entregados: ok,
    devueltos: finalizados.length - ok,
    ticket: prom(v),
    costoUnitario: unidades ? v.reduce((a, p) => a + p.costoProducto, 0) / unidades : null,
    unidadesPorOrden: v.length ? unidades / v.length : null,
    tasaUpsell: v.length ? mas.length / v.length : null,
    ticketUno: prom(uno),
    ticketUpsell: prom(mas),
    distribucion: [
      { etiqueta: "1 unidad", n: uno.length },
      { etiqueta: "2 unidades", n: v.filter((p) => p.unidades === 2).length },
      { etiqueta: "3+ unidades", n: v.filter((p) => p.unidades >= 3).length },
    ],
    variantes: [...variantes.entries()]
      .map(([nombre, ps]) => ({
        nombre,
        ventas: ps.length,
        precio: prom(ps),
        ok: ps.filter((p) => p.grupo === "entregado").length,
        dev: ps.filter((p) => p.grupo === "devolucion").length,
      }))
      .sort((a, b) => b.ventas - a.ventas),
  };
}

export type ColorDia = "sinMovimiento" | "ganaste" | "porPoco" | "equilibrio" | "perdiste";

/** Calendario de CPA: compara el CPA de cada día con el margen por venta de ese día. */
export function calendarioCpa(pedidos: Pedido[], pauta: PautaDia[], per: Periodo) {
  return serieDiaria(pedidos, pauta, per).map((s) => {
    let color: ColorDia;
    if (s.ventas === 0 && s.publicidad === 0) color = "sinMovimiento";
    else if (s.ventas === 0) color = "perdiste";
    else {
      const colchon = (s.brutaPorVenta ?? 0) - (s.cpa ?? 0);
      const base = s.brutaPorVenta || 1;
      color = Math.abs(colchon) < 0.25 ? "equilibrio" : colchon < 0 ? "perdiste" : colchon / base < 0.25 ? "porPoco" : "ganaste";
    }
    return { fecha: s.fecha, ventas: s.ventas, cpa: s.cpa, color, diaSemana: diaSemana(s.fecha) };
  });
}

/** Dónde están hoy los pedidos creados en el período. */
export function estadoActual(pedidos: Pedido[], per: Periodo) {
  const v = ventasDelPeriodo(pedidos, per);
  const contar = (g: Pedido["grupo"]) => v.filter((p) => p.grupo === g).length;
  return {
    total: v.length,
    entregados: contar("entregado"),
    transito: contar("transito") + contar("pendiente"),
    oficina: contar("oficina"),
    devoluciones: contar("devolucion"),
  };
}

/** Primer día en que la ganancia acumulada pasó de negativa a positiva (null si el mes va en pérdida). */
export function diaRecuperado(pedidos: Pedido[], pauta: PautaDia[], per: Periodo) {
  const serie = serieDiaria(pedidos, pauta, per);
  const acumulado = serie.at(-1)?.acumulado ?? 0;
  let dia: string | null = null;
  if (acumulado >= 0) {
    const i = serie.findIndex((s, k) => s.acumulado >= 0 && k > 0 && serie[k - 1].acumulado < 0);
    dia = i >= 0 ? serie[i].fecha : serie[0]?.fecha ?? null;
  }
  return { dia, acumulado, roi: resumen(pedidos, pauta, per).roiEntregados };
}
