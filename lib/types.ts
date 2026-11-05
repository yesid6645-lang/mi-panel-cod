// Modelo interno. Todo lo que llega de Dropi y Meta se traduce a estas formas,
// así las pantallas y las fórmulas no dependen de cómo responde cada API.

export type GrupoEstado =
  | "pendiente" // creado, aún sin guía o sin despachar
  | "transito" // en ruta con la transportadora
  | "oficina" // en oficina/agencia esperando retiro
  | "entregado"
  | "devolucion"
  | "cancelado";

export interface Pedido {
  id: string; // `${tiendaId}-${id de Dropi}`: los ids de Dropi se repiten entre países
  tiendaId: string;
  guia?: string;
  creadoEn: string; // ISO
  productoId: string;
  productoNombre: string;
  variante: string; // p. ej. "BELANI FORDYCE x2"
  unidades: number;
  total: number; // lo que paga el cliente, en la moneda de la tienda
  costoProducto: number; // costo de proveedor del pedido completo
  costoDropi?: number; // costoProducto tal como vino de Dropi, antes de aplicar tus costos
  otrosCostos?: number; // empaque, comisión de recaudo, etc. (de los costos del producto)
  flete: number; // flete de ida
  costoDevolucion: number; // flete de devolución (solo cuenta si se devuelve)
  fees: number; // Fénix, Confío u otros cobros que aplique Dropi
  estado: string; // texto tal cual lo da Dropi
  grupo: GrupoEstado;
  transportadora: string;
  ciudad: string;
  provincia?: string;
  cliente: string;
  telefono: string;
  ultimoMovimiento?: string; // ISO
  estadoDesde?: string; // ISO: desde cuándo está en el estado actual
}

export interface PautaDia {
  fecha: string; // YYYY-MM-DD
  tiendaId: string;
  productoId: string;
  gasto: number; // en la moneda de la tienda (convertido si la cuenta paga en otra)
  conversaciones: number;
}

/** Costos que tú defines para que la utilidad sea real (Dropi no los conoce). */
export interface CostosProducto {
  costoUnitario?: number; // reemplaza el precio de proveedor que manda Dropi
  extraPorPedido?: number; // empaque, Fénix, Confío u otros fijos por pedido
  comisionPct?: number; // % sobre el valor del pedido (p. ej. comisión de recaudo)
  costoDevolucion?: number; // reemplaza el flete perdido por cada devolución
}

export interface Producto {
  id: string; // `${tiendaId}-${id de Dropi}`
  tiendaId: string;
  nombre: string;
  // Campañas de Meta asignadas a mano en Configuración (ids). Si está vacío se
  // usan las palabras: el nombre de campaña contiene alguna de palabrasMeta.
  campanasMeta?: string[];
  palabrasMeta: string[];
  costos?: CostosProducto;
}

export interface CuentaMeta {
  id: string; // act_XXXX
  nombre: string;
  moneda: string;
}

/** Conexión hecha con "Conectar Meta" (inicio de sesión con Facebook). */
export interface ConexionMeta {
  token: string;
  expira: string; // ISO; el token de usuario dura ~60 días
  usuario?: string;
  cuentas: CuentaMeta[];
}

export type EstadoGestion = "nuevo" | "en_contacto" | "esperando" | "resuelta";

/** Seguimiento que tú le das a un pedido con alerta (no viene de Dropi). */
export interface Gestion {
  estado: EstadoGestion;
  nota?: string;
  actualizado: string; // ISO
}

/** Una tienda = un país, con su propia cuenta de Dropi y sus cuentas publicitarias. */
export interface Tienda {
  id: string;
  nombre: string;
  pais: string; // código ISO, ver PAISES
  moneda: string; // moneda en la que Dropi cobra (USD, COP…)
  dropiUrl: string;
  dropiToken?: string; // token de Dropi → Mis integraciones; nunca se muestra en pantalla
  cuentasMeta: string[]; // ids act_XXXX de esta tienda
  tasaPauta?: number; // unidades de la moneda de la pauta por 1 de la tienda (p. ej. 3900 COP por USD)
  tasaUsd?: number; // unidades de la moneda de la tienda por 1 USD, para la vista general
  ultimaActualizacion?: { dropi?: string; meta?: string };
}

export interface BaseDatos {
  tiendas: Tienda[];
  productos: Producto[];
  pedidos: Pedido[];
  pauta: PautaDia[];
  gestiones?: Record<string, Gestion>; // por id de pedido
  meta?: ConexionMeta;
}

export interface Periodo {
  desde: string; // YYYY-MM-DD inclusive
  hasta: string; // YYYY-MM-DD inclusive
}
