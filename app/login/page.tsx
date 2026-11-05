import { redirect } from "next/navigation";
import { authActiva } from "@/lib/auth";
import { entrar } from "./acciones";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; siguiente?: string }> }) {
  if (!authActiva()) redirect("/");
  const sp = await searchParams;
  const campo = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm";
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form action={entrar} className="tarjeta w-full max-w-sm space-y-4 p-8">
        <div>
          <h1 className="text-2xl font-bold">CRM Service</h1>
          <p className="text-sm text-gray-500">Ingresa con tu correo y contraseña.</p>
        </div>
        {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{sp.error}</p>}
        <input type="hidden" name="siguiente" value={sp.siguiente ?? "/"} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Correo</span>
          <input name="correo" type="email" required autoComplete="email" className={campo} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Contraseña</span>
          <input name="clave" type="password" required autoComplete="current-password" className={campo} />
        </label>
        <button className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700">Entrar</button>
      </form>
    </div>
  );
}
