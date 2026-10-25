"use server";

import { revalidatePath } from "next/cache";
import { leer, guardar } from "@/lib/db";
import type { EstadoGestion } from "@/lib/types";

export async function cambiarGestion(form: FormData) {
  const id = String(form.get("id"));
  const estado = String(form.get("estado")) as EstadoGestion;
  const nota = String(form.get("nota") ?? "").trim() || undefined;
  const db = await leer();
  db.gestiones = { ...db.gestiones, [id]: { estado, nota, actualizado: new Date().toISOString() } };
  await guardar(db);
  revalidatePath("/logistica");
}
