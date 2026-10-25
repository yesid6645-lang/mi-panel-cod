# Mi panel COD (inspirado en WinTrack) — Especificación v0.1

Tienda: Zorvix · País: Ecuador (USD) · Fuentes: Dropi + Meta Ads (Shopify después, ChateaPro no).

## Menú
- Principal: Inicio, Dashboard, Ranking
- E-commerce: Productos, Liquidación, Gestión logística, Calculadora, Mapa logístico, Guía de estados
- Herramientas: Notificaciones, Integraciones
- Sistema: Facturación (no aplica), Contabilidad (cierre y nómina)

## Fórmulas (verificadas con los números de las capturas)
| Métrica | Fórmula |
|---|---|
| Ganancia bruta | Σ (precio venta − costo producto − flete) de todas las ventas del período, antes de pauta y devoluciones |
| Gastos totales | Publicidad + Costo devoluciones |
| Ganancia esperada | Bruta − Publicidad − Costo devoluciones |
| Ganancia confirmada | Ganancia de pedidos ENTREGADOS − Publicidad − Costo devoluciones |
| % devolución | Devoluciones ÷ Ventas |
| Promedio diario | Total ÷ días transcurridos del período |
| Variación | vs. mes anterior (mismo tipo de período) |

Comprobación Belani (oct): 750,10 − 412,79 − 40,68 = 296,63 (esperada) ✓ · 558,97 entregado − 412,79 − 40,68 = 105,50 (confirmada) ✓ · 7/68 = 10,3 % ✓

## 1. Dashboard
- Selector de mes (‹ Octubre 2026 › · Hoy)
- 4 tarjetas con % vs mes anterior y mini-gráfica: Ganancia bruta · Ventas · Tasa de devolución (con "dentro de rango") · Pedidos (barra Entregados / En camino / Devueltos)
- Gráfica de barras 7/14/30 días: ganancia por entregas vs costo de devoluciones
- Alertas: productos que requieren atención (fuera de rango)
- Oportunidades: productos listos para crecer (etiqueta RENTABLE)
- Canales conectados (Dropi, Meta, Shopify) y accesos rápidos

## 2. Productos
- Período: por mes / por día / por rango
- 8 tarjetas: Ganancia bruta, esperada, confirmada, Nº ventas, Publicidad, Costo devoluciones, Gastos totales, Devoluciones
- Tabla por producto: Ventas · Conversaciones (Meta) · Publicidad · Entregados · Devoluciones · Costo dev. · Bruta · Esperada · Confirmada · % dev. · Decisión
- Fila "Promedio diario", buscador, vista Principal / Avanzadas
- Semáforo: Excelente (verde), Bien (azul), Atención (ámbar), Malo (rojo), Sin datos (gris). Costo dev. siempre rojo.
- Íconos por producto para saber si está vinculado a Dropi y a Meta

## 3. Gestión logística
Pestañas: Alertas · Todas las órdenes · Auditoría · Transportadoras · Administración. Botón "Actualizar Dropi".

**Alertas**
- Pedidos atascados en un estado N días (ej. "PARA RETIRO EN AGENCIA SERVIENTREGA — 8 días")
- Flujo de gestión: Nuevo → En contacto → Esperando → Gestión resuelta / Cerrada por Dropi
- Bandejas: Por atender · Reportados pendientes de Dropi · Finalizados · Todos
- Filtros: texto (guía, cliente, teléfono, producto, estado), estado, transportadora, fecha, orden; etapa logística (Entrega / Última milla)
- Fila: cliente + teléfono · guía + producto · estado + días en estado · botón de WhatsApp al cliente · Acciones

**Todas las órdenes**
- Las órdenes se guardan en base propia y se conservan aunque finalicen ("Incluir finalizados")
- "Requieren revisión (N)"
- Fila: último movimiento (fecha y hora) + días en ese estado

## 2b. Detalle de producto (clic en un producto)
Encabezado: nombre editable · "24 días · 22 con ventas · 68 ventas" · aviso de pauta COP→USD con tasa de referencia.
Pestañas: Resumen · Tendencias · Calendario · Detalle · Diagrama · Transportadoras

**Recomendación**: ESCALAR / (mantener, pausar…) + texto explicativo + "Siguiente paso" (ej. "Escala 1-2 anuncios ganadores y monitorea CPA/ROAS por 48h").

**Resultado del mes**: frase en lenguaje simple ("por cada $1 de publicidad te quedan $0.26 limpios")
| Métrica | Fórmula | Belani |
|---|---|---|
| Ganancia confirmada | margen entregados − pauta − devoluciones − fees (Fénix, Confío) | 105,50 |
| Si todo lo despachado entrega | = Ganancia esperada | 296,63 |
| ROI de entregados | Confirmada ÷ Pauta (equilibrio 0x) | 0,26x |
| ROAS de ingresos | Ingresos (Σ precio cobrado) ÷ Pauta | 4,36x |
| ROAS de equilibrio | Ingresos ÷ (Bruta − Costo dev.) | 2,54x |
| Sin devolver | Ventas − Devoluciones | 61 (90 %) |

