# Etapa 6 — API REST

Sistema de gestión y distribución vitivinícola **Bodegas del Atuel**.
Ingeniería en Sistemas — UTN Facultad Regional San Rafael.

---

## 1. Objetivo de la etapa

Exponer la base de datos mediante una API REST **sin ocultar el SQL** y **sin
duplicar las reglas de negocio que ya viven en la base**.

La regla de oro del TPI se respeta de punta a punta:

> La API no recalcula totales, descuentos ni stock: llama a las funciones y
> procedimientos de la base y deja que los triggers protejan las reglas.

En este proyecto eso significa, por ejemplo, que el descuento de un cliente no
lo calcula la API: lo completa el trigger `trg_cliente_descuento` (RN-06) según
el tipo de cliente; y que el total de un comprobante no lo arma la API: lo
calcula `fn_trg_actualizar_totales_comprobante` (RN-08).

---

## 2. Arquitectura

```text
front/  (React + Vite + Tailwind)
   │  fetch('/api/...')
   ▼
Nginx (front/nginx.conf)  ── proxy /api ──▶  API REST (FastAPI)
                                               │  psycopg2 (SQL directo)
                                               ▼
                                        PostgreSQL 16
                                  triggers + procedimientos + roles
```

### Estructura de la API

```text
api/
├── Dockerfile
└── app/
    ├── main.py              # aplicación FastAPI y manejadores de error
    ├── config.py            # configuración por variables de entorno
    ├── pool.py              # ThreadedConnectionPool
    ├── dependencies.py      # dependencia que entrega la conexión del pool
    ├── errores.py           # traducción SQLSTATE → HTTP (única política)
    ├── db/
    │   └── transactions.py   # context manager de transacción explícita
    ├── repositories/        # capa de acceso a datos: una función por consulta
    │   ├── vinos.py
    │   ├── clientes.py
    │   └── reportes.py
    ├── routes/              # controladores HTTP
    │   ├── health.py
    │   ├── vinos.py
    │   ├── clientes.py
    │   └── reportes.py
    ├── schemas/             # validación de entrada con Pydantic
    │   ├── vino.py
    │   └── cliente.py
    └── operaciones/         # operaciones transaccionales (tareas 3 y 4)
        ├── api_rutas.py
        ├── comprobantes.py
        ├── ingresos.py
        ├── transferencias.py
        └── README.md
```

El acceso a datos sigue el patrón pedido por el TPI: **una función por
consulta** en `repositories/`, y los controladores solo orquestan. El SQL no
queda desparramado en las rutas.

---

## 3. Endpoints

### Vinos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/vinos` | Catálogo con filtros y paginación |
| GET | `/vinos/{cod_vino}` | Detalle con composición, maridajes y stock |
| POST | `/vinos` | Alta con composición |
| PUT | `/vinos/{cod_vino}` | Modificación (el precio queda auditado por RN-13) |
| DELETE | `/vinos/{cod_vino}` | Baja |

Filtros de `GET /vinos`: `tipo`, `cepa`, `bodega`, `anada`, `page`, `limit`.

Respuesta del listado:

```json
{ "items": [ ... ], "page": 1, "limit": 20, "total": 300 }
```

### Clientes

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/clientes` | Listado paginado, con filtro `tipo_cliente` |
| GET | `/clientes/{id_cliente}` | Detalle con subtipo y permisos |
| POST | `/clientes` | Alta del cliente **y de su subtipo** |
| PUT | `/clientes/{id_cliente}` | Modificación del cliente y su subtipo |
| DELETE | `/clientes/{id_cliente}` | Baja |

La jerarquía de clientes se respeta: al dar de alta un cliente, la API escribe
también la fila de `cliente_socio`, `cliente_distribuidor` o
`cliente_exportador` según el tipo, con sus datos propios (zona de cobertura y
número de habilitación, país de destino) y los permisos de exportación.

### Comprobantes

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/comprobantes` | Venta completa: cabecera y renglones en una transacción |
| GET | `/comprobantes/{numero}` | Comprobante con sus renglones |

