import { promises as fs } from "node:fs";
import path from "node:path";
import type { BaseDatos } from "./types";

// Almacenamiento en un archivo JSON local. Para una tienda (~cientos de pedidos
// al mes) es suficiente; si luego se despliega en la nube se cambia por Supabase
// sin tocar las pantallas, porque todo pasa por leer()/guardar().

const ARCHIVO = path.join(process.cwd(), "data", "db.json");
const VACIA: BaseDatos = { productos: [], pedidos: [], pauta: [] };

export async function leer(): Promise<BaseDatos> {
  try {
    return JSON.parse(await fs.readFile(ARCHIVO, "utf8")) as BaseDatos;
  } catch {
    return structuredClone(VACIA);
  }
}

export async function guardar(db: BaseDatos): Promise<void> {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  await fs.writeFile(ARCHIVO, JSON.stringify(db, null, 2));
}
