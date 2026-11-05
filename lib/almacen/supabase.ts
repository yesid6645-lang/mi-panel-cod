import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ConexionMeta, Gestion, PautaDia, Pedido, Producto, Tienda } from "../types";
import type { Almacen } from "./tipo";

// Supabase (Postgres). Cada tabla guarda el objeto completo en `datos` (jsonb)
// más las columnas por las que se filtra. Ver supabase/esquema.sql.
// Usa la clave service_role, que solo vive en el servidor: las tablas tienen
// RLS activado sin políticas, así que nadie puede leerlas desde el navegador.

let cliente: SupabaseClient | null = null;
const db = () =>
  (cliente ??= createClient(process.env.SUPABASE_URL!.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/$/, ""), process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(), {
    auth: { persistSession: false },
  }));

function revisar<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(`Supabase: ${r.error.message}`);
  return r.data as T;
}

/** PostgREST devuelve máximo 1000 filas por consulta: se pide por páginas. */
async function todas<T>(tabla: string, filtro?: [string, string]): Promise<T[]> {
  const out: T[] = [];
  const tam = 1000;
  for (let i = 0; ; i += tam) {
    let q = db().from(tabla).select("datos").range(i, i + tam - 1);
    if (filtro) q = q.eq(filtro[0], filtro[1]);
    const filas = revisar(await q) as { datos: T }[];
    out.push(...filas.map((f) => f.datos));
    if (filas.length < tam) return out;
  }
}

async function enLotes<T>(filas: T[], f: (lote: T[]) => PromiseLike<{ error: { message: string } | null }>) {
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await f(filas.slice(i, i + 500));
    if (error) throw new Error(`Supabase: ${error.message}`);
  }
}

async function leerMeta() {
  const filas = revisar(await db().from("ajustes").select("datos").eq("clave", "meta")) as { datos: ConexionMeta }[];
  return filas[0]?.datos;
}

export const supabase: Almacen = {
  async leer(tiendaId) {
    const filtro: [string, string] | undefined = tiendaId ? ["tienda_id", tiendaId] : undefined;
    const [tiendas, productos, pedidos, pauta, gestiones, meta] = await Promise.all([
      todas<Tienda>("tiendas"),
      todas<Producto>("productos", filtro),
      todas<Pedido>("pedidos", filtro),
      todas<PautaDia>("pauta", filtro),
      db().from("gestiones").select("pedido_id, datos").then(revisar) as Promise<{ pedido_id: string; datos: Gestion }[]>,
      leerMeta(),
    ]);
    return { tiendas, productos, pedidos, pauta, gestiones: Object.fromEntries(gestiones.map((g) => [g.pedido_id, g.datos])), meta };
  },
  async leerConfig() {
    const [tiendas, meta] = await Promise.all([todas<Tienda>("tiendas"), leerMeta()]);
    return { tiendas, meta };
  },
  async guardarTienda(t) {
    revisar(await db().from("tiendas").upsert({ id: t.id, datos: t }));
  },
  async eliminarTienda(id) {
    // productos, pedidos y pauta se borran en cascada
    revisar(await db().from("tiendas").delete().eq("id", id));
  },
  guardarProductos: (ps) => enLotes(ps, (l) => db().from("productos").upsert(l.map((p) => ({ id: p.id, tienda_id: p.tiendaId, datos: p })))),
  guardarPedidos: (ps) =>
    enLotes(ps, (l) => db().from("pedidos").upsert(l.map((p) => ({ id: p.id, tienda_id: p.tiendaId, creado_en: p.creadoEn, datos: p })))),
  async reemplazarPauta(tiendaId, desde, hasta, filas) {
    revisar(await db().from("pauta").delete().eq("tienda_id", tiendaId).gte("fecha", desde).lte("fecha", hasta));
    await enLotes(filas, (l) =>
      db().from("pauta").insert(l.map((x) => ({ tienda_id: x.tiendaId, fecha: x.fecha, producto_id: x.productoId, datos: x }))),
    );
  },
  async guardarGestion(id, g) {
    revisar(await db().from("gestiones").upsert({ pedido_id: id, datos: g }));
  },
  async guardarMeta(m) {
    if (m) revisar(await db().from("ajustes").upsert({ clave: "meta", datos: m }));
    else revisar(await db().from("ajustes").delete().eq("clave", "meta"));
  },
};