**Métricas clave**
| Métrica | Fórmula | Belani |
|---|---|---|
| Ventas | conteo · ventas/día · % vs período anterior | 68 · 2,8/día |
| Ganancia estimada | = Bruta | 750,10 |
| Costo por venta (CPA) | Pauta ÷ Ventas | 6,07 |
| Conversión | Ventas ÷ Chats (Meta mensajes) | 7,1 % |
| Devoluciones | Devol ÷ Ventas | 10,3 % |
| Eficiencia de pauta | Esperada ÷ Pauta | 72 % |
| Ganancia bruta por venta | Bruta ÷ Ventas | 11,03 |
| Costo por chat | Pauta ÷ Chats | 0,43 |
| Costo por venta exitosa | Pauta ÷ (Ventas − Devol) | 6,77 |
| Días con ventas | días con ≥1 venta ÷ días del período | 22/24 |

**Ritmo de la semana**: promedio de ventas por día de la semana (barras), día más fuerte, mejor día del período (más ventas) y día más rentable.

**Qué venden y qué se devuelve** (sobre órdenes finalizadas)
- "De cada 10 pedidos, 9 llegan y 1 se devuelve" + barra entregados/devueltos
- Ticket promedio · Costo unitario · Unidades por orden · Tasa de upsell (pedidos con +1 unidad)
- Composición: % pedidos con 1, 2, 3+ unidades · Ticket 1 unidad vs ticket con upsell
- Combos y variantes: por variante (x1, x2, x3) ventas, precio, % entregado vs % devuelto

**Tendencias**
- Chips 7d vs 7d anteriores (ventas, ganancia, devoluciones)
- Tarjetas: Ganancia · Gasto pub. · Profit neto · Devoluciones
- Línea diaria de ventas con línea de promedio y punto del mejor día; misma gráfica para devoluciones

**Tendencias (continuación)**
- *Cómo se movieron tus devoluciones*: promedio diario (0,3), días afectados (6/24), pico del período (2 · 8 oct), chip 7d vs 7d, línea diaria con promedio.
- *Margen por peso invertido*: "Por cada $1 en publicidad, el margen entregado cubre $1,26 — te quedan $0,26 limpios" (= 1 + ROI neto).
  - Barras por día = (margen entregado − devoluciones − Fénix − Confío) ÷ pauta del día
  - Colores: gris = hasta $1 (recuperas lo invertido) · verde = lo que pasa de $1 (profit real) · naranja = no llegó a $1 · rojo = negativo
  - Raya gris = estimado contando toda venta (no solo entregadas)
  - Resumen: días con profit (9 de 23) · mejor/peor día ($4,76 / −$1,01)
- *Recuperación de la inversión*: ganancia operativa ACUMULADA día a día vs $0.
  - Frase: "Recuperaste lo invertido el 7 de octubre y vas +US$105,50; tu retorno real todavía es ajustado (0,26x)"
  - Línea roja bajo $0, verde sobre $0, marca vertical "recuperado"
  - Meta azul punteada: ROI neto 1,0x · indicador "ROI NETO 0,26x — Meta 1,0x, faltan 0,74x"
  - Sólida hasta hoy, punteada para el resto del mes

**Embudo "El viaje del cliente"**: Chatearon (959) → Compraron (68 · 7 %) → Recibieron (61 · 90 %) · Eficiencia total chat→venta entregada 6,4 %. Ojo: "Recibieron" = ventas − devoluciones.

**Calendario — CPA día a día**: cuadrícula mensual (Dom–Sáb), cada día con nº de ventas, coloreado comparando el CPA del día con el margen de las ventas de ese día (antes de pauta):
Ganaste (verde) · Por poco (naranja) · Equilibrio (azul) · Perdiste (rojo) · Sin movimiento (gris), con contador de cada uno.

**Diagrama — Dónde están hoy tus pedidos** (conmutador Este producto / General)
- Dona con total (70) + barra apilada
- Tasa de entrega 62,9 % (44/70) · Tasa de devolución 10 % (7/70) · En camino 19 (tránsito + oficina)
- 4 tarjetas: Entregados (44) · En tránsito (15) · En oficina (4, esperando que el cliente reclame) · Devoluciones (7)
- Atribución configurable: entregados por fecha real del evento, devoluciones por fecha de generación, tránsito y oficina por cohorte de generación

## Pendiente de ver (capturas)
Pestañas del detalle: Detalle · Transportadoras
Ranking · Calculadora · Mapa logístico · Guía de estados · Notificaciones · Auditoría · Transportadoras · Administración · menú "Acciones" · columnas "Avanzadas" · columna "Decisión" · dónde se configuran costo y precio por producto · Contabilidad · Liquidación
