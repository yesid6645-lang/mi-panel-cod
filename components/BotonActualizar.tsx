"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResultadoSync } from "@/lib/sync";

export function BotonActualizar({ desde, hasta, ultima }: { desde: string; hasta: string; ultima?: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [res, setRes] = useState<ResultadoSync | null>(null);

  async function actualizar() {
    setCargando(true);
    setRes(null);
    try {
      const r = await fetch("/api/actualizar", { method: "POST", body: JSON.stringify({ desde, hasta }) });
      setRes(await r.json());
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  const errores = [res?.dropi, res?.meta].filter((x) => x && !x.ok);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={actualizar}
        disabled={cargando}
        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {cargando ? "Actualizando…" : "↻ Actualizar Dropi y Meta"}
      </button>
      {ultima && !res && (
        <span className="text-xs text-gray-400">Última actualización: {ultima}</span>
      )}
      {res && errores.length === 0 && <span className="text-xs text-emerald-600">Listo: {res.dropi?.pedidos} pedidos actualizados</span>}
      {errores.map((e, i) => (
        <span key={i} className="max-w-sm text-right text-xs text-red-500">
          {e!.error}
        </span>
      ))}
    </div>
  );
}
