import Link from "next/link";
import { leerConfig } from "@/lib/db";
import { usuarioActual } from "@/lib/auth";
import { salir } from "@/app/login/acciones";
import { SelectorTienda } from "@/components/SelectorTienda";
import { diasParaVencer, DIAS_AVISO } from "@/lib/meta";

type ItemMenu = { href: string; label: string; pronto?: boolean };

const MENU: { seccion: string; items: ItemMenu[] }[] = [
  { seccion: "Principal", items: [{ href: "/", label: "Dashboard" }, { href: "/general", label: "Vista general" }] },
  {
    seccion: "E-commerce",
    items: [
      { href: "/productos", label: "Productos" },
      { href: "/costos", label: "Costos por producto" },
      { href: "/logistica", label: "Gestión logística" },
      { href: "/mapa", label: "Mapa logístico" },
    ],
  },
  { seccion: "Herramientas", items: [{ href: "/configuracion", label: "Tiendas y conexiones" }] },
];

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  // Recordatorio: el permiso de Meta dura ~60 días
  const db = await leerConfig();
  const dias = diasParaVencer(db.meta);
  const aviso =
    dias === null ? null : dias < 0 ? "Tu conexión con Meta venció: la pauta no se está actualizando." : dias <= DIAS_AVISO ? `Tu conexión con Meta vence en ${dias} días.` : null;
  const usuario = await usuarioActual();
  return (
    <div className="min-h-screen md:flex">
        <aside className="border-b border-gray-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="mb-4 text-lg font-bold">CRM Service</div>
          <SelectorTienda tiendas={db.tiendas.map((t) => ({ id: t.id, nombre: t.nombre }))} />
          <nav className="flex gap-4 overflow-x-auto md:block md:space-y-6">
            {MENU.map((s) => (
              <div key={s.seccion}>
                <div className="etiqueta mb-2 hidden md:block">{s.seccion}</div>
                <div className="flex gap-1 md:block md:space-y-1">
                  {s.items.map((i) =>
                    i.pronto ? (
                      // Pantallas aún no construidas: se ven pero no se pueden abrir
                      <span key={i.href} className="flex cursor-default items-center justify-between whitespace-nowrap rounded-lg px-3 py-2 text-sm text-gray-400">
                        {i.label}
                        <span className="ml-2 text-[10px]">pronto</span>
                      </span>
                    ) : (
                      <Link key={i.href} href={i.href} className="flex items-center justify-between whitespace-nowrap rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        {i.label}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ))}
          </nav>
          {usuario && (
            <form action={salir} className="mt-6 border-t border-gray-100 pt-4 text-xs text-gray-500">
              <div className="truncate">{usuario}</div>
              <button className="mt-1 text-blue-600 hover:underline">Cerrar sesión</button>
            </form>
          )}
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">
          {aviso && (
            <Link href="/configuracion" className="mx-auto mb-6 block max-w-7xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ {aviso} <b>Renovar ahora →</b>
            </Link>
          )}
          {children}
        </main>
    </div>
  );
}
