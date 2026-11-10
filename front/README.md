# Bodegas del Atuel - Frontend

Aplicación React + Vite + TypeScript + Tailwind para la gestión de ventas,
transferencias y el catálogo de vinos.

## Requisitos

- Node.js 20 o superior.
- API FastAPI disponible en `http://127.0.0.1:8000`.
- Base PostgreSQL con el esquema y los datos del proyecto.

## Ejecución

```powershell
Set-Location front
npm install
Copy-Item .env.example .env
npm run dev
```

Abrir `http://127.0.0.1:5173/vinos`.

Vite proxifica `/api` hacia `http://127.0.0.1:8000`. La variable `VITE_API_BASE_URL` permite cambiar la URL base si se necesita.

## Scripts

- `npm run dev`: servidor de desarrollo.
- `npm run build`: typecheck con TypeScript y build de producción.
- `npm run lint`: análisis con Oxlint.
- `npm run preview`: sirve el build de producción.

## Pantallas

- **Catálogo** (`/vinos`): filtros por tipo, cepa, bodega y añada, paginación
  server-side y ficha con composición, maridajes y stock.
- **Alta y edición** (`/vinos/nuevo`, `/vinos/{cod}/editar`): la suma de
  composición se muestra como ayuda visual; la validación definitiva (RN-05)
  la realiza PostgreSQL y el error se muestra en pantalla.
- **Nueva venta** (`/ventas`): elige sala y cliente, agrega vinos y registra
  el comprobante. Los importes los calcula la base.
- **Transferencias** (`/transferencias`): listado con estado y acciones
  habilitadas según la transición de estados (RN-10 y RN-11).
- **Tablero** (`/tablero`): ranking de los 10 vinos más vendidos, ventas por
  sala del último trimestre y vinos sin stock en la sala elegida.
- Indicador de salud de la API en el sidebar.

## Estructura

- `src/api/`: cliente HTTP, tipos y llamadas a la API.
- `src/components/`: layout y componentes reutilizables.
- `src/data/`: catálogos estáticos de cepas, maridajes, tipos y volúmenes.
- `src/features/`: una carpeta por pantalla.
- `src/lib/`: formateadores.
- `src/hooks/`: hooks compartidos.

## Contrato utilizado

- `GET /salud`
- `GET /vinos`, `GET /vinos/{cod_vino}`, `POST /vinos`, `PUT /vinos/{cod_vino}`
- `GET /salas`, `GET /salas/{id_sala}/stock`
- `GET /clientes`
- `POST /comprobantes`, `GET /comprobantes/{numero}`
- `GET /transferencias`, `GET /transferencias/{nro}`, `POST /transferencias`,
  `POST /transferencias/{nro}/renglones`, `POST /transferencias/{nro}/terminar`,
  `POST /transferencias/{nro}/procesar`
- `GET /reportes/top-vinos`, `GET /reportes/ventas-por-sala`,
  `GET /reportes/vinos-sin-stock`

El payload de alta/edición envía `composicion` como una lista de pares `[id_cepa, porcentaje]` y `maridajes` como una lista de IDs.

## Notas

- El frontend **no calcula** totales, descuentos ni stock: los muestra tal
  como los devuelve la API, que a su vez los hace calcular a PostgreSQL.
- Los mensajes de error de las reglas de negocio se muestran sin
  reinterpretar, incluyendo el código SQLSTATE.
- La API no expone endpoints de catálogo de bodegas ni de añadas: se derivan
  de `/vinos` y `/vinos/{cod_vino}`.
- El frontend no expone la eliminación de vinos.
