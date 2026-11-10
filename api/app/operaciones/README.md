# Operaciones transaccionales de la API (Etapa 6 — tareas 3 y 4)

Módulo de la API que implementa las operaciones con más de una sentencia:
comprobantes, ingresos y transferencias.

## Módulos

| Archivo | Responsabilidad |
|---|---|
| `comprobantes.py` | Creación de comprobantes con sus renglones, en una sola transacción |
| `ingresos.py` | Alta de ingresos, carga de renglones, cierre y procesamiento |
| `transferencias.py` | Alta de transferencias, carga de renglones, cierre y procesamiento |
| `api_rutas.py` | Rutas FastAPI de las operaciones |

La traducción de errores de PostgreSQL a respuestas HTTP vive en un único
módulo de toda la API: `app/errores.py`. No hay una política por módulo.

## Cómo se conecta con la base

El acceso es con **psycopg2** (driver nativo) y **consultas parametrizadas**.
No hay ORM ni query builder: el SQL está escrito a mano y es visible.

Las reglas de stock, precios, descuentos y estados **no se recalculan en
Python**. Permanecen en PostgreSQL:

- El precio unitario, el descuento y el subtotal de cada renglón los calcula el
  trigger `trg_registrar_venta` (RN-08, RN-09).
- Los totales del comprobante los calcula `fn_trg_actualizar_totales_comprobante`.
- El descuento vigente del cliente lo completa `trg_cliente_descuento` (RN-06).
- Los cambios de estado y el impacto en el stock los hacen los procedimientos
  `sp_terminar_ingreso`, `sp_terminar_transferencia`, `sp_procesar_ingreso` y
  `sp_procesar_transferencia`.

Si una operación falla a mitad de camino, la transacción se revierte completa:
no queda cabecera, ni renglones, ni stock a medias.

## Endpoints

- `POST /comprobantes`
- `GET /comprobantes/{numero}`
- `POST /ingresos`
- `POST /ingresos/{codigo}/renglones`
- `POST /ingresos/{codigo}/terminar`
- `POST /ingresos/{codigo}/procesar`
- `POST /transferencias`
- `POST /transferencias/{numero}/renglones`
- `POST /transferencias/{numero}/terminar`
- `POST /transferencias/{numero}/procesar`

## Integración con la aplicación

`api_rutas.py` expone:

```python
crear_router(obtener_conexion)
```

La dependencia `obtener_conexion` entrega una conexión del pool
(`app.dependencies.get_db_connection`) y garantiza su devolución al pool.

El router ya está registrado en `app/main.py`:

```python
app.include_router(crear_router(get_db_connection))
```

## Pruebas

Las pruebas unitarias de este módulo están en `tests/test_etapa6_valen.py` y
las de integración contra PostgreSQL real en `tests/test_api_integracion.py`.

```powershell
uv run pytest tests/ -v
```

La base utilizada en las pruebas de integración es la del proyecto, con la
misma configuración que `.env`.
