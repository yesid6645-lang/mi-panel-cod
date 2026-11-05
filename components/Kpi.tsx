import { variacion } from "@/lib/metrics";
import { pct } from "@/lib/formato";
import type { Ayuda } from "@/lib/explicaciones";
import { Volteable } from "./Volteable";

export function Kpi({
  titulo,
  valor,
  actual,
  anterior,
  menorEsMejor = false,
  nota,
  ayuda,
}: {
  titulo: string;
  valor: string;
  actual?: number;
  anterior?: number;
  menorEsMejor?: boolean;
  nota?: string;
  ayuda?: Ayuda; // si viene, la tarjeta se voltea al hacer clic y explica el cálculo
}) {
  const v = actual !== undefined && anterior !== undefined ? variacion(actual, anterior) : null;
  const bueno = v !== null && (menorEsMejor ? v <= 0 : v >= 0);
  return (
    <Volteable titulo={titulo} ayuda={ayuda}>
      <div className="etiqueta pr-6">{titulo}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{valor}</div>
      {v !== null ? (
        <div className={`mt-1 text-xs ${bueno ? "text-emerald-600" : "text-red-500"}`}>
          {v >= 0 ? "↑" : "↓"} {pct(Math.abs(v))} <span className="text-gray-400">vs mes anterior</span>
        </div>
      ) : (
        nota && <div className="mt-1 text-xs text-gray-500">{nota}</div>
      )}
    </Volteable>
  );
}
