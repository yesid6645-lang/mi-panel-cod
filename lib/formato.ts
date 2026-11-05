import { cache } from "react";

const n2 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const n0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

// Moneda de la tienda que se está viendo, guardada por petición (cache de React
// dura lo que dura el render), así ningún componente tiene que recibirla.
const actual = cache(() => ({ moneda: "USD" }));
export const fijarMoneda = (moneda: string) => {
  actual().moneda = moneda;
};

const SIMBOLO: Record<string, string> = { USD: "US$", COP: "$", PEN: "S/", CLP: "$", MXN: "MX$", GTQ: "Q", ARS: "$", PYG: "₲" };
const SIN_DECIMALES = new Set(["COP", "CLP", "PYG", "ARS"]);

export const simboloMoneda = () => SIMBOLO[actual().moneda] ?? actual().moneda;

export const dinero = (x: number | null) => {
  if (x === null) return "—";
  const m = actual().moneda;
  const f = SIN_DECIMALES.has(m) ? n0 : n2;
  return `${x < 0 ? "-" : ""}${SIMBOLO[m] ?? m} ${f.format(Math.abs(x))}`;
};
export const pct = (x: number | null) => (x === null ? "—" : `${n1.format(x * 100)}%`);
export const veces = (x: number | null) => (x === null ? "—" : `${n2.format(x)}x`);
export const dec = (x: number | null, d = 1) =>
  x === null ? "—" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(x);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (yyyymm: string) => {
  const [y, m] = yyyymm.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
};
