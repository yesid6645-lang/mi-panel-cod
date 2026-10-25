import type { GrupoEstado } from "./types";

// Agrupa el texto de estado de Dropi en las 6 etapas que usan las pantallas.
// El orden importa: "PARA RETIRO EN AGENCIA" debe caer en oficina antes que tránsito.
const REGLAS: [RegExp, GrupoEstado][] = [
  [/CANCEL|RECHAZ|ANULAD/, "cancelado"],
  [/DEVOL|DEVUELT|RETORN/, "devolucion"],
  [/^ENTREGAD|ENTREGADO$/, "entregado"],
  [/OFICINA|AGENCIA|RETIRO|RECLAM/, "oficina"],
  [/PENDIENTE|GUIA.?GENERADA|PREPARAD|POR.?DESPACHAR|SIN.?GUIA/, "pendiente"],
];

export function agruparEstado(estado: string): GrupoEstado {
  const e = estado.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [re, grupo] of REGLAS) if (re.test(e)) return grupo;
  return "transito";
}
