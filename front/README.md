# Bodegas del Atuel - Frontend

Aplicación React + Vite + TypeScript + Tailwind para el catálogo y la gestión de vinos.

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

## Funcionalidad

- Catálogo con filtros por tipo, cepa, bodega y añada.
- Paginación server-side y modal de detalle con bodega, composición, maridajes y stock.
- Alta y edición de vinos con validaciones HTML, composición de cepas y maridajes.
- La suma de composición se muestra como ayuda visual; la validación definitiva (RN-05) la realiza PostgreSQL y el error se muestra en pantalla.
- Indicador de salud de la API en el sidebar.

## Estructura

- `src/api/`: cliente HTTP, tipos y llamadas a la API.
- `src/components/`: layout y componentes reutilizables.
- `src/data/`: catálogos estáticos de cepas, maridajes, tipos y volúmenes.
- `src/features/vinos/`: catálogo, ficha y formulario de vinos.
- `src/lib/`: formateadores.
- `src/hooks/`: hooks compartidos.

## Contrato utilizado

- `GET /salud`
- `GET /vinos`
- `GET /vinos/{cod_vino}`
- `POST /vinos`
- `PUT /vinos/{cod_vino}`

El payload de alta/edición envía `composicion` como una lista de pares `[id_cepa, porcentaje]` y `maridajes` como una lista de IDs.

## Notas

- La API actual no expone endpoints de catálogo. Las bodegas y añadas se derivan de `/vinos` y `/vinos/{cod_vino}`.
- No se modifica el código de `api/` desde el frontend.
- El frontend no expone la eliminación de vinos.
