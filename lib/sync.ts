import { leer, guardar } from "./db";
import { traerPedidos } from "./dropi";
import { traerPauta } from "./meta";
import type { Periodo } from "./types";

export interface ResultadoSync {
  dropi?: { ok: boolean; pedidos?: number; error?: string };
  meta?: { ok: boolean; filas?: number; error?: string };
}

/** Lo que hace el botón "Actualizar": trae Dropi y Meta del período y los mezcla con lo guardado. */
export async function actualizar(per: Periodo): Promise<ResultadoSync> {
  const db = await leer();
  const ahora = new Date().toISOString();
  const out: ResultadoSync = {};

  try {
    const nuevos = await traerPedidos(per.desde, per.hasta);
    const previos = new Map(db.pedidos.map((p) => [p.id, p]));
    for (const p of nuevos) {
      const antes = previos.get(p.id);
      // Conserva desde cuándo está en el estado, para las alertas de "N días en este estado"
      p.estadoDesde = antes && antes.estado === p.estado ? antes.estadoDesde : p.ultimoMovimiento ?? ahora;
      previos.set(p.id, p);
      if (!db.productos.some((x) => x.id === p.productoId))
        db.productos.push({ id: p.productoId, nombre: p.productoNombre, palabrasMeta: [p.productoNombre] });
    }
    db.pedidos = [...previos.values()];
    db.ultimaActualizacion = { ...db.ultimaActualizacion, dropi: ahora };
    out.dropi = { ok: true, pedidos: nuevos.length };
  } catch (e) {
    out.dropi = { ok: false, error: (e as Error).message };
  }

  try {
    const filas = await traerPauta(per.desde, per.hasta, db.productos);
    db.pauta = [...db.pauta.filter((x) => x.fecha < per.desde || x.fecha > per.hasta), ...filas];
    db.ultimaActualizacion = { ...db.ultimaActualizacion, meta: ahora };
    out.meta = { ok: true, filas: filas.length };
  } catch (e) {
    out.meta = { ok: false, error: (e as Error).message };
  }

  await guardar(db);
  return out;
}
