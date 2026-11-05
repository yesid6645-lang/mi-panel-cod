import { cookies } from "next/headers";
import Link from "next/link";
import { COOKIE_TIENDA } from "@/lib/tiendas";
import { elegirTienda } from "@/app/(panel)/configuracion/acciones";

/** Selector de tienda del menú: cada pantalla muestra solo la tienda elegida. */
export async function SelectorTienda({ tiendas }: { tiendas: { id: string; nombre: string }[] }) {
  if (!tiendas.length)
    return (
      <Link href="/configuracion?nueva=1" className="mb-6 block rounded-xl border border-dashed border-gray-300 p-3 text-sm text-blue-600">
        + Agrega tu primera tienda
      </Link>
    );
  const elegida = (await cookies()).get(COOKIE_TIENDA)?.value;
  const actual = tiendas.some((t) => t.id === elegida) ? elegida : tiendas[0].id;
  return (
    <div className="mb-6">
      <div className="etiqueta mb-1">Tienda activa</div>
      <div className="flex flex-wrap gap-1 md:flex-col">
        {tiendas.map((t) => (
          <form key={t.id} action={elegirTienda}>
            <input type="hidden" name="tienda" value={t.id} />
            <button
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${t.id === actual ? "bg-blue-50 font-medium text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {t.id === actual ? "● " : ""}{t.nombre}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
