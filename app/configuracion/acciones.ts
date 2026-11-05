"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { leer, guardar } from "@/lib/db";
import { PAISES, COOKIE_TIENDA, idTienda } from "@/lib/tiendas";

export async function guardarCampanas(form: FormData) {
  const tiendaId = String(form.get("tiendaId"));
  const db = await leer();
  for (const p of db.productos.filter((x) => x.tiendaId === tiendaId)) p.campanasMeta = form.getAll(`campanas:${p.id}`).map(String);
  await guardar(db);
  revalidatePath("/configuracion");
}

export async function desconectarMeta() {
  const db = await leer();
  delete db.meta;
  await guardar(db);
  revalidatePath("/", "layout");
}

/** Crea o edita una tienda. El token solo se reemplaza si escribes uno nuevo. */
export async function guardarTienda(form: FormData) {
  const db = await leer();
  const nombre = String(form.get("nombre") ?? "").trim();
  if (!nombre) return;
  const pais = String(form.get("pais"));
  const base = PAISES[pais];
  const existente = db.tiendas.find((t) => t.id === form.get("id"));
  const token = String(form.get("dropiToken") ?? "").trim();
  const tasa = Number(form.get("tasaPauta"));
  const datos = {
    nombre,
    pais,
    moneda: base?.moneda ?? "USD",
    dropiUrl: String(form.get("dropiUrl") ?? "").trim() || base?.dropiUrl || "",
    cuentasMeta: form.getAll("cuentasMeta").map(String),
    tasaPauta: tasa > 0 ? tasa : undefined,
  };
  if (existente) {
    Object.assign(existente, datos);
    if (token) existente.dropiToken = token;
  } else {
    let id = idTienda(nombre);
    while (db.tiendas.some((t) => t.id === id)) id += "-2";
    db.tiendas.push({ id, ...datos, dropiToken: token || undefined });
    (await cookies()).set(COOKIE_TIENDA, id, { path: "/", maxAge: 365 * 86400 });
  }
  await guardar(db);
  revalidatePath("/", "layout");
}

/** Borra la tienda y todos sus pedidos, productos y pauta guardados aquí (no toca Dropi). */
export async function eliminarTienda(form: FormData) {
  const id = String(form.get("id"));
  const db = await leer();
  db.tiendas = db.tiendas.filter((t) => t.id !== id);
  db.productos = db.productos.filter((x) => x.tiendaId !== id);
  db.pedidos = db.pedidos.filter((x) => x.tiendaId !== id);
  db.pauta = db.pauta.filter((x) => x.tiendaId !== id);
  await guardar(db);
  revalidatePath("/", "layout");
}

export async function elegirTienda(form: FormData) {
  (await cookies()).set(COOKIE_TIENDA, String(form.get("tienda")), { path: "/", maxAge: 365 * 86400 });
  revalidatePath("/", "layout");
}
