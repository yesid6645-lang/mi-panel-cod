// Copia lo que tienes en data/db.json (tu computador) a Supabase: tiendas,
// tokens, costos, pedidos, pauta, gestiones y la conexión de Meta.
// Uso: pon SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local y corre `npm run subir`.
import { archivo } from "../lib/almacen/archivo";
import { supabase } from "../lib/almacen/supabase";

(async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  const db = await archivo.leer();
  for (const t of db.tiendas) await supabase.guardarTienda(t);
  await supabase.guardarProductos(db.productos);
  await supabase.guardarPedidos(db.pedidos);
  await supabase.guardarPedidosShopify(db.pedidosShopify ?? []);
  for (const t of db.tiendas) await supabase.reemplazarPauta(t.id, "2000-01-01", "2100-01-01", db.pauta.filter((x) => x.tiendaId === t.id));
  for (const [id, g] of Object.entries(db.gestiones ?? {})) await supabase.guardarGestion(id, g);
  if (db.meta) await supabase.guardarMeta(db.meta);
  console.log(`Subido: ${db.tiendas.length} tiendas, ${db.productos.length} productos, ${db.pedidos.length} pedidos, ${db.pauta.length} días de pauta.`);
})();
