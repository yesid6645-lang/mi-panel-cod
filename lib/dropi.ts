import type { Pedido, Tienda } from "./types";
import { agruparEstado } from "./estados";

// Cliente de la API de integraciones de Dropi, autenticado con el token de
// "Mis integraciones" de cada tienda en el encabezado dropi-integration-key.
// Ruta y campos confirmados con Dropi Ecuador (oct 2026). En el entorno de
// Claude el encabezado lo agrega la red, por eso el token puede faltar.

const RUTA_PEDIDOS = "/integrations/orders/myorders";

export async function traerPedidos(tienda: Tienda, desde: string, hasta: string): Promise<Pedido[]> {
  const token = tienda.dropiToken ?? process.env[`DROPI_TOKEN_${tienda.id.toUpperCase().replace(/-/g, "_")}`] ?? process.env.DROPI_TOKEN;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["dropi-integration-key"] = token;
  const base = tienda.dropiUrl.replace(/\/$/, "");
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
    const res = await fetch(url, { headers });
    if (res.status === 401 || res.status === 403)
      throw new Error("Dropi rechazó el token: revisa DROPI_TOKEN o el secreto del entorno.");
    if (!res.ok) throw new Error(`Dropi respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = await res.json();
    const lote: unknown[] = json.objects ?? [];
    pedidos.push(...lote.map((o) => mapearPedido(o as Record<string, any>, tienda.id)));
    if (lote.length < tam) break;
  }
  return pedidos;
}

const num = (x: unknown) => (x == null || x === "" ? 0 : Number(x));

export function mapearPedido(o: Record<string, any>, tiendaId: string): Pedido {
  const detalles: any[] = o.orderdetails ?? [];
  const prod = detalles[0]?.product ?? {};
  const unidades = detalles.reduce((s, d) => s + num(d.quantity), 0) || 1;
  const estado = String(o.status ?? "");
  const nombre = String(prod.name ?? "Sin producto");
  return {
    id: `${tiendaId}-${o.id}`,
    tiendaId,
    guia: o.shipping_guide ?? undefined,
    // Dropi entrega la hora local de Ecuador sin zona; se guarda tal cual
    creadoEn: String(o.created_at),
    productoId: `${tiendaId}-${prod.id ?? detalles[0]?.product_id ?? "sin-producto"}`,
    productoNombre: nombre,
    variante: [detalles[0]?.variation?.name ?? nombre, unidades > 1 ? `x${unidades}` : ""].filter(Boolean).join(" "),
    unidades,
    total: num(o.total_order),
    // sale_price es lo que el proveedor te cobra por unidad
    costoProducto: detalles.reduce((s, d) => s + num(d.variation?.sale_price ?? d.product?.sale_price) * num(d.quantity), 0),
    flete: num(o.shipping_amount),
    // Dropi no manda el flete de devolución aparte; WinTrack usa el mismo valor del flete
    costoDevolucion: num(o.shipping_amount),
    fees: 0,
    estado,
    grupo: agruparEstado(estado),
    transportadora: String(o.distribution_company?.name ?? o.shipping_company ?? ""),
    ciudad: String(o.city ?? ""),
    provincia: o.state ? String(o.state) : undefined,
    origen: o.shop?.type ? String(o.shop.type) : undefined,
    origenId: o.shop_order_id ? String(o.shop_order_id) : undefined,
    cliente: [o.name, o.surname].filter(Boolean).join(" "),
    telefono: String(o.phone ?? ""),
    ultimoMovimiento: o.updated_at ? String(o.updated_at) : undefined,
  };
}
