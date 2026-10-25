const n2 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n1 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const usd = (x: number | null) => (x === null ? "—" : `${x < 0 ? "-" : ""}US$ ${n2.format(Math.abs(x))}`);
export const pct = (x: number | null) => (x === null ? "—" : `${n1.format(x * 100)}%`);
export const veces = (x: number | null) => (x === null ? "—" : `${n2.format(x)}x`);
export const dec = (x: number | null, d = 1) =>
  x === null ? "—" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: d }).format(x);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (yyyymm: string) => {
  const [y, m] = yyyymm.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
};
