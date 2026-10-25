import { variacion } from "@/lib/metrics";
import { pct } from "@/lib/formato";

export function Kpi({
  titulo,
  valor,
  actual,
  anterior,
  menorEsMejor = false,
  nota,
}: {
  titulo: string;
  valor: string;
  actual?: number;
  anterior?: number;
  menorEsMejor?: boolean;
  nota?: string;
}) {
  const v = actual !== undefined && anterior !== undefined ? variacion(actual, anterior) : null;
  const bueno = v !== null && (menorEsMejor ? v <= 0 : v >= 0);
  return (
    <div className="tarjeta p-5">
      <div className="etiqueta">{titulo}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{valor}</div>
      {v !== null ? (
        <div className={`mt-1 text-xs ${bueno ? "text-emerald-600" : "text-red-500"}`}>
          {v >= 0 ? "↑" : "↓"} {pct(Math.abs(v))} <span className="text-gray-400">vs mes anterior</span>
        </div>
      ) : (
        nota && <div className="mt-1 text-xs text-gray-500">{nota}</div>
      )}
    </div>
  );
}
