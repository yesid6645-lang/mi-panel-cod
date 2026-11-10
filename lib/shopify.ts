import type { Pedido, PedidoShopify, Tienda } from "./types";

// Shopify Admin API (GraphQL). Dos formas de conectar cada tienda:
// - token de una app creada en el admin de Shopify (shpat_…)
// - app del Dev Dashboard instalada en tu tienda: client id + secret, y el
//   panel pide un token temporal (24 h) con "client credentials".

const VERSION = process.env.SHOPIFY_API_VERSION ?? "2026-07";
const tokens = new Map<string, { token: string; vence: number }>();

const dominio = (d: string) => d.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

async function token(t: Tienda): Promise<string> {
  const c = t.shopify!;
  if (c.token) return c.token;
  if (!c.clientId || !c.clientSecret) throw new Error("Falta el token de Shopify (o el client id y secret) en Tiendas y conexiones.");
  const guardado = tokens.get(t.id);
  if (guardado && guardado.vence > Date.now() + 60_000) return guardado.token;
  const res = await fetch(`https://${dominio(c.dominio)}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.clientId, client_secret: c.clientSecret }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`Shopify no entregó el token (${res.status}): ${json.error_description ?? json.error ?? "revisa el client id y secret"}`);
  tokens.set(t.id, { token: json.access_token, vence: Date.now() + Number(json.expires_in ?? 3600) * 1000 });
  return json.access_token;
}

const CONSULTA = `query($q: String!, $after: String) {
  orders(first: 100, after: $after, query: $q, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      legacyResourceId name createdAt cancelledAt phone
      totalPriceSet { shopMoney { amount } }
      customer { firstName lastName phone }
      shippingAddress { name phone city }
      lineItems(first: 10) { nodes { title quantity } }
    }
  }
}`;

export async function traerPedidosShopify(t: Tienda, desde: string, hasta: string): Promise<PedidoShopify[]> {
  if (!t.shopify?.dominio) throw new Error("Esta tienda no tiene Shopify conectado.");
  const url = `https://${dominio(t.shopify.dominio)}/admin/api/${VERSION}/graphql.json`;
  const headers = { "Content-Type": "application/json", "X-Shopify-Access-Token": await token(t) };
  const q = `created_at:>=${desde} created_at:<=${hasta}T23:59:59`;
  const out: PedidoShopify[] = [];
  let after: string | null = null;
  for (;;) {
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query: CONSULTA, variables: { q, after } }) });
    const json: any = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) throw new Error("Shopify rechazó el acceso: revisa el token y que la app tenga el permiso read_orders.");
    if (!res.ok || json.errors) throw new Error(`Shopify respondió ${res.status}: ${JSON.stringify(json.errors ?? "").slice(0, 200)}`);
    const pagina = json.data.orders;
    for (const o of pagina.nodes) {
      const dir = o.shippingAddress ?? {};
      out.push({
        id: `${t.id}-${o.legacyResourceId}`,
        tiendaId: t.id,
        numero: o.name,
        creadoEn: o.createdAt,
        total: Number(o.totalPriceSet?.shopMoney?.amount ?? 0),
        cancelado: !!o.cancelledAt,
        cliente: dir.name ?? [o.customer?.firstName, o.customer?.lastName].filter(Boolean).join(" "),
        telefono: String(dir.phone ?? o.phone ?? o.customer?.phone ?? ""),
        ciudad: String(dir.city ?? ""),
        productos: o.lineItems.nodes.map((l: any) => (l.quantity > 1 ? `${l.title} x${l.quantity}` : l.title)).join(", "),
      });
    }
    if (!pagina.pageInfo.hasNextPage) return out;
    after = pagina.pageInfo.endCursor;
  }
}

// ---- Cruce Shopify ↔ Dropi ------------------------------------------------

const ultimos9 = (tel: string) => tel.replace(/\D/g, "").slice(-9);
const dias = (a: string, b: string) => Math.abs(new Date(a.slice(0, 10)).getTime() - new Date(b.slice(0, 10)).getTime()) / 864e5;

export interface Cruce {
  shopify: PedidoShopify;
  dropi: Pedido | null;
}

/**
 * Empareja cada pedido de Shopify con su pedido en Dropi: primero por el id que
 * Dropi guarda de la tienda de origen y, si no, por teléfono (±3 días).
 */
export function cruzar(shopify: PedidoShopify[], pedidos: Pedido[]): Cruce[] {
  const usados = new Set<string>();
  const porOrigen = new Map(pedidos.filter((p) => p.origenId).map((p) => [p.origenId!, p]));
  return shopify.map((s) => {
    const idShopify = s.id.split("-").pop()!;
    let d = porOrigen.get(idShopify) ?? porOrigen.get(s.numero.replace("#", "")) ?? null;
    if (!d && ultimos9(s.telefono).length === 9)
      d = pedidos.find((p) => !usados.has(p.id) && ultimos9(p.telefono) === ultimos9(s.telefono) && dias(p.creadoEn, s.creadoEn) <= 3) ?? null;
    if (d) usados.add(d.id);
    return { shopify: s, dropi: d };
  });
}

export function resumenShopify(cruces: Cruce[]) {
  const activos = cruces.filter((c) => !c.shopify.cancelado);
  const conDropi = activos.filter((c) => c.dropi);
  return {
    pedidos: cruces.length,
    cancelados: cruces.length - activos.length,
    conDropi: conDropi.length,
    sinDropi: activos.filter((c) => !c.dropi),
    tasaPaso: activos.length ? conDropi.length / activos.length : null,
    facturacion: activos.reduce((a, c) => a + c.shopify.total, 0),
  };
}
