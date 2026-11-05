import type { Pedido, Periodo } from "./types";
import { ventasDelPeriodo } from "./metrics";

// Dónde y con quién se entrega o se devuelve: agrupa los pedidos del período
// por provincia, ciudad o transportadora.

export interface FilaZona {
  nombre: string;
  pedidos: number;
  entregados: number;
  devoluciones: number;
  enCamino: number;
  pctEntrega: number | null; // sobre pedidos terminados (entregados + devueltos)
  pctDevolucion: number | null;
  facturacion: number;
}

export function porZona(pedidos: Pedido[], per: Periodo, clave: (p: Pedido) => string | undefined): FilaZona[] {
  const grupos = new Map<string, Pedido[]>();
  for (const p of ventasDelPeriodo(pedidos, per)) {
    const k = (clave(p) || "Sin dato").toUpperCase();
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  }
  return [...grupos.entries()]
    .map(([nombre, ps]) => {
      const entregados = ps.filter((p) => p.grupo === "entregado").length;
      const devoluciones = ps.filter((p) => p.grupo === "devolucion").length;
      const terminados = entregados + devoluciones;
      return {
        nombre,
        pedidos: ps.length,
        entregados,
        devoluciones,
        enCamino: ps.length - terminados,
        pctEntrega: terminados ? entregados / terminados : null,
        pctDevolucion: terminados ? devoluciones / terminados : null,
        facturacion: ps.reduce((a, p) => a + p.total, 0),
      };
    })
    .sort((a, b) => b.pedidos - a.pedidos);
}

/** Zonas con suficientes pedidos y devolución alta: donde conviene dejar de pautar o cambiar de transportadora. */
export const zonasRiesgo = (filas: FilaZona[], minimo = 4, umbral = 0.2) =>
  filas.filter((f) => f.entregados + f.devoluciones >= minimo && (f.pctDevolucion ?? 0) >= umbral).sort((a, b) => (b.pctDevolucion ?? 0) - (a.pctDevolucion ?? 0));
