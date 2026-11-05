import { promises as fs } from "node:fs";
import path from "node:path";
import type { BaseDatos } from "../types";
import type { Almacen } from "./tipo";

// Archivo data/db.json: para usar el panel en tu computador sin nada más.

const ARCHIVO = path.join(process.cwd(), "data", "db.json");
const VACIA: BaseDatos = { tiendas: [], productos: [], pedidos: [], pauta: [] };

async function cargar(): Promise<BaseDatos> {
  try {
    return migrar(JSON.parse(await fs.readFile(ARCHIVO, "utf8")));
  } catch {
    return structuredClone(VACIA);
  }
}

async function escribir(db: BaseDatos) {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  await fs.writeFile(ARCHIVO, JSON.stringify(db, null, 2));
}

async function cambiar(f: (db: BaseDatos) => void) {
  const db = await cargar();
  f(db);
  await escribir(db);
}

const porId = <T extends { id: string }>(actuales: T[], nuevos: T[]) => {
  const m = new Map(actuales.map((x) => [x.id, x]));
  for (const n of nuevos) m.set(n.id, n);
  return [...m.values()];
};

export const archivo: Almacen = {
  async leer(tiendaId) {
    const db = await cargar();
    if (!tiendaId) return db;
    const de = <T extends { tiendaId: string }>(xs: T[]) => xs.filter((x) => x.tiendaId === tiendaId);
    return { ...db, productos: de(db.productos), pedidos: de(db.pedidos), pauta: de(db.pauta) };
  },
  async leerConfig() {
    const { tiendas, meta } = await cargar();
    return { tiendas, meta };
  },
  guardarTienda: (t) => cambiar((db) => void (db.tiendas = porId(db.tiendas, [t]))),
  eliminarTienda: (id) =>
    cambiar((db) => {
      db.tiendas = db.tiendas.filter((t) => t.id !== id);
      db.productos = db.productos.filter((x) => x.tiendaId !== id);
      db.pedidos = db.pedidos.filter((x) => x.tiendaId !== id);
      db.pauta = db.pauta.filter((x) => x.tiendaId !== id);
    }),
  guardarProductos: (ps) => cambiar((db) => void (db.productos = porId(db.productos, ps))),
  guardarPedidos: (ps) => cambiar((db) => void (db.pedidos = porId(db.pedidos, ps))),
  reemplazarPauta: (tiendaId, desde, hasta, filas) =>
    cambiar((db) => {
      db.pauta = [...db.pauta.filter((x) => x.tiendaId !== tiendaId || x.fecha < desde || x.fecha > hasta), ...filas];
    }),
  guardarGestion: (id, g) => cambiar((db) => void (db.gestiones = { ...db.gestiones, [id]: g })),
  guardarMeta: (m) => cambiar((db) => void (db.meta = m)),
};

/** Datos de antes de tener varias tiendas: todo pasa a una tienda "Zorvix Ecuador". */
function migrar(db: BaseDatos & { ultimaActualizacion?: { dropi?: string; meta?: string } }): BaseDatos {
  if (db.tiendas) return db;
  const id = "zorvix-ecuador";
  const pref = (x: string) => (x.startsWith(id + "-") ? x : `${id}-${x}`);
  return {
    tiendas: [{ id, nombre: "Zorvix Ecuador", pais: "EC", moneda: "USD", dropiUrl: "https://api.dropi.ec", cuentasMeta: [], ultimaActualizacion: db.ultimaActualizacion }],
    productos: db.productos.map((p) => ({ ...p, id: pref(p.id), tiendaId: id })),
    pedidos: db.pedidos.map((p) => ({ ...p, id: pref(p.id), productoId: pref(p.productoId), tiendaId: id })),
    pauta: db.pauta.map((p) => ({ ...p, productoId: pref(p.productoId), tiendaId: id })),
    gestiones: Object.fromEntries(Object.entries(db.gestiones ?? {}).map(([k, v]) => [pref(k), v])),
    meta: db.meta,
  };
}
