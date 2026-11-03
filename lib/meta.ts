import type { ConexionMeta, CuentaMeta, PautaDia, Producto } from "./types";

// Meta Ads: conexión por inicio de sesión con Facebook (como WinTrack) y lectura
// del gasto diario y los chats por campaña, asignados a cada producto.

const VERSION = process.env.META_GRAPH_VERSION ?? "v24.0";
const GRAPH = `https://graph.facebook.com/${VERSION}`;
const ACCION_CHAT = "onsite_conversion.messaging_conversation_started_7d";
export const DIAS_AVISO = 7;

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const redirectUri = () => `${appUrl()}/api/meta/callback`;

function credencialesApp() {
  const id = process.env.META_APP_ID;
  const secreto = process.env.META_APP_SECRET;
  if (!id || !secreto) throw new Error("Faltan META_APP_ID o META_APP_SECRET en .env.local (ver README).");
  return { id, secreto };
}

async function graph(ruta: string, params: Record<string, string>, token?: string) {
  const url = ruta.startsWith("http") ? ruta : `${GRAPH}${ruta}?${new URLSearchParams(params)}`;
  // Sin token propio, en el entorno de Claude lo agrega la red (secreto Bearer)
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const json: any = await res.json();
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    if (e.code === 190) throw new Error("El permiso de Meta venció o fue revocado: dale a Conectar Meta otra vez.");
    throw new Error(`Meta respondió ${res.status}: ${e.message ?? ""}`);
  }
  return json;
}

/** Junta todas las páginas de un listado de la Graph API. */
async function todo(ruta: string, params: Record<string, string>, token?: string) {
  const filas: any[] = [];
  let json = await graph(ruta, params, token);
  for (;;) {
    filas.push(...(json.data ?? []));
    if (!json.paging?.next) return filas;
    json = await graph(json.paging.next, {}, token);
  }
}

// ---- Inicio de sesión ----------------------------------------------------

export function urlLogin(state: string) {
  const { id } = credencialesApp();
  // Las apps tipo Empresa usan "Inicio de sesión con Facebook para empresas", que
  // pide el id de una configuración en vez de la lista de permisos.
  const config = process.env.META_LOGIN_CONFIG_ID;
  return `https://www.facebook.com/${VERSION}/dialog/oauth?${new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(),
    state,
    response_type: "code",
    ...(config ? { config_id: config } : { scope: "ads_read" }),
  })}`;
}

/** Cambia el código del login por un token de larga duración (~60 días) y lee tus cuentas. */
export async function conectar(codigo: string): Promise<ConexionMeta> {
  const { id, secreto } = credencialesApp();
  const corto = await graph("/oauth/access_token", {
    client_id: id,
    client_secret: secreto,
    redirect_uri: redirectUri(),
    code: codigo,
  });
  const largo = await graph("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: id,
    client_secret: secreto,
    fb_exchange_token: corto.access_token,
  });
  const token: string = largo.access_token;
  const segundos = Number(largo.expires_in ?? 60 * 86400);
  const yo = await graph("/me", { fields: "name" }, token);
  return {
    token,
    expira: new Date(Date.now() + segundos * 1000).toISOString(),
    usuario: yo.name,
    cuentas: await listarCuentas(token),
  };
}

export async function listarCuentas(token?: string): Promise<CuentaMeta[]> {
  const filas = await todo("/me/adaccounts", { fields: "name,currency,account_status", limit: "100" }, token);
  return filas.map((c) => ({ id: c.id, nombre: c.name, moneda: c.currency }));
}

export function diasParaVencer(conexion?: ConexionMeta) {
  if (!conexion) return null;
  return Math.ceil((new Date(conexion.expira).getTime() - Date.now()) / 864e5);
}

// ---- Campañas y pauta ----------------------------------------------------

function origen(conexion?: ConexionMeta) {
  const token = conexion?.token ?? process.env.META_ACCESS_TOKEN;
  const cuentas: CuentaMeta[] = conexion?.cuentas.length
    ? conexion.cuentas
    : (process.env.META_AD_ACCOUNT_ID ?? "").split(",").filter(Boolean).map((id) => ({ id: id.trim(), nombre: id.trim(), moneda: "" }));
  if (!cuentas.length) throw new Error("Meta no está conectado: ve a Configuración y dale a Conectar Meta.");
  return { token, cuentas };
}

export interface Campana {
  id: string;
  nombre: string;
  estado: string;
  cuenta: string;
}

export async function listarCampanas(conexion?: ConexionMeta): Promise<Campana[]> {
  const { token, cuentas } = origen(conexion);
  const out: Campana[] = [];
  for (const c of cuentas) {
    const filas = await todo(`/${c.id}/campaigns`, { fields: "name,effective_status", limit: "200" }, token);
    out.push(...filas.map((f) => ({ id: f.id, nombre: f.name, estado: f.effective_status, cuenta: c.nombre })));
  }
  return out;
}

function productoDeCampana(productos: Producto[], id: string, nombre: string) {
  return (
    productos.find((p) => p.campanasMeta?.includes(id)) ??
    productos.find((p) => !p.campanasMeta?.length && p.palabrasMeta.some((w) => nombre.toLowerCase().includes(w.toLowerCase())))
  );
}

export async function traerPauta(desde: string, hasta: string, productos: Producto[], conexion?: ConexionMeta): Promise<PautaDia[]> {
  const { token, cuentas } = origen(conexion);
  const copPorUsd = Number(process.env.COP_PER_USD ?? 4000);
  const porClave = new Map<string, PautaDia>();

  for (const cuenta of cuentas) {
    const filas = await todo(
      `/${cuenta.id}/insights`,
      {
        level: "campaign",
        time_increment: "1",
        time_range: JSON.stringify({ since: desde, until: hasta }),
        fields: "campaign_id,campaign_name,spend,actions,account_currency",
        limit: "500",
      },
      token,
    );
    for (const fila of filas) {
      const producto = productoDeCampana(productos, fila.campaign_id, fila.campaign_name);
      if (!producto) continue;
      const gasto = Number(fila.spend) / (fila.account_currency === "COP" ? copPorUsd : 1);
      const chats = Number(fila.actions?.find((a: any) => a.action_type === ACCION_CHAT)?.value ?? 0);
      const clave = `${fila.date_start}|${producto.id}`;
      const previo = porClave.get(clave) ?? { fecha: fila.date_start, productoId: producto.id, gasto: 0, conversaciones: 0 };
      previo.gasto += gasto;
      previo.conversaciones += chats;
      porClave.set(clave, previo);
    }
  }
  return [...porClave.values()];
}
