import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Mi Panel COD" };

const MENU = [
  { seccion: "Principal", items: [{ href: "/", label: "Dashboard", pronto: true }] },
  {
    seccion: "E-commerce",
    items: [
      { href: "/productos", label: "Productos" },
      { href: "/logistica", label: "Gestión logística" },
      { href: "/mapa", label: "Mapa logístico", pronto: true },
    ],
  },
  { seccion: "Herramientas", items: [{ href: "/configuracion", label: "Productos y conexiones", pronto: true }] },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen md:flex">
        <aside className="border-b border-gray-200 bg-white p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="mb-6 text-lg font-bold">Mi Panel COD</div>
          <nav className="flex gap-4 overflow-x-auto md:block md:space-y-6">
            {MENU.map((s) => (
              <div key={s.seccion}>
                <div className="etiqueta mb-2 hidden md:block">{s.seccion}</div>
                <div className="flex gap-1 md:block md:space-y-1">
                  {s.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className="flex items-center justify-between whitespace-nowrap rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {i.label}
                      {i.pronto && <span className="ml-2 text-[10px] text-gray-400">pronto</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
