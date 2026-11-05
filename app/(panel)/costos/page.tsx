import { leerTienda } from "@/lib/tiendas";
import { leer } from "@/lib/db";
import { costoUnitarioDropi } from "@/lib/costos";
import { gananciaPedido, ventasDelPeriodo } from "@/lib/metrics";
import { periodoDesdeParams } from "@/lib/periodo";
import { dinero } from "@/lib/formato";
import { guardarCostos } from "./acciones";

export const dynamic = "force-dynamic";

const campo = "w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm tabular-nums";

export default async function Costos() {
  const { db, tienda } = await leerTienda();
  const crudos = tienda ? (await leer(tienda.id)).pedidos : [];
  const { periodo } = periodoDesdeParams({});

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <div className="etiqueta">E-commerce</div>
        <h1 className="text-2xl font-semibold">Costos por producto</h1>
        <p className="max-w-3xl text-sm text-gray-500">
          Dropi solo conoce el precio de proveedor y el flete. Aquí agregas lo demás para que la ganancia sea real. Deja vacío lo que no aplique: se usa lo de Dropi. Los cambios se aplican a todo el historial.
        </p>
      </header>

      {!tienda || db.productos.length === 0 ? (
        <div className="tarjeta p-6 text-sm text-gray-500">Primero trae los productos con “Actualizar Dropi y Meta”.</div>
      ) : (
        <form action={guardarCostos} className="space-y-4">
          <input type="hidden" name="tiendaId" value={tienda.id} />
          <div className="tarjeta overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Costo Dropi / und.</th>
                  <th className="px-4 py-3 text-right">Costo real / und.</th>
                  <th className="px-4 py-3 text-right">Otros por pedido<div className="font-normal normal-case">empaque, Fénix, Confío…</div></th>
                  <th className="px-4 py-3 text-right">Comisión %<div className="font-normal normal-case">sobre el valor</div></th>
                  <th className="px-4 py-3 text-right">Costo por devolución<div className="font-normal normal-case">vacío = flete</div></th>
                  <th className="px-4 py-3 text-right">Ganancia por venta<div className="font-normal normal-case">este mes</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {db.productos.map((p) => {
                  const c = p.costos ?? {};
                  const v = ventasDelPeriodo(db.pedidos.filter((x) => x.productoId === p.id), periodo);
                  const porVenta = v.length ? v.reduce((a, x) => a + gananciaPedido(x), 0) / v.length : null;
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.nombre}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{dinero(costoUnitarioDropi(crudos, p.id))}</td>
                      <td className="px-4 py-3 text-right"><input name={`costoUnitario:${p.id}`} defaultValue={c.costoUnitario} inputMode="decimal" className={campo} /></td>
                      <td className="px-4 py-3 text-right"><input name={`extraPorPedido:${p.id}`} defaultValue={c.extraPorPedido} inputMode="decimal" className={campo} /></td>
                      <td className="px-4 py-3 text-right"><input name={`comisionPct:${p.id}`} defaultValue={c.comisionPct} inputMode="decimal" className={campo} /></td>
                      <td className="px-4 py-3 text-right"><input name={`costoDevolucion:${p.id}`} defaultValue={c.costoDevolucion} inputMode="decimal" className={campo} /></td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${porVenta !== null && porVenta < 0 ? "text-red-500" : "text-emerald-600"}`}>{dinero(porVenta)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button className="rounded-xl bg-gray-900 px-4 py-2 text-sm text-white">Guardar costos</button>
          <p className="text-xs text-gray-400">
            Ganancia por venta = precio − costo del producto − flete − otros por pedido − comisión. Es la base de la ganancia bruta, la esperada y la confirmada.
          </p>
        </form>
      )}
    </div>
  );
}
