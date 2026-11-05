import { promises as fs } from "node:fs";
import path from "node:path";
import type { BaseDatos } from "./types";

// Almacenamiento en un archivo JSON local. Antes de publicar el panel se cambia
// por Supabase sin tocar las pantallas, porque todo pasa por leer()/guardar().

const ARCHIVO = path.join(process.cwd(), "data", "db.json");
const VACIA: BaseDatos = { tiendas: [], productos: [], pedidos: [], pauta: [] };

export async function leer(): Promise<BaseDatos> {
  let db: BaseDatos;
  try {
    db = JSON.parse(await fs.readFile(ARCHIVO, "utf8"));
  } catch {
    return structuredClone(VACIA);
  }
  return migrar(db);
}

export async function guardar(db: BaseDatos): Promise<void> {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  await fs.writeFile(ARCHIVO, JSON.stringify(db, null, 2));
}

/** Datos de antes de tener varias tiendas: todo pasa a una tienda "Zorvix Ecuador". */
function migrar(db: BaseDatos & { ultimaActualizacion?: { dropi?: string; meta?: string } }): BaseDatos {
  if (db.tiendas) return db;
  const id = "zorvix-ecuador";
  const pref = (x: string) => (x.startsWith(id + "-") ? x : `${id}-${x}`);
  return {
    tiendas: [
      {
        id,
        nombre: "Zorvix Ecuador",
        pais: "EC",
        moneda: "USD",
        dropiUrl: "https://api.dropi.ec",
        cuentasMeta: [],
        ultimaActualizacion: db.ultimaActualizacion,
      },
    ],
    productos: db.productos.map((p) => ({ ...p, id: pref(p.id), tiendaId: id })),
    pedidos: db.pedidos.map((p) => ({ ...p, id: pref(p.id), productoId: pref(p.productoId), tiendaId: id })),
    pauta: db.pauta.map((p) => ({ ...p, productoId: pref(p.productoId), tiendaId: id })),
    gestiones: Object.fromEntries(Object.entries(db.gestiones ?? {}).map(([k, v]) => [pref(k), v])),
    meta: db.meta,
  };
}