### Transferencias

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/transferencias` | Alta con renglones |
| POST | `/transferencias/{numero}/renglones` | Carga de renglones mientras está en confección |
| POST | `/transferencias/{numero}/terminar` | Cambio de estado (invoca el procedimiento) |
| POST | `/transferencias/{numero}/procesar` | Procesamiento (invoca el procedimiento) |

### Ingresos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/ingresos` | Alta con renglones |
| POST | `/ingresos/{codigo}/renglones` | Carga de renglones |
| POST | `/ingresos/{codigo}/terminar` | Cambio de estado |
| POST | `/ingresos/{codigo}/procesar` | Procesamiento e impacto en el depósito |

### Reportes

| Método | Ruta | Consulta de la sección 8 |
|---|---|---|
| GET | `/reportes/top-vinos` | S1 — ranking de vinos vendidos |
| GET | `/reportes/ventas-por-sala` | S8 — ventas por sala en el último trimestre |
| GET | `/reportes/vinos-sin-stock?id_sala=N` | S6 — sin stock en sala y con stock en depósito |
| GET | `/reportes/transportista-activo` | S7 — transportista con mayor actividad |
| GET | `/reportes/trazabilidad/{cod_vino}` | Auditoría de cambios de precio (RN-13) |

### Salud

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/salud` | Verifica que la API llega a la base |

### Documentación interactiva

- Swagger UI: `http://127.0.0.1:8000/docs`
- Esquema OpenAPI: `http://127.0.0.1:8000/openapi.json`

---

## 4. Traducción de errores (SQLSTATE → HTTP)

La tabla de traducción está en un único módulo, `api/app/errores.py`, y la
aplican tanto las rutas de `operations/` como las de `repositories/`. No hay
dos políticas distintas.

| Situación en PostgreSQL | SQLSTATE | Respuesta HTTP |
|---|---|---|
| UNIQUE violado | 23505 | 409 Conflict |
| FOREIGN KEY violada | 23503 | 409 Conflict |
| CHECK violado | 23514 | 422 Unprocessable Entity |
| NOT NULL violado | 23502 | 422 Unprocessable Entity |
| Regla de negocio rechazada por trigger o procedimiento | P0001 | 409 Conflict |
| Recurso inexistente | P0002 | 404 Not Found |
| Formato inválido para el tipo | 22P02 | 400 Bad Request |
| Serialización o deadlock | 40001 / 40P01 | 503 Service Unavailable (+ `Retry-After`) |

### El mensaje de la regla viaja al cliente

Para los códigos que provienen de una regla de negocio (`P0001`, `23514`,
`23502`, `P0002`) la respuesta conserva el mensaje que escribió el trigger o
el procedimiento. Para el resto se usa un mensaje genérico, para no filtrar
detalles internos del esquema.

Ejemplo real, venta sin stock:

```json
{
  "detail": "RN-09: stock insuficiente para el vino 1 en la sala 1",
  "sqlstate": "P0001"
}
```

### Ajuste de la base necesario

Para que una regla de negocio rechazada por un trigger llegara con código
`P0001` (409, como pide el TPI) y no con `23514` (422, que es el código de un
CHECK), se ajustó el `ERRCODE` de las reglas de negocio en:

- `005_triggers.sql`: RN-09 (stock insuficiente), RN-10/RN-11 (transiciones de
  estado), RN-05 (composición), RN-12 (bloqueo de renglones).
- `004_procedimientos.sql`: los cuatro procedimientos pasan a `P0001` en sus
  validaciones de estado y de disponibilidad de stock.

El `23514` se reservó para lo que realmente es un `CHECK` (precio positivo,
graduación entre 5 y 20, cantidad positiva, stock no negativo).

---

## 5. Roles y privilegios

La API **no** se conecta con el propietario de la base ni con un superusuario.

