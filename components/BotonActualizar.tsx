"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResultadoSync } from "@/lib/sync";

type Fuente = "dropi" | "meta" | "shopify";
const NOMBRE: Record<Fuente, string> = { dropi: "Dropi", meta: "Meta", shopify: "Shopify" };
const plata = (x: number) => x.toLocaleString("es-CO", { maximumFractionDigits: 2 });

/**
 * Actualiza cada fuente en una llamada aparte (en Netlify cada llamada tiene
 * ~10 s) y muestra qué trajo cada una o por qué falló.
 */
export function BotonActualizar({ tiendaId, desde, hasta, ultima }: { tiendaId?: string; desde: string; hasta: string; ultima?: string }) {
  const router = useRouter();
  const [paso, setPaso] = useState<Fuente | null>(null);
  const [res, setRes] = useState<ResultadoSync | null>(null);

  async function actualizar() {
    const total: ResultadoSync = {};
    setRes(null);
    for (const fuente of ["dropi", "meta", "shopify"] as Fuente[]) {
      setPaso(fuente);
      try {
        const r = await fetch("/api/actualizar", { method: "POST", body: JSON.stringify({ tiendaId, desde, hasta, fuente }) });
        const texto = await r.text();
        let json: ResultadoSync;
        try {
          json = JSON.parse(texto);
        } catch {
          // Netlify devuelve una página de error si la llamada pasa el límite de tiempo
          json = { [fuente]: { ok: false, error: r.status === 504 || r.status === 502 ? "Tardó demasiado (límite del servidor). Prueba un rango más corto." : `Error ${r.status} del servidor.` } };
        }
        Object.assign(total, json);
      } catch (e) {
        Object.assign(total, { [fuente]: { ok: false, error: (e as Error).message } });
      }
      setRes({ ...total });
    }
    setPaso(null);
    router.refresh();
  }

  const m = res?.meta;
  return (
    <div className="flex max-w-sm flex-col items-end gap-1 text-right">
      <button
        onClick={actualizar}
        disabled={!!paso || !tiendaId}
        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
      >
        {paso ? `Actualizando ${NOMBRE[paso]}…` : "↻ Actualizar"}
      </button>
      {ultima && !res && <span className="text-xs text-gray-400">Última actualización: {ultima}</span>}
      {res?.dropi && (
        <span className={`text-xs ${res.dropi.ok ? "text-emerald-600" : "text-red-500"}`}>
          Dropi: {res.dropi.ok ? `${res.dropi.pedidos} pedidos ✓` : res.dropi.error}
        </span>
      )}
      {m && (
        <span className={`text-xs ${m.ok ? "text-emerald-600" : "text-red-500"}`}>
          Meta: {m.ok ? `gasto ${plata(m.gastoTotal ?? 0)} ✓` : m.error}
        </span>
      )}
      {m?.ok && !!m.gastoSinAsignar && (
        <span className="text-xs text-amber-600">
          {plata(m.gastoSinAsignar)} de campañas sin producto ({m.campanasSinAsignar?.join(", ")}). Asígnalas en Tiendas y conexiones.
        </span>
      )}
      {res?.shopify && (
        <span className={`text-xs ${res.shopify.ok ? "text-emerald-600" : res.shopify.omitido ? "text-gray-400" : "text-red-500"}`}>
          Shopify: {res.shopify.ok ? `${res.shopify.pedidos} pedidos ✓` : res.shopify.error}
        </span>
      )}
    </div>
  );
}
