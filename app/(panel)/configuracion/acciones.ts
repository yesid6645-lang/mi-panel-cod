"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { leer, leerConfig, guardarMeta, guardarProductos, guardarTienda as guardarTiendaDb, eliminarTienda as eliminarTiendaDb } from "@/lib/db";
import { PAISES, COOKIE_TIENDA, idTienda } from "@/lib/tiendas";

export async function guardarCampanas(form: FormData) {
  const tiendaId = String(form.get("tiendaId"));
  const { productos } = await leer(tiendaId);
  for (const p of productos) p.campanasMeta = form.getAll(`campanas:${p.id}`).map(String);
  await guardarProductos(productos);
  revalidatePath("/configuracion");
}

export async function desconectarMeta() {
  await guardarMeta(undefined);
  revalidatePath("/", "layout");
}

/** Crea o edita una tienda. El token solo se reemplaza si escribes uno nuevo. */
export async function guardarTienda(form: FormData) {
  const db = await leerConfig();
  const nombre = String(form.get("nombre") ?? "").trim();
  if (!nombre) return;
  const pais = String(form.get("pais"));
  const base = PAISES[pais];
  const existente = db.tiendas.find((t) => t.id === form.get("id"));
  const token = String(form.get("dropiToken") ?? "").trim();
  const tasa = Number(form.get("tasaPauta"));
  const tasaUsd = Number(form.get("tasaUsd"));
  const texto = (k: string) => String(form.get(k) ?? "").trim();
  const datos = {
    nombre,
    pais,
    moneda: base?.moneda ?? "USD",
    dropiUrl: String(form.get("dropiUrl") ?? "").trim() || base?.dropiUrl || "",
    cuentasMeta: form.getAll("cuentasMeta").map(String),
    tasaPauta: tasa > 0 ? tasa : undefined,
    tasaUsd: tasaUsd > 0 ? tasaUsd : undefined,
  };
  // Shopify: los secretos solo se reemplazan si escribes uno nuevo
  const dominio = texto("shopifyDominio").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const previo = existente?.shopify;
  const shopify = dominio
    ? {
        dominio,
        token: texto("shopifyToken") || previo?.token,
        clientId: texto("shopifyClientId") || previo?.clientId,
        clientSecret: texto("shopifyClientSecret") || previo?.clientSecret,
      }
    : undefined;
  if (existente) {
    Object.assign(existente, datos, { shopify });
    if (token) existente.dropiToken = token;
    await guardarTiendaDb(existente);
  } else {
    let id = idTienda(nombre);
    while (db.tiendas.some((t) => t.id === id)) id += "-2";
    await guardarTiendaDb({ id, ...datos, shopify, dropiToken: token || undefined });
    (await cookies()).set(COOKIE_TIENDA, id, { path: "/", maxAge: 365 * 86400 });
  }
  revalidatePath("/", "layout");
}

/** Borra la tienda y todos sus pedidos, productos y pauta guardados aquí (no toca Dropi). */
export async function eliminarTienda(form: FormData) {
  await eliminarTiendaDb(String(form.get("id")));
  revalidatePath("/", "layout");
}

export async function elegirTienda(form: FormData) {
  (await cookies()).set(COOKIE_TIENDA, String(form.get("tienda")), { path: "/", maxAge: 365 * 86400 });
  revalidatePath("/", "layout");
  const volver = form.get("volver");
  if (volver) redirect(String(volver));
}
