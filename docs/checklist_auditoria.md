# Bodegas del Atuel — Checklist de auditoría

**Situaciones que descuentan puntos según la rúbrica oficial** (TPI, sección 9).

Este documento reemplaza al informe previo, que describía un estado anterior
del proyecto. Cada punto fue **verificado ejecutando el proyecto**, no leyendo
el código.

**Fecha de la verificación:** 10 de noviembre de 2026
**Commit verificado:** `a405d76` (etapa 7 completa)

---

## Resumen

| # | Situación | Estado |
|---|---|---|
| 1 | Uso de ORM o herramientas que generan SQL | **Cumple** |
| 2 | Secretos publicados en Git | **Cumple** |
| 3 | La base no se puede crear desde cero | **Cumple** |
| 4 | La API se conecta con el propietario o un superusuario | **Cumple** |
| 5 | Totales, descuentos o stock calculados en la API o el front | **Cumple** |
| 6 | Historial de Git con un solo integrante | **Cumple** |

---

## 1. Uso de ORM o herramientas que generan SQL

**Estado: CUMPLE.**

No hay ningún ORM ni constructor de consultas en el proyecto. Todo el SQL está
escrito a mano y parametrizado.

- Dependencias de Python: `fastapi`, `psycopg2-binary`, `python-dotenv`,
  `uvicorn`, `faker`, `pytest`. Nada de SQLAlchemy, Tortoise, Peewee o Django.
- Dependencias del front: `react`, `react-dom`, `react-router-dom`, `vite`,
  `tailwindcss`. No hay Prisma, TypeORM, Sequelize ni Knex.
- Acceso a datos: `psycopg2.pool.ThreadedConnectionPool`.
- Capa de acceso: `api/app/repositories/`, una función por consulta, con
  parámetros `%s`.

**Acción preventiva a mantener:** seguir escribiendo sentencias SQL directas.
No incorporar librerías de abstracción.

> El informe anterior mencionaba `psycopg_pool` (psycopg 3). El proyecto usa
> **psycopg2** con su propio pool. El objetivo de la consigna —SQL a mano, sin
> ORM— se cumple igual.

---

## 2. Secretos (contraseñas, cadenas de conexión) publicados en Git

**Estado: CUMPLE.**

- `.gitignore` incluye `.env`, y `git check-ignore -v .env` lo confirma.
- `.env.example` solo tiene valores de ejemplo (`CAMBIAR_ESTA_CONTRASENA`).
- `compose.yaml` **no** tiene ninguna contraseña fija: todo viene de
  variables de entorno (`${POSTGRES_PASSWORD}`, `${API_DB_PASSWORD}`).
- Se revisaron **todos los blobs de todo el historial** de Git: no hay
  ninguna contraseña real. La única coincidencia es
  `docs/pruebas-docker.md` con el placeholder `CONTRASENA_LOCAL`.
- Nunca se subió un archivo `.env` real.

**Verificación:**

```console
$ git log --all --full-history --name-only --pretty=format: | Select-String "^\.env$"
  (vacío)

$ git check-ignore -v .env
.gitignore:54:.env	.env
```

**Para la etapa 8 (nube):** las credenciales reales se cargan como *Environment
Variables* en el panel del proveedor. Nunca en un archivo del repositorio.

---

## 3. La base no se puede crear desde cero con los archivos entregados

**Estado: CUMPLE.**

Se verificó con una prueba de fuego real: se borró el volumen
(`docker compose down -v`) y se levantó todo de cero.

```console
$ docker compose down -v
$ docker compose up -d --build
 ==> Aplicando migraciones en bodegas_atuel
  ==> Base inicializada correctamente.
```

Resultado: 32 tablas, 11 triggers, 3 vistas, 20 funciones y el rol `app_api`
creado y funcional. La API responde `/salud` con 200.

### Numeración de las migraciones

El informe anterior señalaba que `004_datos_prueba.sql` y
`004_procedimientos.sql` compartían prefijo y que eso podía abortar la carga.
**El riesgo era real pero la consecuencia no:** el orden alfabético funciona
porque `004_datos_prueba.sql` solo usa `fn_calcular_descuento_cliente`, que
está en `003_funciones.sql`, que corre antes.

Aun así se resolvió de la forma más limpia:

- `004_datos_prueba.sql` se movió a `database/tests/datos_prueba.sql`. No es
  una migración: son datos de prueba, y su presencia en el esquema impedía
  ejecutar la carga masiva (el generador exige una base vacía).
- La numeración quedó estrictamente lineal, de `001` a `009`.

### Arranque en un solo comando

El TPI pide que un solo comando levante base y API. Se cumple:

```powershell
docker compose up -d --build
```

- `docker/initdb/00-inicializar.sh` aplica las migraciones la primera vez que
  se crea el volumen.
- El servicio `rol` sincroniza la contraseña de `app_api` con la del `.env` en
  cada arranque, para que la API nunca quede sin poder conectarse.
- El *healthcheck* de la base verifica que el esquema exista, no solo que
  PostgreSQL acepte conexiones.

---

## 4. La API se conecta con el usuario propietario o con un superusuario

**Estado: CUMPLE.**

La API se conecta con `app_api`, un rol con privilegios mínimos. No usa
`postgres`.

