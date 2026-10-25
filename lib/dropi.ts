import type { Pedido } from "./types";
import { agruparEstado } from "./estados";

// Cliente de la API de integraciones de Dropi, autenticado con el token de
// "Mis integraciones". OJO: la ruta y los nombres de campo salen de
// documentación no oficial; hay que confirmarlos con una llamada real y
// ajustar RUTA_PEDIDOS y mapearPedido() si difieren.

const RUTA_PEDIDOS = "/integrations/orders/myorders";

function config() {
  const token = process.env.DROPI_TOKEN;
  if (!token) throw new Error("Falta DROPI_TOKEN (Dropi → Mis integraciones).");
  return { token, base: process.env.DROPI_API_URL ?? "https://api.dropi.ec" };
}

export async function traerPedidos(desde: string, hasta: string): Promise<Pedido[]> {
  const { token, base } = config();
  const pedidos: Pedido[] = [];
  const tam = 100;
  for (let start = 0; ; start += tam) {
    const url = new URL(base + RUTA_PEDIDOS);
    url.search = new URLSearchParams({
      from: desde,
      until: hasta,
      result_number: String(tam),
      start: String(start),
    }).toString();
    const res = await fetch(url, { headers: { "dropi-integration-key": token, Accept: "application/json" } });
    if (!res.ok) throw new Error(`Dropi respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const lote: unknown[] = json.objects ?? json.data ?? json.orders ?? [];
    pedidos.push(...lote.map((o) => mapearPedido(o as Record<string, any>)));
    if (lote.length < tam) break;
  }
  return pedidos;
}

const num = (x: unknown) => (x == null || x === "" ? 0 : Number(x));

export function mapearPedido(o: Record<string, any>): Pedido {
  const det = o.orderdetails?.[0] ?? o.items?.[0] ?? {};
  const prod = det.product ?? {};
  const estado = String(o.status ?? o.estado ?? "");
  const unidades = (o.orderdetails ?? o.items ?? []).reduce((s: number, d: any) => s + num(d.quantity), 0) || 1;
  return {
    id: String(o.id),
    guia: o.shipping_guide ?? o.tracking_code ?? undefined,
    creadoEn: new Date(o.created_at).toISOString(),
    productoId: String(prod.id ?? det.product_id ?? "sin-producto"),
    productoNombre: String(prod.name ?? det.name ?? "Sin producto"),
    variante: String(det.variation?.name ?? prod.name ?? ""),
    unidades,
    total: num(o.total_order),
    costoProducto: (o.orderdetails ?? []).reduce((s: number, d: any) => s + num(d.supplier_price) * num(d.quantity), 0),
    flete: num(o.shipping_amount),
    costoDevolucion: num(o.return_shipping_amount ?? o.shipping_amount),
    fees: num(o.fenix_fee) + num(o.confio_fee),
    estado,
    grupo: agruparEstado(estado),
    transportadora: String(o.distribution_company?.name ?? o.carrier ?? ""),
    ciudad: String(o.city ?? ""),
    cliente: [o.name, o.surname].filter(Boolean).join(" "),
    telefono: String(o.phone ?? ""),
    ultimoMovimiento: o.updated_at ? new Date(o.updated_at).toISOString() : undefined,
  };
}
