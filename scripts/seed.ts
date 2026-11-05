// Agrega una "Tienda demo" con datos de ejemplo (sept–oct 2026) para ver el
// panel sin conectar nada. No toca las tiendas reales. Uso: npm run seed
import { leer, guardar } from "../lib/db";
import { agruparEstado } from "../lib/estados";
import type { BaseDatos, Pedido, PautaDia } from "../lib/types";

let semilla = 7;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
const elegir = <T>(xs: T[]) => xs[Math.floor(azar() * xs.length)];

const T = "demo";
const productos = [
  { id: "demo-belani", nombre: "Belani", palabrasMeta: ["belani"], precio: [25, 35, 45], costo: 6, ventasDia: 3, chatsPorVenta: 14, cpa: 6 },
  { id: "demo-gmmy", nombre: "Gmmy", palabrasMeta: ["gmmy"], precio: [29, 49], costo: 7, ventasDia: 0.6, chatsPorVenta: 2, cpa: 0.2 },
];
const ciudades = ["QUITO", "GUAYAQUIL", "CUENCA", "MANTA", "AMBATO", "LOJA", "SANTO DOMINGO", "MACHALA"];
const transportadoras = ["SERVIENTREGA", "GINTRACOM", "LAAR"];
const nombres = ["Maria Rodas", "Pincay Byron", "Juan Pablo Gomez", "Rogger Ramón", "Daniel Terán", "Lady Rosero", "Carla Vera", "Luis Mora"];

const hoy = new Date("2026-10-24T18:00:00Z");
const pedidos: Pedido[] = [];
const pauta: PautaDia[] = [];
let id = 189900000;

for (let d = new Date("2026-09-01T00:00:00Z"); d <= hoy; d.setUTCDate(d.getUTCDate() + 1)) {
  const fecha = d.toISOString().slice(0, 10);
  const edadDias = (hoy.getTime() - d.getTime()) / 864e5;
  for (const p of productos) {
    const n = Math.round(p.ventasDia * (0.3 + azar() * 1.4));
    for (let i = 0; i < n; i++) {
      const variante = azar() < 0.86 ? 0 : azar() < 0.9 ? 1 : 2;
      const unidades = variante + 1;
      const total = p.precio[Math.min(variante, p.precio.length - 1)];
      // Pedidos viejos ya terminaron; los recientes siguen en camino
      const r = azar();
      const estado =
        edadDias > 8
          ? r < 0.88 ? "ENTREGADO" : r < 0.98 ? "DEVOLUCION" : "CANCELADO"
          : r < 0.35 ? "ENTREGADO" : r < 0.7 ? "EN REPARTO" : r < 0.82 ? "PARA RETIRO EN AGENCIA SERVIENTREGA" : r < 0.9 ? "GUIA GENERADA" : "DEVOLUCION";
      const creado = new Date(d.getTime() + azar() * 864e5);
      const mov = new Date(Math.min(hoy.getTime(), creado.getTime() + (1 + azar() * 6) * 864e5));
      pedidos.push({
        id: `${T}-${++id}`,
        tiendaId: T,
        guia: "D00" + (2100000 + id % 100000),
        creadoEn: creado.toISOString(),
        productoId: p.id,
        productoNombre: p.nombre,
        variante: `${p.nombre.toUpperCase()} FORDYCE${unidades > 1 ? " x" + unidades : ""}`,
        unidades,
        total,
        costoProducto: p.costo * unidades,
        flete: 5 + Math.round(azar() * 200) / 100,
        costoDevolucion: 5.8,
        fees: 0,
        estado,
        grupo: agruparEstado(estado),
        transportadora: elegir(transportadoras),
        ciudad: elegir(ciudades),
        cliente: elegir(nombres),
        telefono: "09" + Math.floor(10000000 + azar() * 89999999),
        ultimoMovimiento: mov.toISOString(),
        estadoDesde: mov.toISOString(),
      });
    }
    const gasto = Math.round(p.ventasDia * p.cpa * (0.6 + azar() * 0.8) * 100) / 100;
    pauta.push({ fecha, tiendaId: T, productoId: p.id, gasto, conversaciones: Math.round(p.ventasDia * p.chatsPorVenta * (0.6 + azar() * 0.8)) });
  }
}

(async () => {
  const db: BaseDatos = await leer();
  const fuera = <X extends { tiendaId: string }>(xs: X[]) => xs.filter((x) => x.tiendaId !== T);
  db.tiendas = [
    ...db.tiendas.filter((t) => t.id !== T),
    { id: T, nombre: "Tienda demo", pais: "EC", moneda: "USD", dropiUrl: "", cuentasMeta: [], ultimaActualizacion: { dropi: hoy.toISOString() } },
  ];
  db.productos = [...fuera(db.productos), ...productos.map(({ id, nombre, palabrasMeta }) => ({ id, tiendaId: T, nombre, palabrasMeta }))];
  db.pedidos = [...fuera(db.pedidos), ...pedidos];
  db.pauta = [...fuera(db.pauta), ...pauta];
  await guardar(db);
  console.log(`Tienda demo: ${pedidos.length} pedidos, ${pauta.length} días de pauta.`);
})();
