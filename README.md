# Bodegas del Atuel

Trabajo Práctico Integrador de la materia **Bases de Datos** — Ingeniería en Sistemas, UTN Facultad Regional San Rafael.

## Sobre el proyecto

**Bodegas del Atuel** es un sistema de gestión y distribución para una empresa vitivinícola ficticia.

La base de datos representa las principales operaciones del negocio:

- Gestión de bodegas y vinos.
- Cepas, composiciones y maridajes.
- Fincas, parcelas, lotes de uva y análisis de calidad.
- Localidades, salas de venta y empleados.
- Clientes y sus distintos tipos.
- Ventas y comprobantes.
- Ingresos de mercadería al depósito central.
- Transferencias de vinos hacia las salas de venta.
- Control de stock.

Las reglas de integridad están implementadas **dentro de PostgreSQL**, mediante
claves, restricciones, funciones, procedimientos y triggers. La API REST llama a
esos mecanismos y no recalcula totales, descuentos ni stock: la base decide y
la API traduce el error.

## Integrantes

- Muzas Valentina
- Parada Solange

## Tecnologías

- PostgreSQL 16
- Docker y Docker Compose
- SQL directo con driver nativo (`psycopg2`), sin ORM
- Python con `uv` para dependencias reproducibles
- FastAPI + Uvicorn para la API REST
- React + Vite + Tailwind para el front
- pytest para las pruebas automáticas

## Estado actual

| Etapa | Contenido | Estado |
|---|---|---|
| 1 | Modelado: DER, esquema relacional, diccionario de datos | Completa |
| 2 | Integridad: constraints, funciones, procedimientos, triggers, vistas, roles | Completa |
| 3 | Carga masiva: generador reproducible con Faker y semilla fija | Completa |
| 4 | Índices y rendimiento: medición con `EXPLAIN (ANALYZE, BUFFERS)` | Completa |
| 5 | Consultas SQL: S1 a S12, I1 a I6, U1 a U6, D1 a D6 | Completa |
| 6 | API REST con FastAPI, Docker Compose y pruebas | **Completa** |
| 7 | Frontend | En curso: catálogo de vinos y formulario de alta |
| 8 | Despliegue en la nube | Pendiente |
| 9 | Informe final y defensa | Pendiente |

## Levantar el proyecto completo

Un solo comando levanta la base, la API y el front:

```powershell
docker compose up -d --build
```

| Servicio | Dirección |
|---|---|
| Front | http://127.0.0.1:5173 |
| API REST | http://127.0.0.1:8000 |
| Documentación Swagger | http://127.0.0.1:8000/docs |
| Base de datos | 127.0.0.1:5433 |

El front consume la API a través del proxy `/api` de Nginx, por lo que no hace
falta configurar CORS.

Para aplicar las migraciones sobre la base del contenedor:

```powershell
docker compose --profile setup run --rm migrar
```

## Levantar solo la API en local

```powershell
uv sync
uv run uvicorn app.main:app --app-dir api --reload
```

## Configuración local

Las dependencias Python se declaran en `pyproject.toml` y se fijan en
`uv.lock`:

```powershell
uv sync
```

Los scripts Python se ejecutan con `uv run`:

```powershell
uv run python .\database\seed\etapa3.py
```

Crear un archivo `.env` en la raíz, a partir de `.env.example`:

```env
POSTGRES_DB=bodegas_atuel
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CAMBIAR_ESTA_CONTRASENA
POSTGRES_PORT=5432

API_DB_USER=app_api
API_DB_PASSWORD=CAMBIAR_ESTA_CONTRASENA

API_PORT=8000
FRONT_PORT=5173
```

`POSTGRES_*` es el **propietario**: se usa para aplicar migraciones y cargar
datos. La API se conecta con `API_DB_USER` / `API_DB_PASSWORD`, que corresponde
al rol `app_api` de privilegios mínimos. La contraseña real nunca se sube al
repositorio.

## Migraciones

Se aplican en orden y son idempotentes:

```powershell
foreach ($f in Get-ChildItem database\migrations\*.sql | Sort-Object Name) {
    Get-Content $f.FullName | docker compose exec -T db psql `
        -v ON_ERROR_STOP=1 -U postgres -d bodegas_atuel
}
```

Sobre una base vacía, las nueve migraciones se ejecutan sin errores.

## Pruebas

```powershell
uv run pytest tests/ -v
```

- `tests/test_api_integracion.py`: 18 pruebas contra PostgreSQL real, incluidas
  7 que provocan una violación de regla de negocio y verifican el código HTTP.
- `tests/test_etapa6_valen.py`: 26 pruebas unitarias de validaciones, manejo de
  errores, OpenAPI y rutas.

Las pruebas de integración se omiten (`skip`) si la base no está disponible.

## Carga masiva

```powershell
uv run python .\database\seed\etapa3.py
```

Documentación en `docs/etapa3_carga_masiva.md`.

## Documentación

| Documento | Contenido |
|---|---|
| `docs/etapa6.md` | Informe de la etapa 6: arquitectura, endpoints, errores, roles, pruebas |
| `docs/INFORME_ETAPA2.md` | Informe de la etapa 2 |
| `docs/trazabilidad_etapa2.md` | Trazabilidad regla → mecanismo → prueba |
| `docs/etapa3_carga_masiva.md` | Estrategia de carga masiva |
| `docs/etapa4_rendimiento.md` | Índices y planes de ejecución |
| `docs/diccionario_de_datos.md` | Diccionario de datos |
| `docs/pruebas-docker.md` | Pruebas del esquema sobre Docker |
| `docs/DER_Bodegas_del_Atuel.pdf/Untitled.pdf` | Diagrama entidad-relación |
| `docs/Informe_Etapa1.pdf/Diccionario de Datos - Bodegas del Atuel.pdf` | Diccionario original (PDF) |

## Estructura

```text
Bodegas del Atuel/
├── .dockerignore
├── .env.example
├── .gitignore
├── compose.yaml            # db + api + front
├── pyproject.toml
├── uv.lock
├── api/                    # API REST (FastAPI)
│   ├── Dockerfile
│   └── app/
├── front/                  # Frontend (React + Vite)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
├── consultas/              # S1-S12, I1-I6, U1-U6, D1-D6
├── data/                   # catálogos CSV
├── database/
│   ├── migrations/         # 001 a 009
│   ├── seed/               # generador de carga masiva
│   ├── tests/
│   └── performance/
├── docs/
├── scripts/
└── tests/
```

## Comandos de Docker

```powershell
docker compose up -d --build     # levantar todo
docker compose ps                # ver el estado
docker compose logs api           # ver los logs de la API
docker compose down              # detener sin borrar datos
```

> **Atención:** `docker compose down -v` también borra el volumen local con
> todos los datos. No lo uses salvo que quieras empezar de cero.

## Seguridad

No subir al repositorio:

- `.env`
- Contraseñas reales
- Tokens
- Cadenas de conexión privadas
- Backups con información sensible

Para verificar que `.env` está ignorado:

```powershell
git check-ignore -v .env
```
