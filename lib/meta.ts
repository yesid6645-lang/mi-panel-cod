import type { PautaDia, Producto } from "./types";

// Gasto diario y conversaciones de Meta Ads por campaña, asignado a cada
// producto según las palabras de su nombre de campaña (Producto.palabrasMeta).

const VERSION = "v21.0";
const ACCION_CHAT = "onsite_conversion.messaging_conversation_started_7d";

export async function traerPauta(desde: string, hasta: string, productos: Producto[]): Promise<PautaDia[]> {
  const token = process.env.META_ACCESS_TOKEN;
  const cuenta = process.env.META_AD_ACCOUNT_ID;
  if (!token || !cuenta) throw new Error("Faltan META_ACCESS_TOKEN o META_AD_ACCOUNT_ID.");
  const copPorUsd = Number(process.env.COP_PER_USD ?? 4000);

  const params = new URLSearchParams({
    level: "campaign",
    time_increment: "1",
    time_range: JSON.stringify({ since: desde, until: hasta }),
    fields: "campaign_name,spend,actions,account_currency",
    limit: "500",
    access_token: token,
  });
  let url: string | undefined = `https://graph.facebook.com/${VERSION}/${cuenta}/insights?${params}`;
  const porClave = new Map<string, PautaDia>();

  while (url) {
    const res = await fetch(url);
    const json: any = await res.json();
    if (!res.ok) throw new Error(`Meta respondió ${res.status}: ${json.error?.message ?? ""}`);
    for (const fila of json.data ?? []) {
      const producto = productos.find((p) =>
        p.palabrasMeta.some((w) => fila.campaign_name.toLowerCase().includes(w.toLowerCase())),
      );
      if (!producto) continue;
      const gasto = Number(fila.spend) / (fila.account_currency === "COP" ? copPorUsd : 1);
      const chats = Number(fila.actions?.find((a: any) => a.action_type === ACCION_CHAT)?.value ?? 0);
      const clave = `${fila.date_start}|${producto.id}`;
      const previo = porClave.get(clave) ?? { fecha: fila.date_start, productoId: producto.id, gasto: 0, conversaciones: 0 };
      previo.gasto += gasto;
      previo.conversaciones += chats;
      porClave.set(clave, previo);
    }
    url = json.paging?.next;
  }
  return [...porClave.values()];
}
