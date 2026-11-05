import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Inicio de sesión con Supabase Auth (solo cuando el panel está publicado).
// En tu computador, sin SUPABASE_URL/SUPABASE_ANON_KEY, no se pide sesión.

export const authActiva = () => !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

/** Correos que pueden entrar (coma). Vacío = cualquier usuario creado en Supabase. */
export const correoPermitido = (correo?: string | null) => {
  const lista = (process.env.CORREOS_PERMITIDOS ?? "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  return !!correo && (lista.length === 0 || lista.includes(correo.toLowerCase()));
};

export async function clienteAuth() {
  const almacen = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // En componentes de servidor no se pueden escribir cookies; el middleware las renueva
        }
      },
    },
  });
}

export async function usuarioActual(): Promise<string | null> {
  if (!authActiva()) return null;
  const { data } = await (await clienteAuth()).auth.getUser();
  return data.user?.email ?? null;
}
