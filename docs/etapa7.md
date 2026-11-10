# Etapa 7 — Frontend

Sistema de gestión y distribución vitivinícola **Bodegas del Atuel**.
Ingeniería en Sistemas — UTN Facultad Regional San Rafael.

---

## 1. Objetivo de la etapa

Ver cómo el dato viaja desde la base hasta la pantalla y cómo las reglas de
la base se perciben desde el usuario. **El foco no es el diseño visual.**

La regla que guía toda la etapa:

> El front no calcula totales, descuentos ni stock. Muestra lo que devuelve
> la API, que a su vez lo hace calcular a PostgreSQL.

Cuando la base rechaza una operación, el front muestra **el mensaje de la
regla tal como lo devuelve la API**, sin ocultarlo ni reemplazarlo por uno
genérico. Por ejemplo, una venta sin stock muestra:

```
RN-09: stock insuficiente para el vino 176 en la sala 1
```

---

## 2. Pantañas

Las cinco pantallas mínimas que pide el TPI:

| Pantalla | Ruta | Estado |
|---|---|---|
| Catálogo de vinos | `/vinos` | Completa |
| Alta y edición de vino | `/vinos/nuevo`, `/vinos/{cod}/editar` | Completa |
| Nueva venta | `/ventas` | Completa |
| Transferencias | `/transferencias` | Completa |
| Tablero | `/tablero` | Completa |

### Catálogo de vinos

Listado paginado con filtros por tipo, cepa, bodega y añada. El detalle
muestra la composición con porcentajes, los maridajes y el stock total.

### Alta y edición de vino

Formulario con la composición de cepas. Si los porcentajes no suman 100, la
base lo rechaza con `P0001` y el front muestra el mensaje de RN-05 sin
intervenir en el cálculo.

### Nueva venta

Elige sala y cliente, agrega vinos con cantidad y registra el comprobante.
Los importes los calcula la base: el front solo muestra el `subtotal`, el
`descuento` y el `total` que devuelve `POST /comprobantes`.

Si el stock no alcanza, la API responde 409 y la pantalla muestra el mensaje
de la regla. No queda ningún dato a medias.

### Transferencias

Movimiento interno de producto terminado entre el Depósito Central y las
salas de venta (RN-11).

La pantalla tiene dos bloques:

1. **Nueva Solicitud de Transferencia**: elige la sala solicitante, muestra
   la fecha de confección y el depósito de origen (ambos de solo lectura, los
   fija la base), y carga las líneas con el stock disponible en el depósito.
   El formulario se puede plegar.
2. **Registro Histórico**: listado de todas las transferencias con filtros
   por estado y contadores.

Las acciones dependen del estado, respetando las transiciones de RN-10 y
RN-11:

| Estado | Acciones disponibles |
|---|---|
| `en_confeccion` | Agregar renglón, Marcar como Terminado |
| `terminado` | Procesar en Depósito |
| `procesado` | Ninguna (Stock impactado) |

Agregar renglones a una transferencia en confección se hace desde un modal,
porque el stock se descuenta del depósito recién cuando la transferencia se
procesa, no al cargarla.

### Tablero

Tres indicadores, todos con consultas de la sección 8 del TPI:

- Ranking de los 10 vinos más vendidos (S1).
- Ventas por sala en el último trimestre (S8).
- Vinos sin stock en la sala elegida con stock en el depósito central (S6).

