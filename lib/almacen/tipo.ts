import type { BaseDatos, ConexionMeta, Gestion, PautaDia, Pedido, Producto, Tienda } from "../types";

/**
 * Dónde se guardan los datos. En tu computador, un archivo JSON; publicado,
 * Supabase. Las pantallas no saben cuál se usa.
 */
export interface Almacen {
  /** Todo, o solo los productos/pedidos/pauta de una tienda (tiendas, Meta y gestiones siempre van completos). */
  leer(tiendaId?: string): Promise<BaseDatos>;
  /** Solo tiendas y conexión de Meta, para el menú. */
  leerConfig(): Promise<Pick<BaseDatos, "tiendas" | "meta">>;
  guardarTienda(t: Tienda): Promise<void>;
  eliminarTienda(id: string): Promise<void>;
  guardarProductos(ps: Producto[]): Promise<void>;
  guardarPedidos(ps: Pedido[]): Promise<void>;
  reemplazarPauta(tiendaId: string, desde: string, hasta: string, filas: PautaDia[]): Promise<void>;
  guardarGestion(pedidoId: string, g: Gestion): Promise<void>;
  guardarMeta(m: ConexionMeta | undefined): Promise<void>;
}