**Verificación con la base en ejecución:**

```console
$ docker compose exec -T db psql -U postgres -d bodegas_atuel \
    -c "SELECT DISTINCT usename FROM pg_stat_activity WHERE datname='bodegas_atuel';"
 usname
-----------
 app_api
 postgres      ← la sesión del propio psql de verificación

$ docker compose exec -T db psql -U postgres -d bodegas_atuel \
    -c "SET ROLE app_api; UPDATE stock_sala SET cantidad=999 WHERE id_sala=1 AND cod_vino=1;"
ERROR:  permission denied for table stock_sala
```

El rol **no puede** modificar el stock ni los totales:

| Tabla | Privilegios de `app_api` |
|---|---|
| `stock_sala`, `stock_deposito` | `SELECT` únicamente |
| `comprobante`, `renglon_comprobante` | `SELECT`, `INSERT` |
| `vino`, `cliente` y subtipos | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

El descuento del cliente, el total del comprobante y el descuento del stock los
calculan exclusivamente los triggers y procedimientos.

**Sobre `app_api` y `app_rw`:** el informe anterior mencionaba un rol
`app_rw` que nunca existió en este proyecto. El rol real se llama `app_api`
(creado en `009_etapa6_api.sql`). Lo importante para la rúbrica no es el
nombre, sino que la API no entre como propietario ni como superusuario.

**El servicio `rol` previene un problema real:** si la contraseña del rol queda
desincronizada con el `.env`, la API entra en un bucle de reinicio con
`password authentication failed` y el proyecto no levanta. Como la
sincronización es automática en cada arranque, ese escenario ya no puede
producirse.

---

## 5. Totales, descuentos o stock calculados en la API o en el front

**Estado: CUMPLE.**

### En la API

- No hay ningún `UPDATE` sobre `stock_sala`, `stock_deposito`, `comprobante`
  ni `renglon_comprobante` en `api/app/`.
- `app_api` no tiene permiso de `UPDATE` sobre esas tablas (ver tabla
  anterior): no podría hacerlo aunque quisiera.
- Los cambios de estado llaman a los procedimientos:

```python
# api/app/operaciones/transferencias.py
cursor.execute("CALL public.sp_procesar_transferencia(%s)", (numero_solicitud,))
```

### En el front

- No hay multiplicaciones `cantidad * precio` ni cálculos de subtotales.
- No se aplica descuento por tipo de cliente: el front solo **muestra** el
  porcentaje como etiqueta informativa.
- No se descuenta stock.

Los importes que aparecen en pantalla son los que devuelve la API, que a su
vez los calcula PostgreSQL:

```console
API:      subtotal 78600.76  descuento 7860.08  total 70740.68
Base:     (Decimal('78600.76'), Decimal('7860.08'), Decimal('70740.68'))
```

**Verificación:** una venta sin stock devuelve `409` con el mensaje de la regla
y no deja datos a medias:

```console
$ curl -X POST http://127.0.0.1:5173/api/comprobantes -H "Content-Type: application/json" \
    -d '{"id_cliente":1,"id_sala":1,"renglones":[{"cod_vino":176,"cantidad":99999}]}'
{"detail":"RN-09: stock insuficiente para el vino 176 en la sala 1","sqlstate":"P0001"}

comprobantes antes/después: 150000 / 150000 | stock antes/después: 329 / 329
```

---

## 6. Historial de Git con un solo integrante

**Estado: CUMPLE.**

```console
$ git shortlog -sne --all
   348  Sol Parada <solparada10@outlook.com>
    15  Valentina <muzasvallejov@gmail.com>
     5  Sol Parada <138259612+sol-parada@users.noreply.github.com>
```

Los dos integrantes tienen commits en el historial.

> El `INFORME DE CONTEXTO DEL PROYECTO.txt` original mencionaba que el
> repositorio se había recreado desde cero con un único commit, lo que había
> borrado la autoría anterior. Hoy el historial conserva los commits de
> ambos integrantes.

---

## Requisitos de la etapa 2 verificados

Además de la rúbrica, se comprobó que la base cumple todos los mínimos de la
etapa 2 del TPI:

| Elemento | Mínimo | Actual |
|---|---|---|
| Tipos ENUM | 1 | 4 |
| Dominios | 1 | 1 (`cuit_dom`) |
| Funciones | 4 | 5 |
| Procedimientos transaccionales | 2 | 4 |
| Triggers (con BEFORE, AFTER y constraint diferido) | 6 | 11 (1 diferido) |
| Vistas | 3 | 3 |
| Restricciones CHECK | 8 | 16 |
| Restricciones UNIQUE adicionales | 4 | 9 |
| Columnas con DEFAULT | 3 | 15 |

Las quince reglas de negocio tienen su mecanismo identificado en
`docs/trazabilidad_etapa2.md` y su caso de prueba verificado en
`database/tests/reglas_negocio_etapa2.sql`.

```console
$ docker compose exec -T db bash /pruebas_script/ejecutar_pruebas.sh
  RESULTADO: OK   (fixtures)
  RESULTADO: OK   (reglas RN-01 a RN-15)
  RESULTADO: OK   (suite de etapa 2)
  TODAS LAS PRUEBAS SQL PASARON
```
