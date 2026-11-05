import { archivo } from "./almacen/archivo";
import { supabase } from "./almacen/supabase";

// Con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY se usa Supabase (panel publicado);
// sin ellas, el archivo data/db.json (panel en tu computador).
export const usaSupabase = () => !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
const almacen = () => (usaSupabase() ? supabase : archivo);

export const leer = (tiendaId?: string) => almacen().leer(tiendaId);
export const leerConfig = () => almacen().leerConfig();
export const guardarTienda: typeof archivo.guardarTienda = (t) => almacen().guardarTienda(t);
export const eliminarTienda: typeof archivo.eliminarTienda = (id) => almacen().eliminarTienda(id);
export const guardarProductos: typeof archivo.guardarProductos = (ps) => almacen().guardarProductos(ps);
export const guardarPedidos: typeof archivo.guardarPedidos = (ps) => almacen().guardarPedidos(ps);
export const reemplazarPauta: typeof archivo.reemplazarPauta = (...a) => almacen().reemplazarPauta(...a);
export const guardarGestion: typeof archivo.guardarGestion = (id, g) => almacen().guardarGestion(id, g);
export const guardarMeta: typeof archivo.guardarMeta = (m) => almacen().guardarMeta(m);
