"use client";

import { useState } from "react";
import type { Ayuda } from "@/lib/explicaciones";

/** Tarjeta que al hacer clic muestra cómo se calcula el indicador. */
export function Volteable({ titulo, ayuda, children }: { titulo: string; ayuda?: Ayuda; children: React.ReactNode }) {
  const [atras, setAtras] = useState(false);
  if (!ayuda) return <div className="tarjeta p-5">{children}</div>;
  return (
    <button
      type="button"
      onClick={() => setAtras(!atras)}
      title={atras ? "Volver" : "¿Cómo se calcula?"}
      className={`tarjeta relative flex w-full flex-col justify-start p-5 text-left transition hover:border-gray-300 ${atras ? "bg-blue-50/60" : ""}`}
    >
      <span className="absolute right-4 top-4 grid h-5 w-5 place-items-center rounded-full border border-gray-300 text-[11px] text-gray-400">
        {atras ? "↺" : "i"}
      </span>
      {atras ? (
        <div>
          <div className="etiqueta">{titulo}</div>
          <p className="mt-2 text-xs leading-relaxed text-gray-700">{ayuda.formula}</p>
          {ayuda.calculo && <p className="mt-2 rounded-lg bg-white/80 px-2 py-1 font-mono text-[11px] text-gray-600">{ayuda.calculo}</p>}
        </div>
      ) : (
        children
      )}
    </button>
  );
}
