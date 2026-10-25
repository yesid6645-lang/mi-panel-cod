// Lo mismo que el botón "Actualizar", desde la terminal.
// Uso: npm run actualizar -- 2026-10-01 2026-10-25
import { actualizar } from "../lib/sync";

const hoy = new Date().toISOString().slice(0, 10);
const [desde = hoy.slice(0, 8) + "01", hasta = hoy] = process.argv.slice(2);
actualizar({ desde, hasta }).then((r) => console.log(JSON.stringify(r, null, 2)));
