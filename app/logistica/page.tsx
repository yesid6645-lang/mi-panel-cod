import Link from "next/link";
import { leer } from "@/lib/db";
import { alertas, linkWhatsapp, diasEnEstado, REGLAS, type Alerta } from "@/lib/alertas";
import type { EstadoGestion, GrupoEstado, Pedido } from "@/lib/types";
import { usd } from "@/lib/formato";
import { BotonActualizar } from "@/components/BotonActualizar";
import { cambiarGestion } from "./acciones";

export const dynamic = "force-dynamic";

type Params = { tab?: string; bandeja?: string; q?: string; grupo?: string; transp?: string; fin?: string };

const GESTION: Record<EstadoGestion, [string, string]> = {
  nuevo: ["Nuevo", "bg-blue-500"],
  en_contacto: ["En contacto", "bg-cyan-500"],
  esperando: ["Esperando", "bg-amber-500"],
  resuelta: ["Gestión resuelta", "bg-emerald-500"],
};

const GRUPO: Record<GrupoEstado, [string, string]> = {
  pendiente: ["Por despachar", "text-gray-600"],
  transito: ["En tránsito", "text-blue-600"],
  oficina: ["En oficina", "text-amber-600"],
  entregado: ["Entregado", "text-emerald-600"],
  devolucion: ["Devolución", "text-red-500"],
  cancelado: ["Cancelado", "text-gray-400"],
};

const BANDEJAS = [
  ["porAtender", "Por atender"],
  ["esperando", "Esperando"],
  ["finalizada", "Finalizados"],
  ["todas", "Todos"],
] as const;

function coincide(p: Pedido, q: string) {
  const t = q.toLowerCase();
  return [p.guia, p.id, p.cliente, p.telefono, p.productoNombre, p.ciudad, p.estado].some((x) => x?.toLowerCase().includes(t));
}

const url = (sp: Params, cambios: Partial<Params>) => {
  const u = new URLSearchParams(Object.entries({ ...sp, ...cambios }).filter(([, v]) => v) as [string, string][]);
  return `/logistica?${u}`;
};

export default async function Logistica({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const tab = sp.tab === "ordenes" ? "ordenes" : "alertas";
  const db = await leer();
  const hoy = new Date().toISOString().slice(0, 10);
  const todas = alertas(db.pedidos, db.gestiones);
  const transportadoras = [...new Set(db.pedidos.map((p) => p.transportadora).filter(Boolean))].sort();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="etiqueta">E-commerce</div>
          <h1 className="text-2xl font-semibold">Gestión logística</h1>
          <p className="text-sm text-gray-500">Sigue tus pedidos y atiende las alertas.</p>
        </div>
        <BotonActualizar
          desde={new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10)}
          hasta={hoy}
          ultima={db.ultimaActualizacion?.dropi && new Date(db.ultimaActualizacion.dropi).toLocaleString("es-CO", { timeZone: "America/Guayaquil" })}
        />
      </header>

      <nav className="flex gap-6 border-b border-gray-200 text-sm">
        {[["alertas", `Alertas (${todas.filter((a) => a.bandeja !== "finalizada").length})`], ["ordenes", "Todas las órdenes"]].map(([k, l]) => (
          <Link key={k} href={url({}, { tab: k })} className={`-mb-px border-b-2 pb-3 ${tab === k ? "border-blue-600 font-medium text-blue-600" : "border-transparent text-gray-600"}`}>
            {l}
          </Link>
        ))}
      </nav>

      {tab === "alertas" ? <Alertas todas={todas} sp={sp} transportadoras={transportadoras} /> : <Ordenes pedidos={db.pedidos} sp={sp} transportadoras={transportadoras} />}
    </div>
  );
}

function Filtros({ sp, transportadoras, conGrupo }: { sp: Params; transportadoras: string[]; conGrupo?: boolean }) {
  const campo = "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm";
  return (
    <form className="flex flex-wrap gap-3" action="/logistica">
      <input type="hidden" name="tab" value={sp.tab ?? "alertas"} />
      {sp.bandeja && <input type="hidden" name="bandeja" value={sp.bandeja} />}
      <input name="q" defaultValue={sp.q} placeholder="Buscar guía, cliente, teléfono, producto, ciudad o estado…" className={`${campo} min-w-64 flex-1`} />
      {conGrupo && (
        <select name="grupo" defaultValue={sp.grupo ?? ""} className={campo}>
          <option value="">Todos los estados</option>
          {Object.entries(GRUPO).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      )}
      <select name="transp" defaultValue={sp.transp ?? ""} className={campo}>
        <option value="">Todas las transportadoras</option>
        {transportadoras.map((t) => <option key={t}>{t}</option>)}
      </select>
      {conGrupo && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="fin" value="1" defaultChecked={sp.fin !== "0"} /> Incluir finalizados
        </label>
      )}
      <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white">Filtrar</button>
    </form>
  );
}

