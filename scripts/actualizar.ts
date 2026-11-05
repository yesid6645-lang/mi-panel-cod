// Lo mismo que el botón "Actualizar", desde la terminal, para todas las tiendas.
// Uso: npm run actualizar -- 2026-10-01 2026-10-25
import { leer } from "../lib/db";
import { actualizar } from "../lib/sync";

const hoy = new Date().toISOString().slice(0, 10);
const [desde = hoy.slice(0, 8) + "01", hasta = hoy] = process.argv.slice(2);
(async () => {
  for (const t of (await leer()).tiendas) console.log(t.nombre, JSON.stringify(await actualizar(t.id, { desde, hasta }), null, 2));
})();
