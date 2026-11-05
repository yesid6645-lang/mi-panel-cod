import { leer, guardarTienda, guardarProductos, guardarPedidos, reemplazarPauta } from "./db";
import { traerPedidos } from "./dropi";
import { traerPauta } from "./meta";
import type { Periodo, Producto } from "./types";

export interface ResultadoSync {
  dropi?: { ok: boolean; pedidos?: number; error?: string };
  meta?: { ok: boolean; filas?: number; error?: string };
}

/** Lo que hace el botón "Actualizar": trae Dropi y Meta del período y los mezcla con lo guardado. */
export async function actualizar(tiendaId: string, per: Periodo): Promise<ResultadoSync> {
  const db = await leer(tiendaId);
  const tienda = db.tiendas.find((t) => t.id === tiendaId);
  if (!tienda) return { dropi: { ok: false, error: "Esa tienda no existe." } };
  const ahora = new Date().toISOString();
  const out: ResultadoSync = {};

  try {
    const nuevos = await traerPedidos(tienda, per.desde, per.hasta);
    const previos = new Map(db.pedidos.map((p) => [p.id, p]));
    const productosNuevos: Producto[] = [];
    for (const p of nuevos) {
      const antes = previos.get(p.id);
      // Conserva desde cuándo está en el estado, para las alertas de "N días en este estado"
      p.estadoDesde = antes && antes.estado === p.estado ? antes.estadoDesde : p.ultimoMovimiento ?? ahora;
      if (!db.productos.some((x) => x.id === p.productoId) && !productosNuevos.some((x) => x.id === p.productoId))
        productosNuevos.push({ id: p.productoId, tiendaId, nombre: p.productoNombre, palabrasMeta: [p.productoNombre] });
    }
    await guardarProductos(productosNuevos);
    await guardarPedidos(nuevos);
    db.productos.push(...productosNuevos);
    tienda.ultimaActualizacion = { ...tienda.ultimaActualizacion, dropi: ahora };
    out.dropi = { ok: true, pedidos: nuevos.length };
  } catch (e) {
    out.dropi = { ok: false, error: (e as Error).message };
  }

  try {
    const filas = await traerPauta(tienda, per.desde, per.hasta, db.productos.filter((p) => p.tiendaId === tiendaId), db.meta);
    await reemplazarPauta(tiendaId, per.desde, per.hasta, filas);
    tienda.ultimaActualizacion = { ...tienda.ultimaActualizacion, meta: ahora };
    out.meta = { ok: true, filas: filas.length };
  } catch (e) {
    out.meta = { ok: false, error: (e as Error).message };
  }

  await guardarTienda(tienda);
  return out;
}
