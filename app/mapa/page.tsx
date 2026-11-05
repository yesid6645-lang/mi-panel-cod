import { leerTienda } from "@/lib/tiendas";
import { periodoDesdeParams } from "@/lib/periodo";
import { porZona, zonasRiesgo, type FilaZona } from "@/lib/logistica";
import { dinero, pct } from "@/lib/formato";
import { SelectorMes } from "@/components/SelectorMes";
import Link from "next/link";

export const dynamic = "force-dynamic";

const VISTAS = [
  ["provincia", "Por provincia"],
  ["ciudad", "Por ciudad"],
  ["transportadora", "Por transportadora"],
] as const;

export default async function Mapa({ searchParams }: { searchParams: Promise<{ mes?: string; por?: string; producto?: string }> }) {
  const sp = await searchParams;
  const { mes, periodo } = periodoDesdeParams(sp);
  const { db, tienda } = await leerTienda();
  const por = VISTAS.some(([k]) => k === sp.por) ? sp.por! : "provincia";
  const pedidos = sp.producto ? db.pedidos.filter((p) => p.productoId === sp.producto) : db.pedidos;
  const filas = porZona(pedidos, periodo, (p) => (por === "provincia" ? p.provincia : por === "ciudad" ? p.ciudad : p.transportadora));
  const riesgo = zonasRiesgo(filas);
  const transportadoras = porZona(pedidos, periodo, (p) => p.transportadora);
  const max = Math.max(1, ...filas.map((f) => f.pedidos));
  const url = (c: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ mes, por, producto: sp.producto, ...c }).filter(([, v]) => v) as [string, string][]);
    return `/mapa?${q}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="etiqueta">E-commerce</div>
          <h1 className="text-2xl font-semibold">Mapa logístico</h1>
          <p className="text-sm text-gray-500">Dónde se entrega y dónde se devuelve {tienda ? `· ${tienda.nombre}` : ""}</p>
        </div>
        <SelectorMes mes={mes} base="/mapa" />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {VISTAS.map(([k, l]) => (
          <Link key={k} href={url({ por: k })} className={`rounded-xl border px-4 py-2 text-sm ${por === k ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white"}`}>{l}</Link>
        ))}
        <form action="/mapa" className="ml-auto flex gap-2">
          <input type="hidden" name="mes" value={mes} />
          <input type="hidden" name="por" value={por} />
          <select name="producto" defaultValue={sp.producto ?? ""} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
            <option value="">Todos los productos</option>
            {db.productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white">Ver</button>
        </form>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="tarjeta space-y-3 p-5">
          <h2 className="font-semibold">⚠️ Zonas con más devolución</h2>
          <p className="text-xs text-gray-500">Con 4 o más pedidos terminados y 20% o más devueltos. Considera excluirlas de la pauta o despachar con otra transportadora.</p>
          {riesgo.length === 0 && <p className="py-4 text-center text-sm text-emerald-600">✓ Ninguna zona en riesgo este mes</p>}
          {riesgo.slice(0, 8).map((f) => (
            <div key={f.nombre} className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm">
              <span className="font-medium">{f.nombre}</span>
              <span className="text-red-600">{pct(f.pctDevolucion)} · {f.devoluciones} de {f.entregados + f.devoluciones}</span>
            </div>
          ))}
          <h2 className="pt-3 font-semibold">Transportadoras</h2>
          {transportadoras.map((f) => (
            <div key={f.nombre} className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="font-medium">{f.nombre}</span><span className="text-gray-500">{f.pedidos} pedidos</span></div>
              <Barra f={f} />
            </div>
          ))}
        </div>

        <div className="tarjeta overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
                {[VISTAS.find(([k]) => k === por)![1].replace("Por ", ""), "Pedidos", "Entrega / devolución", "% dev.", "En camino", "Facturación"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filas.map((f) => (
                <tr key={f.nombre}>
                  <td className="px-4 py-2.5 font-medium">{f.nombre}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${(f.pedidos / max) * 80}px` }} />
                      {f.pedidos}
                    </div>
                  </td>
                  <td className="w-48 px-4 py-2.5"><Barra f={f} /></td>
                  <td className={`px-4 py-2.5 font-semibold ${(f.pctDevolucion ?? 0) >= 0.2 ? "text-red-500" : (f.pctDevolucion ?? 0) >= 0.12 ? "text-amber-500" : "text-emerald-600"}`}>{pct(f.pctDevolucion)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{f.enCamino}</td>
                  <td className="px-4 py-2.5 tabular-nums">{dinero(f.facturacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filas.length === 0 && <p className="p-8 text-center text-sm text-gray-400">Sin pedidos en este mes.</p>}
        </div>
      </section>
      <p className="text-xs text-gray-400">El % de devolución se calcula sobre pedidos terminados (entregados + devueltos); los que siguen en camino no cuentan todavía.</p>
    </div>
  );
}

function Barra({ f }: { f: FilaZona }) {
  const t = f.entregados + f.devoluciones || 1;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-gray-100" title={`${f.entregados} entregados · ${f.devoluciones} devueltos`}>
      <div className="bg-emerald-500" style={{ width: `${(f.entregados / t) * 100}%` }} />
      <div className="bg-red-400" style={{ width: `${(f.devoluciones / t) * 100}%` }} />
    </div>
  );
}
