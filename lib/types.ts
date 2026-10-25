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
  id: string;
  guia?: string;
  creadoEn: string; // ISO
  productoId: string;
  productoNombre: string;
  variante: string; // p. ej. "BELANI FORDYCE x2"
  unidades: number;
  total: number; // lo que paga el cliente (USD)
  costoProducto: number; // costo de proveedor del pedido completo
  flete: number; // flete de ida
  costoDevolucion: number; // flete de devolución (solo cuenta si se devuelve)
  fees: number; // Fénix, Confío u otros cobros que aplique Dropi
  estado: string; // texto tal cual lo da Dropi
  grupo: GrupoEstado;
  transportadora: string;
  ciudad: string;
  cliente: string;
  telefono: string;
  ultimoMovimiento?: string; // ISO
  estadoDesde?: string; // ISO: desde cuándo está en el estado actual
}

export interface PautaDia {
  fecha: string; // YYYY-MM-DD
  productoId: string;
  gasto: number; // USD (ya convertido si la cuenta está en COP)
  conversaciones: number;
}

export interface Producto {
  id: string;
  nombre: string;
  // Palabras que identifican sus campañas en Meta (nombre de campaña contiene…)
  palabrasMeta: string[];
}

export type EstadoGestion = "nuevo" | "en_contacto" | "esperando" | "resuelta";

/** Seguimiento que tú le das a un pedido con alerta (no viene de Dropi). */
export interface Gestion {
  estado: EstadoGestion;
  nota?: string;
  actualizado: string; // ISO
}

export interface BaseDatos {
  productos: Producto[];
  pedidos: Pedido[];
  pauta: PautaDia[];
  gestiones?: Record<string, Gestion>; // por id de pedido
  ultimaActualizacion?: { dropi?: string; meta?: string };
}

export interface Periodo {
  desde: string; // YYYY-MM-DD inclusive
  hasta: string; // YYYY-MM-DD inclusive
}
