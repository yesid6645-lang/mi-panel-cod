"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Punto = { fecha: string; [k: string]: number | string | null };
const dia = (f: string) => String(Number(f.slice(8)));
const eje = { fontSize: 11, fill: "#9ca3af" };

export function LineaDiaria({ datos, campo, color, promedio }: { datos: Punto[]; campo: string; color: string; promedio: number }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={datos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={dia} tick={eje} axisLine={false} tickLine={false} />
        <YAxis tick={eje} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip labelFormatter={(l) => String(l)} />
        <ReferenceLine y={promedio} stroke={color} strokeDasharray="5 5" label={{ value: `promedio ${promedio.toFixed(1)}/día`, position: "insideTopLeft", fontSize: 12, fill: color }} />
        <Area type="monotone" dataKey={campo} stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Barras de "margen por $1 de pauta": gris hasta $1, verde lo que sobra, naranja si no llega, rojo si es negativo. */
export function MargenPorDolar({ datos }: { datos: Punto[] }) {
  const filas = datos.map((d) => {
    const v = (d.margenPorDolar as number | null) ?? 0;
    return {
      fecha: d.fecha,
      recupera: v >= 1 ? 1 : 0,
      profit: v > 1 ? v - 1 : 0,
      noLlego: v > 0 && v < 1 ? v : 0,
      negativo: v < 0 ? v : 0,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={filas} stackOffset="sign" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={dia} tick={eje} axisLine={false} tickLine={false} />
        <YAxis tick={eje} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
        <ReferenceLine y={1} stroke="#9ca3af" strokeDasharray="4 4" />
        <Bar dataKey="recupera" stackId="a" fill="#d1d5db" name="Recuperas lo invertido" />
        <Bar dataKey="profit" stackId="a" fill="#10b981" name="Profit real" />
        <Bar dataKey="noLlego" stackId="a" fill="#f59e0b" name="No llegó a $1" />
        <Bar dataKey="negativo" stackId="a" fill="#ef4444" name="Perdiste" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Recuperacion({ datos, meta }: { datos: Punto[]; meta: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={datos} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f3f4f6" vertical={false} />
        <XAxis dataKey="fecha" tickFormatter={dia} tick={eje} axisLine={false} tickLine={false} />
        <YAxis tick={eje} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
        <Tooltip formatter={(v) => `US$ ${Number(v).toFixed(2)}`} />
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" label={{ value: "$0 · aquí recuperas lo invertido", position: "insideBottomLeft", fontSize: 11 }} />
        <ReferenceLine y={meta} stroke="#3b82f6" strokeDasharray="6 4" label={{ value: "meta ROI neto 1,0x", position: "insideTopRight", fontSize: 11, fill: "#3b82f6" }} />
        <Area type="monotone" dataKey="acumulado" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarrasSimples({ datos }: { datos: { nombre: string; valor: number; destacado?: boolean }[] }) {
  return (
    <ResponsiveContainer width="100%" height={datos.length * 34}>
      <BarChart data={datos} layout="vertical" margin={{ left: 0, right: 40 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="nombre" tick={eje} axisLine={false} tickLine={false} width={40} />
        <Bar dataKey="valor" radius={6} label={{ position: "right", fontSize: 12, formatter: (v: unknown) => Number(v).toFixed(1) }}>
          {datos.map((d) => (
            <Cell key={d.nombre} fill={d.destacado ? "#2563eb" : "#d1d5db"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
