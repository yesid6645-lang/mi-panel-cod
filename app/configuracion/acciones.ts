"use server";

import { revalidatePath } from "next/cache";
import { leer, guardar } from "@/lib/db";

export async function guardarCampanas(form: FormData) {
  const db = await leer();
  for (const p of db.productos) p.campanasMeta = form.getAll(`campanas:${p.id}`).map(String);
  await guardar(db);
  revalidatePath("/configuracion");
}

export async function desconectarMeta() {
  const db = await leer();
  delete db.meta;
  await guardar(db);
  revalidatePath("/", "layout");
}
