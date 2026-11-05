"use server";

import { revalidatePath } from "next/cache";
import { guardarGestion } from "@/lib/db";
import type { EstadoGestion } from "@/lib/types";

export async function cambiarGestion(form: FormData) {
  const id = String(form.get("id"));
  const estado = String(form.get("estado")) as EstadoGestion;
  const nota = String(form.get("nota") ?? "").trim() || undefined;
  await guardarGestion(id, { estado, nota, actualizado: new Date().toISOString() });
  revalidatePath("/logistica");
}
