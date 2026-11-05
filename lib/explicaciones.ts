import type { Resumen } from "./metrics";
import { dinero, pct } from "./formato";

// Qué significa cada indicador y la cuenta hecha con los números del período,
// para el reverso de las tarjetas (clic en la tarjeta).

export type ClaveKpi =
  | "facturacion"
  | "facturacionEntregada"
  | "bruta"
  | "esperada"
  | "confirmada"
  | "ventas"
  | "pctDevolucion"
  | "publicidad"
  | "costoDevoluciones"
  | "gastosTotales"
  | "devoluciones";

export interface Ayuda {
  formula: string;
  calculo?: string;
}

export function explicar(clave: ClaveKpi, r: Resumen): Ayuda {
  switch (clave) {
    case "facturacion":
      return {
        formula: "Suma de lo que paga el cliente en todos los pedidos creados en el período, sin cancelados. Incluye lo que aún está en camino.",
        calculo: `${r.ventas} pedidos = ${dinero(r.ingresos)}`,
      };
    case "facturacionEntregada":
      return {
        formula: "Suma de lo que paga el cliente solo en los pedidos ya entregados: el dinero que ya se recaudó.",
        calculo: `${r.entregados} entregados = ${dinero(r.facturacionEntregada)} · por cobrar ${dinero(r.facturacionEnCamino)}`,
      };
    case "bruta":
      return {
        formula: "Por cada pedido: precio de venta − costo del producto − flete. Se suman todos los pedidos del período, antes de publicidad y devoluciones.",
        calculo: `${dinero(r.ingresos)} facturado → ${dinero(r.bruta)} de ganancia bruta`,
      };
    case "esperada":
      return {
        formula: "Ganancia bruta − publicidad − costo de devoluciones. Es lo que quedaría si todo lo que está en camino se entrega.",
        calculo: `${dinero(r.bruta)} − ${dinero(r.publicidad)} − ${dinero(r.costoDevoluciones)} = ${dinero(r.esperada)}`,
      };
    case "confirmada":
      return {
        formula: "Ganancia solo de los pedidos entregados − publicidad − costo de devoluciones − fees (Fénix, Confío). Es la ganancia real hasta hoy.",
        calculo: `${dinero(r.margenEntregado)} − ${dinero(r.publicidad)} − ${dinero(r.costoDevoluciones)}${r.fees ? ` − ${dinero(r.fees)}` : ""} = ${dinero(r.confirmada)}`,
      };
    case "ventas":
      return {
        formula: "Pedidos creados en Dropi en el período, sin contar los cancelados.",
        calculo: `${r.entregados} entregados · ${r.enTransito} en tránsito · ${r.enOficina} en oficina · ${r.devoluciones} devueltos`,
      };
    case "pctDevolucion":
      return {
        formula: "Pedidos devueltos ÷ ventas del período. Menos es mejor.",
        calculo: `${r.devoluciones} ÷ ${r.ventas} = ${pct(r.pctDevolucion)}`,
      };
    case "publicidad":
      return {
        formula: "Gasto en Meta de las campañas asignadas a los productos de esta tienda, convertido a la moneda de la tienda.",
        calculo: r.publicidad ? `ROAS ${r.roas?.toFixed(2)}x = ${dinero(r.ingresos)} ÷ ${dinero(r.publicidad)}` : "Aún sin pauta: conecta Meta en Tiendas y conexiones.",
      };
    case "costoDevoluciones":
      return {
        formula: "Flete que se pierde por cada pedido devuelto.",
        calculo: `${r.devoluciones} devoluciones = ${dinero(r.costoDevoluciones)}`,
      };
    case "gastosTotales":
      return {
        formula: "Publicidad + costo de devoluciones.",
        calculo: `${dinero(r.publicidad)} + ${dinero(r.costoDevoluciones)} = ${dinero(r.gastosTotales)}`,
      };
    case "devoluciones":
      return {
        formula: "Pedidos creados en el período que hoy están en estado de devolución en Dropi.",
        calculo: `${r.devoluciones} de ${r.ventas} ventas (${pct(r.pctDevolucion)})`,
      };
  }
}
