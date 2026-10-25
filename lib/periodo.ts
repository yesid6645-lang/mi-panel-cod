import type { Periodo } from "./types";

/** Lee ?mes=YYYY-MM de la URL. El mes en curso se corta en hoy. */
export function periodoDesdeParams(sp: { mes?: string }): { mes: string; periodo: Periodo } {
  const hoy = new Date().toISOString().slice(0, 10);
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoy.slice(0, 7);
  const [y, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { mes, periodo: { desde: `${mes}-01`, hasta: ultimo < hoy ? ultimo : hoy } };
}

export function mesVecino(mes: string, delta: number) {
  const [y, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** El mismo tramo de días del mes anterior (1–24 oct → 1–24 sept), como compara WinTrack. */
export function mismoTramoMesAnterior(per: Periodo): Periodo {
  const corrido = (iso: string) => {
    const d = new Date(iso + "T00:00:00Z");
    const objetivo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
    const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)).getUTCDate();
    objetivo.setUTCDate(Math.min(d.getUTCDate(), fin));
    return objetivo.toISOString().slice(0, 10);
  };
  return { desde: corrido(per.desde), hasta: corrido(per.hasta) };
}

/** Últimos n días que terminan `atras` días antes del final del período (para "7d vs 7d"). */
export function ventana(per: Periodo, n: number, atras: number): Periodo {
  const fin = new Date(per.hasta + "T00:00:00Z");
  fin.setUTCDate(fin.getUTCDate() - atras);
  const ini = new Date(fin);
  ini.setUTCDate(ini.getUTCDate() - (n - 1));
  return { desde: ini.toISOString().slice(0, 10), hasta: fin.toISOString().slice(0, 10) };
}
