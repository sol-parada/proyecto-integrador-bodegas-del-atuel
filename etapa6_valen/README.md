
# Etapa 6 — Tareas 3 y 4

## Bodegas del Atuel

Implementación independiente de operaciones transaccionales,
manejo de errores, validaciones y pruebas de la API REST.

**Rama:** `valen/etapa6`

## Tarea 3 — Operaciones transaccionales

Módulos implementados:

- `comprobantes.py`: creación de comprobantes con sus renglones.
- `ingresos.py`: creación de ingresos, incorporación de renglones, finalización y procesamiento.
- `transferencias.py`: creación de transferencias, incorporación de renglones, finalización y procesamiento.

Las operaciones utilizan psycopg2 y consultas parametrizadas.

Las reglas de stock, precios, descuentos y estados permanecen
en PostgreSQL, mediante triggers y procedimientos almacenados.

## Endpoints HTTP

- POST /comprobantes
- GET /comprobantes/{numero}
- POST /ingresos
- POST /ingresos/{codigo}/renglones
- POST /ingresos/{codigo}/terminar
- POST /ingresos/{codigo}/procesar
- POST /transferencias
- POST /transferencias/{numero}/renglones
- POST /transferencias/{numero}/terminar
- POST /transferencias/{numero}/procesar

## Tarea 4 — Errores, validaciones y documentación

El módulo `errores.py` traduce códigos SQLSTATE a respuestas HTTP.

Se implementaron validaciones de datos con Pydantic y
documentación OpenAPI mediante FastAPI.

## Pruebas realizadas

- 26 pruebas automáticas aprobadas con pytest.
- Venta exitosa con PostgreSQL real.
- Venta rechazada por stock insuficiente.
- Rollback real desde Python.
- Ingreso procesado correctamente.
- Transferencia procesada correctamente.
- Transferencia rechazada por stock insuficiente.
- Verificación de inventario después de operaciones fallidas.
- Consulta real de comprobantes mediante HTTP.
- Respuesta HTTP 422 ante stock insuficiente.
- Generación de OpenAPI con 10 rutas.

Base utilizada: `bodegas_etapa6_test`.

Las pruebas SQL y HTTP de integración se ejecutaron
manualmente. No forman parte todavía de la suite
automatizada de pytest.

## Ejecutar pruebas unitarias

Desde la raíz del repositorio:

    uv run python -m pytest tests/test_etapa6_valen.py -v

## Integración con la API principal

El módulo `api_rutas.py` expone:

    crear_router(obtener_conexion)

La aplicación principal debe proporcionar una dependencia
FastAPI que entregue una conexión psycopg2 y garantice su
devolución al pool de conexiones.

Posteriormente debe registrar el router:

    app.include_router(crear_router(obtener_conexion))

La integración debe verificarse con la estructura real
de la API desarrollada por el resto del equipo.

## Pendientes de integración

- Conectar el router al pool de conexiones oficial.
- Validar permisos con el rol limitado de la API.
- Probar los endpoints integrados con la aplicación principal.
- Verificar el despliegue completo mediante Docker Compose.
- Automatizar las pruebas de integración contra PostgreSQL.

Los archivos de esta rama fueron desarrollados de forma
independiente, sin fusionar la rama main.