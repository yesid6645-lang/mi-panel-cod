"use server";

import { revalidatePath } from "next/cache";
import { leer, guardar } from "@/lib/db";
import type { CostosProducto } from "@/lib/types";

const numero = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim().replace(",", ".");
  return t === "" ? undefined : Number(t);
};

export async function guardarCostos(form: FormData) {
  const tiendaId = String(form.get("tiendaId"));
  const db = await leer();
  for (const p of db.productos.filter((x) => x.tiendaId === tiendaId)) {
    const c: CostosProducto = {
      costoUnitario: numero(form.get(`costoUnitario:${p.id}`)),
      extraPorPedido: numero(form.get(`extraPorPedido:${p.id}`)),
      comisionPct: numero(form.get(`comisionPct:${p.id}`)),
      costoDevolucion: numero(form.get(`costoDevolucion:${p.id}`)),
    };
    p.costos = Object.values(c).some((x) => x !== undefined && !Number.isNaN(x)) ? c : undefined;
  }
  await guardar(db);
  revalidatePath("/", "layout");
}
