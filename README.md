# Bodegas del Atuel

Trabajo Práctico Integrador de la materia **Bases de Datos** — Ingeniería en Sistemas, UTN Facultad Regional San Rafael.

## Sobre el proyecto

**Bodegas del Atuel** es un sistema de gestión y distribución para una empresa vitivinícola.

La base de datos permitirá representar las principales operaciones del negocio, entre ellas:

- Gestión de bodegas y vinos.
- Cepas, composiciones y maridajes.
- Fincas, parcelas, lotes de uva y análisis de calidad.
- Localidades, salas de venta y empleados.
- Clientes y sus distintos tipos.
- Ventas y comprobantes.
- Ingresos de mercadería al depósito central.
- Transferencias de vinos hacia las salas de venta.
- Control de stock.

El proyecto busca aplicar los contenidos de la materia mediante una solución completa basada en PostgreSQL. Las reglas de integridad ya están implementadas dentro de PostgreSQL. En las etapas posteriores se incorporarán la carga masiva de datos, consultas SQL, optimización, una API REST, un frontend y un despliegue en la nube.

Las reglas importantes del negocio están protegidas principalmente desde la base de datos, mediante claves, restricciones, funciones, procedimientos y triggers. De esta manera, la información se mantiene consistente independientemente de la aplicación que la utilice.

## Integrantes

- Muzas Valentina
- Parada Solange

## Tecnologías

- PostgreSQL 14 o superior
- Docker y Docker Compose
- SQL
- Git y GitHub
- Python y uv para la gestión reproducible de dependencias
- FastAPI para la API REST

## Estado actual

El proyecto completó la implementación inicial de las **Etapas 1 y 2**.

### Etapa 1 — Modelado

La etapa incluye:

- Diagrama entidad-relación.
- Esquema físico en `database/migrations/001_esquema.sql`.
- Tablas, claves primarias y foráneas.
- Tipos enumerados y dominio para CUIT.
- Relaciones con acciones referenciales.
- Diccionario de datos actualizado.
- Justificación de normalización y decisiones de diseño.
- Configuración reproducible con Docker y PostgreSQL.

Documentación relacionada:

- `docs/DER_Bodegas_del_Atuel.pdf/Untitled.pdf`
- `docs/Informe_Etapa1.pdf/Diccionario de Datos - Bodegas del Atuel.pdf`
- `docs/diccionario_de_datos.md`
- `docs/pruebas-docker.md`

El PDF histórico del diccionario se conserva como antecedente. La versión vigente
en formato editable es `docs/diccionario_de_datos.md`.

### Etapa 2 — Integridad y lógica

La etapa incluye:

- Restricciones de integridad en `002_constraints.sql`.
- Funciones en `003_funciones.sql`.
- Procedimientos en `004_procedimientos.sql`.
- Triggers en `005_triggers.sql`.
- Vistas en `006_vistas.sql`.
- Roles y privilegios en `007_roles.sql`.
- Índices en `008_indices.sql`.
- Datos de prueba y scripts de validación.

Las reglas de negocio se protegen principalmente dentro de PostgreSQL para
mantener la consistencia independientemente de la aplicación cliente.

### Próximas etapas

Quedan pendientes:

1. Carga masiva de datos.
2. Índices y medición de rendimiento con datos reales.
3. Consultas SQL de selección, inserción y eliminación.
4. API REST.
5. Frontend.
6. Despliegue en la nube.
7. Documentación final y defensa.

## Estructura actual

```text
Proyecto Bodegas del Atuel/
├── .env.example
├── .gitignore
├── compose.yaml
├── README.md
├── consultas/
│   ├── select.sql
│   └── update.sql
├── data/
│   ├── cepas.csv
│   ├── departamentos.csv
│   └── maridajes.csv
├── database/
│   ├── migrations/
│   │   ├── 001_esquema.sql
│   │   ├── 002_constraints.sql
│   │   ├── 003_funciones.sql
│   │   ├── 004_datos_prueba.sql
│   │   ├── 004_procedimientos.sql
│   │   ├── 005_triggers.sql
│   │   ├── 006_vistas.sql
│   │   ├── 007_roles.sql
│   │   └── 008_indices.sql
│   └── tests/
├── docs/
├── scripts/
└── tests/

## Configuración local

Las dependencias Python del proyecto se declaran en `pyproject.toml` y se fijan
en `uv.lock`. Para instalar el entorno reproducible:

```powershell
uv sync
```

Los scripts Python se ejecutan con `uv run`, por ejemplo:

```powershell
uv run python .\database\seed\etapa3.py
```

Crear un archivo `.env` en la raíz del repositorio, junto a `compose.yaml`.

Contenido de ejemplo:

```env
POSTGRES_DB=bodegas_atuel
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CAMBIAR_ESTA_CONTRASENA
POSTGRES_PORT=5432
```

El archivo `.env` es local y no debe subirse al repositorio. El archivo `.env.example` sí se comparte como modelo.

## Comandos de Docker

Ejecutar los comandos desde la carpeta raíz del repositorio.

### Levantar PostgreSQL

```powershell
docker compose up -d
```

### Verificar el estado

```powershell
docker compose ps
```

### Consultar los logs

```powershell
docker compose logs db
```

Para seguir los logs en tiempo real:

```powershell
docker compose logs -f db
```

### Conectarse a PostgreSQL

```powershell
docker compose exec db psql -U postgres -d bodegas_atuel
```

Dentro de PostgreSQL:

```sql
SELECT current_database();
SELECT version();
\dt
```

Para salir:

```sql
\q
```

### Detener el entorno

```powershell
docker compose down
```

### Reiniciar la base desde cero

```powershell
docker compose down -v
docker compose up -d
```

El comando `docker compose down -v` elimina también el volumen local y todos los datos almacenados en él.

## Prueba del esquema

La migración `001_esquema.sql` fue ejecutada correctamente sobre una base
PostgreSQL vacía. La prueba se documenta en `docs/pruebas-docker.md`.

La documentación de las pruebas se encuentra en:

```text
docs/pruebas-docker.md
```

## Seguridad

No subir al repositorio:

- `.env`
- Contraseñas reales
- Tokens
- Cadenas de conexión privadas
- Backups con información sensible

Para verificar el estado del repositorio:

```powershell
git status
```

Para comprobar que `.env` está siendo ignorado:

```powershell
git check-ignore -v .env
```

## Próximos pasos

Después de completar las Etapas 1 y 2 se continuará con:

1. Carga masiva de datos.
2. Medición de índices y rendimiento con datos reales.
3. Consultas SQL de selección, inserción y eliminación.
4. API REST.
5. Frontend.
6. Despliegue en la nube.
7. Documentación final y defensa.