| Rol | Uso | Puede iniciar sesión |
|---|---|---|
| `app_api` | Lectura/escritura de la API | Sí (`LOGIN`) |
| `rol_admin_sistema` | Administración | No |
| `rol_operador_ventas` | Operador de ventas | No |
| `rol_gerente_comercial` | Gerencia comercial | No |
| `rol_propietario_procedimientos` | Dueño de los procedimientos | No |
| `rol_propietario_ventas` | Dueño de los triggers de venta | No |

`app_api` se crea en `009_etapa6_api.sql` y tiene privilegios mínimos:

- `SELECT` sobre las tablas que consulta.
- `INSERT`, `UPDATE` y `DELETE` solo sobre catálogo y clientes.
- `EXECUTE` sobre los cuatro procedimientos y las funciones de apoyo.
- **Sin permiso de escritura sobre `stock_sala`, `stock_deposito`,
  `comprobante` ni `renglon_comprobante`**: el stock y los totales solo se
  modifican a través de los triggers y procedimientos.

Comprobación:

```console
$ psql "postgresql://app_api:...@127.0.0.1:5432/bodegas_atuel" \
    -c "UPDATE stock_sala SET cantidad = 999 WHERE id_sala = 1 AND cod_vino = 1;"
ERROR:  permission denied for table stock_sala
```

La contraseña se define fuera del repositorio, por variable de entorno:

```bash
psql -v api_password="$API_DB_PASSWORD" -f database/migrations/009_etapa6_api.sql
```

---

## 6. Pruebas automáticas

**44 pruebas** en total, todas en verde:

```console
$ uv run pytest tests/ -q
44 passed, 1 warning in 3.95s
```

| Archivo | Tipo | Casos |
|---|---|---|
| `tests/test_api_integracion.py` | Integración contra PostgreSQL real | 18 |
| `tests/test_etapa6_valen.py` | Unitarias (validaciones, errores, OpenAPI, rutas) | 26 |

### Pruebas que provocan una violación real de la base

El TPI pide al menos 8 pruebas automáticas, de las cuales al menos 3 deben
provocar la violación de una regla de la base y verificar el código de
respuesta. Estas seis lo hacen contra PostgreSQL real, no contra simulaciones:

| Prueba | Regla | SQLSTATE | HTTP |
|---|---|---|---|
| `test_venta_sin_stock_devuelve_409_sin_dejar_datos` | RN-09 | P0001 | 409 |
| `test_transferencia_sin_stock_devuelve_409` | RN-11 | P0001 | 409 |
| `test_cambio_de_estado_invalido_devuelve_409` | RN-10/RN-11 | P0001 | 409 |
| `test_composicion_que_no_suma_100_devuelve_409` | RN-05 | P0001 | 409 |
| `test_precio_negativo_devuelve_422` | RN-01/RN-15 | 23514 | 422 |
| `test_referencia_inexistente_devuelve_409` | FK | 23503 | 409 |

Además `test_cliente_con_nro_doc_duplicado_devuelve_409` (23505 / 409).

Cada una comprueba también que **no quedan datos a medias**: la prueba de
stock insuficiente verifica que el comprobante no se creó, que no se agregó
ningún renglón y que el stock de la sala quedó intacto.

Si la base no está disponible, las pruebas de integración se omiten (`skip`)
en lugar de fallar, para no romper la suite en un equipo recién clonado.

---

## 7. Demostración de inyección SQL fallida

Paso 9 de la etapa 6. Se envía un valor malicioso a un endpoint con filtro y se
comprueba que, por estar parametrizada, se trata como un texto simple.

El filtro por cepa se resuelve con una consulta parametrizada:

```sql
EXISTS (
    SELECT 1
    FROM composicion_vino AS cv
    JOIN cepa AS c ON c.id_cepa = cv.id_cepa
    WHERE cv.cod_vino = v.cod_vino
      AND c.nombre ILIKE %s
)
```

El valor viaja como parámetro (`%s`), nunca concatenado en el texto SQL.

Evidencia obtenida ejecutando los payloads contra el front desplegado
(`http://127.0.0.1:5173/api/vinos?cepa=...`):

