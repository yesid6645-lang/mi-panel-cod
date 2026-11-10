import { leer, guardarTienda, guardarProductos, guardarPedidos, guardarPedidosShopify, reemplazarPauta } from "./db";
import { traerPedidosShopify } from "./shopify";
import { traerPedidos } from "./dropi";
import { traerPauta } from "./meta";
import type { Periodo, Producto } from "./types";

export interface ResultadoSync {
  dropi?: { ok: boolean; pedidos?: number; error?: string };
  shopify?: { ok: boolean; pedidos?: number; error?: string; omitido?: boolean };
  meta?: { ok: boolean; filas?: number; error?: string; gastoTotal?: number; gastoSinAsignar?: number; campanasSinAsignar?: string[] };
}

/** Lo que hace el botón "Actualizar": trae Dropi y Meta del período y los mezcla con lo guardado. */
/**
 * Lo que hace el botón "Actualizar". `fuente` permite hacer Dropi y Meta en
 * llamadas separadas: en Netlify cada llamada tiene un límite de ~10 segundos.
 */
export async function actualizar(tiendaId: string, per: Periodo, fuente: "dropi" | "meta" | "shopify" | "todo" = "todo"): Promise<ResultadoSync> {
  const db = await leer(tiendaId);
  const tienda = db.tiendas.find((t) => t.id === tiendaId);
  if (!tienda) return { dropi: { ok: false, error: "Esa tienda no existe." } };
  const ahora = new Date().toISOString();
  const out: ResultadoSync = {};

  if (fuente === "todo" || fuente === "dropi") try {
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

  if (fuente === "todo" || fuente === "shopify") {
    if (!tienda.shopify?.dominio) out.shopify = { ok: false, omitido: true, error: "sin conectar" };
    else
      try {
        const ps = await traerPedidosShopify(tienda, per.desde, per.hasta);
        await guardarPedidosShopify(ps);
        tienda.ultimaActualizacion = { ...tienda.ultimaActualizacion, shopify: ahora };
        out.shopify = { ok: true, pedidos: ps.length };
      } catch (e) {
        out.shopify = { ok: false, error: (e as Error).message };
      }
  }

  if (fuente === "todo" || fuente === "meta") try {
    const r = await traerPauta(tienda, per.desde, per.hasta, db.productos.filter((p) => p.tiendaId === tiendaId), db.meta);
    await reemplazarPauta(tiendaId, per.desde, per.hasta, r.filas);
    tienda.ultimaActualizacion = { ...tienda.ultimaActualizacion, meta: ahora };
    out.meta = { ok: true, filas: r.filas.length, gastoTotal: r.gastoTotal, gastoSinAsignar: r.gastoSinAsignar, campanasSinAsignar: r.campanasSinAsignar.slice(0, 5) };
  } catch (e) {
    out.meta = { ok: false, error: (e as Error).message };
  }

  await guardarTienda(tienda);
  return out;
}
