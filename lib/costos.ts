import type { Pedido, Producto } from "./types";

/**
 * Aplica los costos que configuraste en cada producto sobre los pedidos de
 * Dropi. Se hace al leer (no al sincronizar), así un cambio de costos se ve de
 * inmediato en todo el historial sin volver a descargar nada.
 */
export function aplicarCostos(pedidos: Pedido[], productos: Producto[]): Pedido[] {
  const costos = new Map(productos.filter((p) => p.costos).map((p) => [p.id, p.costos!]));
  if (!costos.size) return pedidos;
  return pedidos.map((p) => {
    const c = costos.get(p.productoId);
    if (!c) return p;
    const costoDropi = p.costoDropi ?? p.costoProducto;
    return {
      ...p,
      costoDropi,
      costoProducto: c.costoUnitario != null ? c.costoUnitario * p.unidades : costoDropi,
      otrosCostos: (c.extraPorPedido ?? 0) + ((c.comisionPct ?? 0) / 100) * p.total,
      costoDevolucion: c.costoDevolucion ?? p.costoDevolucion,
    };
  });
}

/** Costo por unidad que manda Dropi para un producto (el del pedido más reciente). */
export function costoUnitarioDropi(pedidos: Pedido[], productoId: string) {
  const p = pedidos.filter((x) => x.productoId === productoId).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))[0];
  return p ? (p.costoDropi ?? p.costoProducto) / p.unidades : null;
}