| Payload | HTTP | Total devuelto |
|---|---|---|
| `' OR 1=1--` | 200 | 0 |
| `'; DROP TABLE vino; --` | 200 | 0 |
| `1' UNION SELECT NULL,NULL,NULL,NULL,NULL,NULL,NULL--` | 200 | 0 |
| `%` (comodín legítimo) | 200 | 300 |

El catálogo real tiene 300 vinos. Con el payload malicioso el total es 0: la
consulta **no se ejecutó como SQL**, se trató como texto. Después de los
intentos, la tabla `vino` conserva sus 300 filas.

---

## 8. Ejecución con Docker

Un solo comando levanta base, API y front:

```bash
docker compose up -d --build
```

| Servicio | Puerto | Dirección |
|---|---|---|
| Base de datos | 5433 | `127.0.0.1:5433` |
| API REST | 8000 | `http://127.0.0.1:8000` |
| Front | 5173 | `http://127.0.0.1:5173` |

El front consume la API por el proxy `/api` de Nginx, de modo que no hace
falta configurar CORS ni recompilar el front al cambiar la URL.

Para aplicar las migraciones sobre la base del contenedor:

```bash
docker compose --profile setup run --rm migrar
```

---

## 9. Problemas encontrados y corregidos

| Problema | Causa | Corrección |
|---|---|---|
| `POST /clientes` devolvía 422 | `cliente.descuento` es NOT NULL y la API no lo mandaba | Trigger `trg_cliente_descuento` (RN-06) que la base completa según el tipo |
| Venta sin stock devolvía 422 en vez de 409 | El trigger usaba `23514` (código de CHECK) | `ERRCODE = 'P0001` en las reglas de negocio |
| El mensaje de la regla se perdía | Dos políticas de error distintas | Módulo único `app/errores.py` |
| El cliente no creaba su fila de subtipo | El INSERT solo tocaba `cliente` | Se escribe el subtipo según el tipo, con sus datos propios |
| `DELETE` de una transferencia fallaba | El trigger RN-12 bloqueaba el borrado en cascada | El trigger permite el `DELETE` cuando la cabecera ya no existe |
| La API no arrancaba con `uvicorn` | `etapa6_valen` estaba fuera de `api/` y no entraba en `sys.path` | Módulo movido a `api/app/operaciones/` |
| `audit_precio` sin permisos | Faltaba el `GRANT` en `007_roles.sql` | `GRANT` en `009_etapa6_api.sql` |
| Reporte S6 sin depósito ni sala | La consulta solo miraba `stock_sala` | Consulta parametrizada por sala, tal como la consigna S6 |
| La build de Docker fallaba en Windows | OneDrive marca los archivos como *placeholder* y el contexto no los podía leer | Los archivos se materializan; no es un problema del proyecto |

---

## 10. Criterios de aceptación de la etapa 6

| Criterio | Estado | Evidencia |
|---|---|---|
| Un solo comando levanta base, API y front | Cumple | `docker compose up -d --build` |
| Toda consulta parametrizada y rol sin privilegios de propietario | Cumple | `app_api` sin permiso de escritura sobre el stock |
| Venta sin stock devuelve error claro (409) y no deja datos a medias | Cumple | `RN-09: stock insuficiente...`, stock intacto |
| Las pruebas pasan y cubren errores de las reglas de la base | Cumple | 44 pruebas, 7 con violación real |
| La documentación de la API está disponible y es coherente | Cumple | Swagger en `/docs`, este documento |

---

## 11. Pendiente para las etapas siguientes

- **Etapa 7 (Front):** el catálogo de vinos y el formulario de alta ya están
  construidos y conectados a la API. Faltan las pantallas de ventas,
  transferencias y tablero.
- **Etapa 8 (Nube):** desplegar base, API y front con URL pública HTTPS,
  conexión cifrada, backup y restauración probados.
- **Etapa 9 (Documentación):** consolidar este informe en el informe final.
