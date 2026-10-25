import type { Gestion, Pedido } from "./types";

// Reglas para detectar pedidos que necesitan que hagas algo. Los días se
// cuentan desde el último movimiento que reporta Dropi.

export type TipoAlerta = "oficina" | "novedad" | "estancado" | "sinDespachar";

export const REGLAS: Record<TipoAlerta, { titulo: string; dias: number; etapa: string }> = {
  novedad: { titulo: "Novedad de la transportadora", dias: 0, etapa: "Entrega / Última milla" },
  oficina: { titulo: "Esperando retiro en agencia", dias: 2, etapa: "Entrega / Última milla" },
  estancado: { titulo: "Sin movimiento en tránsito", dias: 4, etapa: "Transporte" },
  sinDespachar: { titulo: "Sin despachar", dias: 2, etapa: "Preparación" },
};

// Dropi entrega fechas en hora de Ecuador sin zona horaria
const ECUADOR_MS = -5 * 3600e3;
const comoUtc = (local: string) => new Date(local.endsWith("Z") ? local : local + "Z").getTime() - ECUADOR_MS;

export function diasEnEstado(p: Pedido, ahora = Date.now()) {
  const desde = p.estadoDesde ?? p.ultimoMovimiento ?? p.creadoEn;
  return Math.max(0, Math.floor((ahora - comoUtc(desde)) / 864e5));
}

const esNovedad = (estado: string) => /NOVEDAD/i.test(estado) && !/SOLUCIONAD/i.test(estado);

export function tipoAlerta(p: Pedido, ahora = Date.now()): TipoAlerta | null {
  const dias = diasEnEstado(p, ahora);
  if (esNovedad(p.estado)) return "novedad";
  if (p.grupo === "oficina" && dias >= REGLAS.oficina.dias) return "oficina";
  if (p.grupo === "transito" && dias >= REGLAS.estancado.dias) return "estancado";
  if (p.grupo === "pendiente" && dias >= REGLAS.sinDespachar.dias) return "sinDespachar";
  return null;
}

export interface Alerta {
  pedido: Pedido;
  tipo: TipoAlerta | null; // null = ya no cumple la regla (Dropi la cerró)
  dias: number;
  gestion: Gestion;
  bandeja: "porAtender" | "esperando" | "finalizada";
}

/**
 * Pedidos con alerta activa, más los que tuvieron gestión y ya salieron de la
 * regla (entregado, devuelto…), que pasan a "Cerrada por Dropi".
 */
export function alertas(pedidos: Pedido[], gestiones: Record<string, Gestion> = {}, ahora = Date.now()): Alerta[] {
  const out: Alerta[] = [];
  for (const p of pedidos) {
    const tipo = tipoAlerta(p, ahora);
    const g = gestiones[p.id];
    if (!tipo && !g) continue;
    const gestion = g ?? { estado: "nuevo" as const, actualizado: p.ultimoMovimiento ?? p.creadoEn };
    const bandeja = !tipo || gestion.estado === "resuelta" ? "finalizada" : gestion.estado === "esperando" ? "esperando" : "porAtender";
    out.push({ pedido: p, tipo, dias: diasEnEstado(p, ahora), gestion, bandeja });
  }
  return out.sort((a, b) => b.dias - a.dias);
}

/** Link de WhatsApp con un mensaje listo según el tipo de alerta. */
export function linkWhatsapp(p: Pedido, tipo: TipoAlerta | null) {
  const tel = p.telefono.replace(/\D/g, "");
  const numero = tel.startsWith("593") ? tel : "593" + tel.replace(/^0/, "");
  const nombre = p.cliente.split(" ")[0] || "";
  const producto = p.productoNombre.toLowerCase();
  const textos: Record<TipoAlerta, string> = {
    oficina: `Hola ${nombre} 👋 Tu pedido de ${producto} ya está en la agencia ${p.transportadora} de ${p.ciudad}, listo para que lo retires${p.guia ? ` con la guía ${p.guia}` : ""}. ¿Cuándo puedes pasar por él?`,
    novedad: `Hola ${nombre} 👋 La transportadora reportó una novedad con tu pedido de ${producto}${p.guia ? ` (guía ${p.guia})` : ""}. ¿Nos confirmas tu dirección y un horario en que puedas recibirlo?`,
    estancado: `Hola ${nombre} 👋 Te escribimos para contarte que tu pedido de ${producto} va en camino. ¿Sigues en la misma dirección para la entrega?`,
    sinDespachar: `Hola ${nombre} 👋 Queremos confirmar tu pedido de ${producto} por US$ ${p.total.toFixed(2)} para despacharlo hoy. ¿Nos confirmas tu dirección?`,
  };
  const texto = tipo ? textos[tipo] : `Hola ${nombre} 👋 Te escribimos por tu pedido de ${producto}.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
