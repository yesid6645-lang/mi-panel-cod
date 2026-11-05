import { cookies } from "next/headers";
import { leer } from "./db";
import { fijarMoneda } from "./formato";
import type { BaseDatos, Tienda } from "./types";
import { aplicarCostos } from "./costos";

// Países de Dropi. Solo Ecuador está confirmado con una llamada real; si otro
// país usa otra dirección, se corrige en Configuración → tienda.
export const PAISES: Record<string, { nombre: string; moneda: string; dropiUrl: string }> = {
  EC: { nombre: "Ecuador", moneda: "USD", dropiUrl: "https://api.dropi.ec" },
  CO: { nombre: "Colombia", moneda: "COP", dropiUrl: "https://api.dropi.co" },
  PE: { nombre: "Perú", moneda: "PEN", dropiUrl: "https://api.dropi.pe" },
  CL: { nombre: "Chile", moneda: "CLP", dropiUrl: "https://api.dropi.cl" },
  MX: { nombre: "México", moneda: "MXN", dropiUrl: "https://api.dropi.mx" },
  PA: { nombre: "Panamá", moneda: "USD", dropiUrl: "https://api.dropi.pa" },
  GT: { nombre: "Guatemala", moneda: "GTQ", dropiUrl: "https://api.dropi.gt" },
  AR: { nombre: "Argentina", moneda: "ARS", dropiUrl: "https://api.dropi.ar" },
  PY: { nombre: "Paraguay", moneda: "PYG", dropiUrl: "https://api.dropi.com.py" },
};

export const COOKIE_TIENDA = "tienda";

/** Los datos de una sola tienda, con la misma forma que la base completa. */
export function vista(db: BaseDatos, tiendaId: string): BaseDatos {
  const de = <T extends { tiendaId: string }>(xs: T[]) => xs.filter((x) => x.tiendaId === tiendaId);
  const productos = de(db.productos);
  return { ...db, productos, pedidos: aplicarCostos(de(db.pedidos), productos), pauta: de(db.pauta) };
}

/**
 * Para las pantallas: la tienda elegida en el menú (cookie) y sus datos.
 * También deja fijada la moneda con la que se formatean los montos.
 */
export async function leerTienda(): Promise<{ db: BaseDatos; tienda: Tienda | null; tiendas: Tienda[] }> {
  const completa = await leer();
  const elegida = (await cookies()).get(COOKIE_TIENDA)?.value;
  const tienda = completa.tiendas.find((t) => t.id === elegida) ?? completa.tiendas[0] ?? null;
  fijarMoneda(tienda?.moneda ?? "USD");
  return { db: tienda ? vista(completa, tienda.id) : { ...completa, productos: [], pedidos: [], pauta: [] }, tienda, tiendas: completa.tiendas };
}

export const idTienda = (nombre: string) =>
  nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tienda";