function Alertas({ todas, sp, transportadoras }: { todas: Alerta[]; sp: Params; transportadoras: string[] }) {
  const bandeja = BANDEJAS.some(([k]) => k === sp.bandeja) ? sp.bandeja! : "porAtender";
  const filtradas = todas
    .filter((a) => bandeja === "todas" || a.bandeja === bandeja)
    .filter((a) => !sp.q || coincide(a.pedido, sp.q))
    .filter((a) => !sp.transp || a.pedido.transportadora === sp.transp);
  const cuenta = (e: EstadoGestion) => todas.filter((a) => a.tipo && a.gestion.estado === e).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span>● Alertas activas <b>{todas.filter((a) => a.tipo).length}</b></span>
        {(Object.keys(GESTION) as EstadoGestion[]).map((e) => (
          <span key={e} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${GESTION[e][1]}`} />{GESTION[e][0]} <b>{cuenta(e)}</b></span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-500" />Cerrada por Dropi <b>{todas.filter((a) => !a.tipo).length}</b></span>
      </div>

      <div className="flex flex-wrap gap-2">
        {BANDEJAS.map(([k, l]) => {
          const n = k === "todas" ? todas.length : todas.filter((a) => a.bandeja === k).length;
          return (
            <Link key={k} href={url(sp, { tab: "alertas", bandeja: k })} className={`rounded-xl border px-4 py-2 text-sm ${bandeja === k ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white"}`}>
              {l} {n}
            </Link>
          );
        })}
      </div>

      <Filtros sp={{ ...sp, tab: "alertas", bandeja }} transportadoras={transportadoras} />

      <div className="tarjeta divide-y divide-gray-100">
        {filtradas.length === 0 && <div className="p-8 text-center text-sm text-gray-500">✓ Todo bajo control: no hay pedidos en esta bandeja.</div>}
        {filtradas.map((a) => (
          <div key={a.pedido.id} className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr_1.4fr_auto] md:items-center">
            <div>
              <div className="font-medium">{a.pedido.cliente || "Sin nombre"}</div>
              <div className="text-sm text-blue-600">{a.pedido.telefono}</div>
              <div className="text-xs text-gray-400">{a.pedido.ciudad}</div>
            </div>
            <div>
              <div className="font-medium">#{a.pedido.guia ?? a.pedido.id}</div>
              <div className="text-sm text-gray-500">{a.pedido.productoNombre} · {usd(a.pedido.total)}</div>
              <div className="text-xs text-gray-400">{a.pedido.transportadora}</div>
            </div>
            <div>
              <div className="text-sm font-medium">{a.pedido.estado}</div>
              <div className={`text-xs ${a.dias >= 4 ? "text-red-500" : "text-amber-600"}`}>{a.dias} días en este estado</div>
              <div className="text-xs text-gray-500">{a.tipo ? REGLAS[a.tipo].titulo : "Cerrada por Dropi"}</div>
              {a.gestion.nota && <div className="mt-1 text-xs italic text-gray-500">“{a.gestion.nota}”</div>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href={linkWhatsapp(a.pedido, a.tipo)} target="_blank" rel="noreferrer" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-100">
                WhatsApp
              </a>
              <form action={cambiarGestion} className="flex gap-1">
                <input type="hidden" name="id" value={a.pedido.id} />
                <select name="estado" defaultValue={a.gestion.estado} className="rounded-xl border border-gray-200 px-2 py-2 text-sm">
                  {(Object.keys(GESTION) as EstadoGestion[]).map((e) => <option key={e} value={e}>{GESTION[e][0]}</option>)}
                </select>
                <input name="nota" defaultValue={a.gestion.nota} placeholder="Nota" className="w-28 rounded-xl border border-gray-200 px-2 py-2 text-sm" />
                <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white">Guardar</button>
              </form>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Reglas: novedad sin solucionar · {REGLAS.oficina.dias}+ días en agencia · {REGLAS.estancado.dias}+ días sin movimiento en tránsito · {REGLAS.sinDespachar.dias}+ días sin despachar.
      </p>
    </div>
  );
}

function Ordenes({ pedidos, sp, transportadoras }: { pedidos: Pedido[]; sp: Params; transportadoras: string[] }) {
  const terminados: GrupoEstado[] = ["entregado", "devolucion", "cancelado"];
  const lista = pedidos
    .filter((p) => sp.fin !== "0" || !terminados.includes(p.grupo))
    .filter((p) => !sp.grupo || p.grupo === sp.grupo)
    .filter((p) => !sp.transp || p.transportadora === sp.transp)
    .filter((p) => !sp.q || coincide(p, sp.q))
    .sort((a, b) => (b.ultimoMovimiento ?? b.creadoEn).localeCompare(a.ultimoMovimiento ?? a.creadoEn));
  const visibles = lista.slice(0, 100);

  return (
    <div className="space-y-5">
      <Filtros sp={{ ...sp, tab: "ordenes" }} transportadoras={transportadoras} conGrupo />
      <p className="text-sm text-gray-500">Mostrando <b>{visibles.length}</b> de {lista.length} órdenes guardadas.</p>
      <div className="tarjeta overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
              {["Cliente", "Guía y producto", "Estado de la orden", "Transportadora", "Total"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3"><div className="font-medium">{p.cliente}</div><div className="text-gray-500">{p.telefono}</div></td>
                <td className="px-4 py-3"><div className="font-medium">#{p.guia ?? p.id}</div><div className="text-gray-500">{p.productoNombre}{p.unidades > 1 ? ` x${p.unidades}` : ""}</div></td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.estado}</div>
                  <div className={`text-xs ${GRUPO[p.grupo][1]}`}>{GRUPO[p.grupo][0]}</div>
                  {p.ultimoMovimiento && <div className="text-xs text-gray-400">Último movimiento: {p.ultimoMovimiento.slice(0, 16).replace("T", " ")} · {diasEnEstado(p)} días</div>}
                </td>
                <td className="px-4 py-3">{p.transportadora}<div className="text-xs text-gray-400">{p.ciudad}</div></td>
                <td className="px-4 py-3 tabular-nums">{usd(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