Los gráficos usan [Recharts](https://recharts.org), que dibuja en SVG sobre
el mismo sistema de diseño del resto de la aplicación.

---

## 3. Arquitectura

```text
front/src/
├── api/                        # capa de acceso a la API
│   ├── client.ts               # fetch central: timeout, errores y ApiError
│   ├── catalogos.ts
│   ├── clientes.ts
│   ├── health.ts
│   ├── reportes.ts
│   ├── salas.ts
│   ├── transferencias.ts
│   ├── types.ts
│   └── vinos.ts
├── components/
│   ├── layout/                 # AppLayout, AppHeader, Sidebar
│   └── ui/                     # ErrorBanner, SuccessBanner, Modal, Pagination...
├── data/catalogos.ts           # catálogos estáticos de apoyo
├── features/
│   ├── tablero/TableroPage.tsx
│   ├── transferencias/TransferenciasPage.tsx
│   ├── ventas/VentaPage.tsx
│   └── vinos/                  # CatalogoPage, VinoDetailModal, VinoFormPage
├── hooks/useHealth.ts
└── lib/format.ts               # formateo de precios, porcentajes y graduación
```

Cada pantalla sigue el mismo patrón:

1. **Capa de API** en `api/`: una función por endpoint, todas tipadas.
2. **Página** en `features/`: estado, llamadas y composición.
3. **Componentes de UI** reutilizables, con el mismo design system.

El front **no** consulta la base ni recalcula importes. Todo pasa por la
API.

---

## 4. Manejo de errores

`api/client.ts` centraliza el manejo de respuestas:

- `ApiError` con `status`, `detail` y `sqlstate`.
- `normalizeDetail` entiende los tres formatos de error de FastAPI: texto,
  objeto con `detail` y lista de validaciones.
- Timeout de 15 segundos con `AbortController`.

Cuando la API responde con un error de la base, la pantalla lo muestra con
`ErrorBanner`, que incluye el código SQLSTATE para que se vea de qué regla
se trata.

---

## 5. Endpoints que usa el front

| Pantalla | Endpoints |
|---|---|
| Catálogo | `GET /vinos`, `GET /vinos/{cod}` |
| Alta de vino | `POST /vinos`, `PUT /vinos/{cod}` |
| Nueva venta | `GET /salas`, `GET /salas/{id}/stock`, `GET /clientes`, `POST /comprobantes`, `GET /comprobantes/{nro}` |
| Transferencias | `GET /transferencias`, `GET /transferencias/{nro}`, `POST /transferencias`, `POST /transferencias/{nro}/renglones`, `POST /transferencias/{nro}/terminar`, `POST /transferencias/{nro}/procesar`, `GET /deposito/stock` |
| Tablero | `GET /reportes/top-vinos`, `GET /reportes/ventas-por-sala`, `GET /reportes/vinos-sin-stock?id_sala=N` |
| Todas | `GET /salud` (estado de la API en el sidebar) |

Los endpoints de salas, de listado de transferencias y de stock del depósito
se agregaron en esta etapa, porque las pantallas los necesitaban y no
existían en la etapa 6.

---

## 6. Ejecución

### Con Docker (recomendada)

```powershell
docker compose up -d --build
```

| Servicio | Dirección |
|---|---|
| Front | http://127.0.0.1:5173 |
| API | http://127.0.0.1:8000 |

El front consume la API por el proxy `/api` de Nginx, con `VITE_API_BASE_URL=/api`.

### En local, con recarga en caliente

```powershell
# Terminal 1: base y API
docker compose up -d db
uv run uvicorn app.main:app --app-dir api --reload

# Terminal 2: front
cd front
npm install
npm run dev
```

El proxy de Vite (`front/vite.config.ts`) reenvía `/api` a
`http://127.0.0.1:8000` en desarrollo.

### Verificación de calidad

```powershell
cd front
npm run lint      # oxlint
npx tsc -b        # comprobación de tipos
npm run build     # build de producción
```

---

## 7. Sistema de diseño

El front usa un design system propio, derivado de Material 3, definido en
`front/tailwind.config.js`:

- **Colores:** `primary`, `surface`, `surface-container-*`, `on-surface-*`,
  `error`.
- **Espaciado:** `space-xs`, `space-sm`, `space-md`, `space-lg`, `space-xl`,
  `margin`.
- **Tipografía:** `headline-*`, `label-*`, `body-*`, `tabular-data`,
  `metric-lg`.

Las tres páginas nuevas reutilizan las mismas clases y los mismos
componentes que el catálogo y el formulario de vinos, de modo que la
aplicación se ve uniforme.

### Modo oscuro

La aplicación se muestra en **modo oscuro**. Los tokens semánticos de
Tailwind no llevan un color fijo: leen una variable CSS definida en
`front/src/index.css`.

```js
// tailwind.config.js
const token = (nombre) => `rgb(var(--md-${nombre}) / <alpha-value>)`

colors: {
  primary: token('primary'),
  surface: token('surface'),
  // ...
}
```

```css
/* index.css */
:root {
  --md-primary: 91 0 6;
  --md-surface: 247 249 251;
  /* ... paleta clara */
}

.dark {
  --md-primary: 255 180 171;
  --md-surface: 20 18 24;
  /* ... paleta oscura */
}
```

La paleta oscura sale de la misma paleta clara, con los tonos invertidos
para mantener el contraste. La clase `dark` del `<html>` decide cuál se
aplica, de modo que **el tema claro sigue disponible**: para volver a él,
alcanza con quitar esa clase.

Cada variable guarda los canales R, G y B por separado para poder
usarlos con opacidad (`rgb(var(--md-outline-variant) / 0.6)`).

Los gráficos de Recharts dibujan en SVG y no aceptan clases de Tailwind:
`TableroPage` lee los colores de las variables del tema y los relee
cuando el tema cambia.

---

## 8. Criterios de aceptación de la etapa 7

| Criterio | Estado | Evidencia |
|---|---|---|
| Las cinco pantallas funcionan contra la API real | Cumple | Verificado con la API y la base levantadas |
| Una venta sin stock muestra el mensaje de la regla y no deja datos a medias | Cumple | 409 con `RN-09: stock insuficiente...` |
| El front no contiene lógica de cálculo de importes ni de stock | Cumple | Los importes llegan calculados desde la API |

---

## 9. Pendiente para las etapas siguientes

- **Etapa 8 (Nube):** desplegar base, API y front con URL pública HTTPS,
  conexión cifrada, backup y restauración probados.
- **Etapa 9 (Documentación):** consolidar los informes de cada etapa.
