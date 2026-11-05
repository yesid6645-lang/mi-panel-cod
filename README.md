# CRM Service

CRM de analítica COD (Dropi + Meta Ads), inspirado en WinTrack. Ver `ESPECIFICACION.md`.

## Arrancar

```bash
npm install
npm run seed      # datos de ejemplo (opcional)
npm run dev       # http://localhost:3000
npm test          # comprueba las fórmulas contra los números de WinTrack
```

## Tiendas y Dropi

Cada tienda (un país) tiene su propio Dropi. En **Tiendas y conexiones → Agregar tienda** pon el nombre,
el país y el token de Dropi (Dropi → Mis integraciones). El selector del menú cambia de tienda.
`npm run seed` agrega una "Tienda demo" con datos de ejemplo sin tocar las reales.

## Conectar Meta (una sola vez)

1. En https://developers.facebook.com/apps/ abre tu app → **Casos de uso** → **Agregar caso de uso** →
   **Inicio de sesión con Facebook para empresas**.
2. Dentro de ese caso de uso → **Configuraciones** → **Crear configuración**:
   tipo de token **Token de acceso de usuario**, activos **Cuentas publicitarias**, permiso **ads_read**.
   Copia el **ID de configuración** → `META_LOGIN_CONFIG_ID`.
3. En **Configuración → URI de redireccionamiento de OAuth válidos** agrega
   `http://localhost:3000/api/meta/callback`.
4. En **Configuración de la app → Básica** copia el **Identificador de la app** → `META_APP_ID`
   y la **Clave secreta** → `META_APP_SECRET`.
5. Abre el panel → **Tiendas y conexiones** → **Conectar Meta** (una vez para todo el portafolio), elige
   las cuentas publicitarias de cada tienda y marca qué campañas son de cada producto.

El permiso dura ~60 días; el panel muestra un aviso 7 días antes para que le des a **Renovar conexión**.

Luego, en Productos, dale a **Actualizar Dropi y Meta**.

## Estructura

| Archivo | Qué hace |
|---|---|
| `lib/metrics.ts` | Todas las fórmulas (ganancias, ROAS, CPA, decisión) |
| `lib/analisis.ts` | Ritmo semanal, combos, calendario de CPA, estado de pedidos |
| `lib/dropi.ts` | Cliente de Dropi y traducción de pedidos (rutas por confirmar) |
| `lib/meta.ts` | Gasto y chats por campaña, asignados a cada producto |
| `lib/sync.ts` | Lo que hace el botón Actualizar |
| `lib/db.ts` | Guardado en `data/db.json` |

> En el entorno en la nube de Claude, el `fetch` de Node necesita `NODE_USE_ENV_PROXY=1` para salir por el proxy
> (p. ej. `NODE_USE_ENV_PROXY=1 npm run actualizar`). En tu computador no hace falta.

## Publicar (Supabase + Netlify)

1. **Supabase** (https://supabase.com → New project). En **SQL Editor** pega `supabase/esquema.sql` y dale **Run**.
2. **Usuarios**: Authentication → Users → **Add user** (correo y contraseña) para cada socio.
   En Authentication → Sign In / Providers, desactiva **Allow new users to sign up**.
3. **Netlify** (https://app.netlify.com → Add new site → Import from GitHub → `mi-panel-cod`).
   En Site configuration → Environment variables agrega: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `CORREOS_PERMITIDOS`, `META_APP_ID`, `META_APP_SECRET`,
   `META_LOGIN_CONFIG_ID`, `APP_URL` (la dirección del sitio, p. ej. `https://crm-service.netlify.app`) y `COP_PER_USD`.
4. En la app de Meta agrega `https://TU-SITIO.netlify.app/api/meta/callback` a los URI de redireccionamiento.
5. Entra al sitio, crea las tiendas con sus tokens de Dropi y dale a Actualizar. Si ya tenías datos en tu
   computador, `npm run subir` los copia a Supabase (con las variables de Supabase en `.env.local`).

Con Supabase configurado, los datos se guardan allá y el panel pide inicio de sesión; sin esas variables
usa `data/db.json` y no pide sesión.
