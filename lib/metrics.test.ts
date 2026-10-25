import { test } from "node:test";
import assert from "node:assert/strict";
import { resumen, decision } from "./metrics";
import type { Pedido, GrupoEstado } from "./types";

// Reconstruye los totales de Belani (oct 2026) vistos en WinTrack y comprueba
// que nuestras fórmulas dan exactamente lo mismo.

let n = 0;
function pedido(grupo: GrupoEstado, ganancia: number, total: number, costoDevolucion = 0): Pedido {
  const flete = 5;
  return {
    id: String(++n),
    creadoEn: `2026-10-${String((n % 24) + 1).padStart(2, "0")}T12:00:00Z`,
    productoId: "belani",
    productoNombre: "Belani",
    variante: "BELANI FORDYCE",
    unidades: 1,
    total,
    costoProducto: total - ganancia - flete,
    flete,
    costoDevolucion,
    fees: 0,
    estado: grupo.toUpperCase(),
    grupo,
    transportadora: "SERVIENTREGA",
    ciudad: "QUITO",
    cliente: "x",
    telefono: "0",
  };
}

const pedidos: Pedido[] = [
  ...Array.from({ length: 43 }, () => pedido("entregado", 12.7, 26.47)),
  pedido("entregado", 12.87, 26.47),
  ...Array.from({ length: 6 }, () => pedido("devolucion", 7.96, 26.47, 5.81)),
  pedido("devolucion", 7.96, 26.47, 5.82),
  ...Array.from({ length: 16 }, () => pedido("transito", 7.96, 26.47)),
  pedido("transito", 8.05, 1799.8 - 26.47 * 67),
];
const pauta = [{ fecha: "2026-10-10", productoId: "belani", gasto: 412.79, conversaciones: 959 }];
const r = resumen(pedidos, pauta, { desde: "2026-10-01", hasta: "2026-10-24" });
const cerca = (a: number | null, b: number, tol = 0.006) =>
  assert.ok(a !== null && Math.abs(a - b) < tol, `esperaba ${b}, obtuve ${a}`);

test("ganancias", () => {
  assert.equal(r.ventas, 68);
  cerca(r.bruta, 750.1);
  cerca(r.esperada, 296.63);
  cerca(r.confirmada, 105.5);
  cerca(r.gastosTotales, 453.47);
  cerca(r.costoDevoluciones, 40.68);
});

test("tasas y retornos", () => {
  cerca(r.pctDevolucion, 0.103, 0.001);
  cerca(r.roiEntregados, 0.26, 0.005);
  cerca(r.roas, 4.36, 0.005);
  cerca(r.roasEquilibrio, 2.54, 0.005);
  cerca(r.cpa, 6.07);
  cerca(r.cpaExitosa, 6.77);
  cerca(r.conversion, 0.071, 0.001);
  cerca(r.costoChat, 0.43);
  cerca(r.eficienciaPauta, 0.72, 0.005);
  cerca(r.brutaPorVenta, 11.03);
  assert.equal(r.sinDevolver, 61);
  assert.equal(r.dias, 24);
});

test("decisión", () => {
  assert.equal(decision(r).decision, "ESCALAR");
});
