import Link from "next/link";
import { mesVecino } from "@/lib/periodo";
import { nombreMes } from "@/lib/formato";

export function SelectorMes({ mes, base }: { mes: string; base: string }) {
  const boton = "grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white hover:bg-gray-50";
  return (
    <div className="flex items-center gap-3">
      <Link href={`${base}?mes=${mesVecino(mes, -1)}`} className={boton} aria-label="Mes anterior">‹</Link>
      <span className="min-w-36 text-center font-medium first-letter:uppercase">{nombreMes(mes)}</span>
      <Link href={`${base}?mes=${mesVecino(mes, 1)}`} className={boton} aria-label="Mes siguiente">›</Link>
    </div>
  );
}
