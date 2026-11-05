import path from "node:path";
import { fileURLToPath } from "node:url";

// Fija la carpeta del proyecto para que Next no la confunda si hay otro
// package-lock.json más arriba (p. ej. en la carpeta de usuario).
const raiz = path.dirname(fileURLToPath(import.meta.url));

export default { outputFileTracingRoot: raiz };
