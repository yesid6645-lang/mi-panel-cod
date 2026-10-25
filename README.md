# Mi Panel COD

Panel personal de analítica COD (Dropi + Meta Ads), inspirado en WinTrack. Ver `ESPECIFICACION.md`.

## Arrancar

```bash
npm install
npm run seed      # datos de ejemplo (opcional)
npm run dev       # http://localhost:3000
npm test          # comprueba las fórmulas contra los números de WinTrack
```

## Conectar Dropi y Meta

Copia `.env.example` a `.env.local` y llena:

- `DROPI_TOKEN`: Dropi → Mis integraciones → token
- `META_ACCESS_TOKEN` y `META_AD_ACCOUNT_ID` (act_XXXX)

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
