
# Etapa 3 — Generación y carga masiva de datos

## Proyecto Integrador: Bodegas del Atuel

## 1. Descripción

El archivo `etapa3.py` genera e inserta datos de prueba en
PostgreSQL respetando el esquema, las restricciones y las
reglas de negocio implementadas en las Etapas 1 y 2.

El generador utiliza:

- Python.
- Faker para generar datos sintéticos.
- psycopg2 para conectarse a PostgreSQL.
- execute_values para realizar inserciones por lotes.
- Archivos CSV del repositorio para los catálogos.
- Una semilla fija para reproducir los datos sintéticos.

La carga se realiza respetando las dependencias entre tablas.

## 2. Requisitos

- Python 3.
- PostgreSQL 16.
- Docker Desktop, si se utiliza el entorno con contenedores.
- Dependencias declaradas en requirements.txt.

Desde la raíz del proyecto:

```powershell
python -m pip install -r requirements.txt
```

## 3. Configuración de la conexión

Crear un archivo `.env` en la raíz del proyecto tomando
como referencia `.env.example`.

El generador utiliza las siguientes variables:

```env
POSTGRES_DB=bodegas_atuel
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CAMBIAR_POR_CONTRASENA_LOCAL
POSTGRES_PORT=5432
DB_HOST=127.0.0.1
```

Los valores deben coincidir con la instalación local de
PostgreSQL o con la configuración del contenedor Docker.

Si Docker publica otro puerto, se debe utilizar ese puerto
en POSTGRES_PORT.

El archivo `.env` contiene información local y no debe
subirse al repositorio.

Las variables de entorno previamente definidas en el
sistema pueden prevalecer sobre las del archivo `.env`.

## 4. Preparación de PostgreSQL

El repositorio incluye un archivo `compose.yaml`
para ejecutar PostgreSQL mediante Docker.

Con el archivo `.env` configurado, desde la raíz:

```powershell
docker compose up -d
```

Verificar el estado:

```powershell
docker compose ps
```

### Entorno aislado de pruebas

El archivo `compose.etapa3.yaml` permite iniciar un contenedor
PostgreSQL 16 independiente del entorno principal del proyecto.

Antes de iniciar el contenedor se debe definir la variable
`ETAPA3_DB_PASSWORD`.

En PowerShell:

```powershell
$env:ETAPA3_DB_PASSWORD = Read-Host "Contraseña para PostgreSQL"
docker compose -f compose.etapa3.yaml up -d
```

Este entorno publica PostgreSQL en `127.0.0.1:5433`.

Para conectarse desde Python se deben configurar:

- `POSTGRES_DB`: bodegas_etapa3_test
- `POSTGRES_USER`: postgres
- `POSTGRES_PORT`: 5433
- `DB_HOST`: 127.0.0.1
- `POSTGRES_PASSWORD`: la misma contraseña del contenedor

El volumen Docker conserva los datos entre reinicios.

No ejecutar el generador sobre una base que ya contenga registros.

Antes de ejecutar el generador se deben aplicar,
en orden, las migraciones correspondientes:

1. 001_esquema.sql
2. 002_constraints.sql
3. 003_funciones.sql
4. 004_procedimientos.sql
5. 005_triggers.sql
6. 006_vistas.sql
7. 007_roles.sql

Los archivos se encuentran en `database/migrations/`.

No se debe ejecutar `004_datos_prueba.sql` antes de
la carga masiva porque inserta datos adicionales.

La base debe contener la estructura y las reglas de
negocio, pero no registros de prueba.

## 5. Catálogos CSV

El generador utiliza archivos de la carpeta `data/`:

- cepas.csv
- maridajes.csv
- departamentos.csv
- localidades.csv

Las rutas se calculan respecto de la ubicación del
proyecto, por lo que no dependen de una carpeta
particular de Windows.

## 6. Ejecución del generador

Desde la raíz del repositorio:

```powershell
python database/seed/etapa3.py
```

El script verifica que las tablas del esquema public
estén vacías antes de comenzar.

Si detecta registros existentes, interrumpe la ejecución
para evitar duplicaciones.

No debe ejecutarse sobre una base con información real
ni sobre una base compartida sin autorización.

## 7. Modos de ejecución

Al principio de `etapa3.py` se encuentra:

```python
MODO_PRUEBA = True
```

### Prueba reducida

Con `MODO_PRUEBA = True` se generan:

- 100 comprobantes.
- 350 renglones de comprobante.

Este modo sirve para comprobar el funcionamiento
del generador antes de realizar la carga completa.

### Carga definitiva

Para realizar la carga completa:

```python
MODO_PRUEBA = False
```

Los objetivos son:

- 150.000 comprobantes.
- 500.000 renglones de comprobante.

La carga definitiva también exige que:

- Todas las tablas tengan registros.
- Al menos tres tablas superen los 10.000 registros.
- Al menos una tabla supere los 100.000 registros.

Cada ejecución debe realizarse sobre una base
correctamente preparada y sin datos previos.

## 8. Procesamiento de mercadería

El generador utiliza procedimientos almacenados
de la Etapa 2 para procesar los ingresos y
las transferencias de mercadería.

Los procedimientos actualizan las existencias
del depósito y de las salas de venta.

En las ventas intervienen los triggers de PostgreSQL
para actualizar stocks e importes.

## 9. Validaciones

Al finalizar, el generador comprueba:

- Cantidades de registros.
- Existencia de datos en las tablas.
- Stocks no negativos.
- Totales de comprobantes.
- Relaciones entre comprobantes y clientes.
- Relaciones entre renglones y comprobantes.
- Relaciones entre transferencias y salas.
- Relaciones entre lotes y parcelas.
- Composiciones de vinos.
- Funcionamiento de la auditoría de precios.

Si ocurre un error, se interrumpe la carga y la
transacción se revierte.

## 10. Comparación de rendimiento

El archivo `benchmark_etapa3.py` permite comparar
inserciones individuales con inserciones por lotes.

Ejecutar:

```powershell
python database/seed/benchmark_etapa3.py
```

El benchmark utiliza una tabla temporal y no modifica
las tablas permanentes del proyecto.

Los tiempos medidos se documentan en:

`docs/etapa3_carga_masiva.md`


## 11. Respaldo y restauración de PostgreSQL

Una vez completada y validada la carga masiva,
se debe generar un respaldo de la base de datos.

### Generar el respaldo

El siguiente ejemplo utiliza un contenedor Docker
con PostgreSQL y una base llamada bodegas_atuel.

```bash
docker exec NOMBRE_CONTENEDOR pg_dump \
  -U postgres \
  -d bodegas_atuel \
  --clean \
  --if-exists \
  -f /tmp/dump_completo.sql
```

Comprimir el respaldo:

```bash
docker exec NOMBRE_CONTENEDOR gzip -f /tmp/dump_completo.sql
```

Copiarlo a la computadora:

```bash
docker cp NOMBRE_CONTENEDOR:/tmp/dump_completo.sql.gz ./dump_completo.sql.gz
```

Reemplazar NOMBRE_CONTENEDOR y bodegas_atuel por
los valores correspondientes al entorno utilizado.

### Restaurar el respaldo

Crear primero una base de datos vacía:

```bash
docker exec NOMBRE_CONTENEDOR createdb \
  -U postgres bodegas_restauracion
```

Copiar el respaldo al contenedor:

```bash
docker cp dump_completo.sql.gz NOMBRE_CONTENEDOR:/tmp/dump_completo.sql.gz
```

Restaurar los datos:

```bash
docker exec NOMBRE_CONTENEDOR sh -c \
  'gzip -dc /tmp/dump_completo.sql.gz | psql -X -v ON_ERROR_STOP=1 -U postgres -d bodegas_restauracion'
```

La restauración debe realizarse sobre una base
de prueba vacía, sin información importante.

### Verificación realizada

Se restauró correctamente un respaldo de la carga
masiva anterior a la incorporación de los CSV.

Los conteos recuperados fueron:

| Tabla | Registros |
|---|---:|
| cliente | 20.000 |
| comprobante | 150.000 |
| renglon_comprobante | 500.000 |

La restauración finalizó correctamente y los
conteos principales coincidieron con el origen.


### Respaldo definitivo actualizado

El 09/11/2026 se generó un nuevo respaldo después
de ejecutar la carga masiva definitiva con los
catálogos CSV actuales.

Base de origen:

`bodegas_etapa3_validacion_final`

Base utilizada para la restauración:

`bodegas_etapa3_restauracion_final`

La restauración finalizó correctamente.

Se verificaron las cantidades y las huellas
de contenido de las 29 tablas, sin detectar
diferencias.

También se comprobaron los valores de las
13 secuencias, que coincidieron entre ambas bases.

Los comandos ejecutados y los resultados están
documentados en:

`docs/etapa3_carga_masiva.md`, sección 5.6.

Los archivos .sql.gz no deben subirse a GitHub.



## 12. Reproducibilidad

El generador utiliza una semilla fija para permitir
la reproducción determinística de los datos
sintéticos, sus cantidades y relaciones, siempre
que se mantengan las mismas condiciones de ejecución.

### 12.1. Fechas automáticas y RN-11

Las fechas de las transferencias y los comprobantes
corresponden al día real de ejecución.

La regla de negocio RN-11, implementada mediante
un trigger de PostgreSQL en la Etapa 2, establece
obligatoriamente `CURRENT_DATE` para las
transferencias.

Para mantener la coherencia temporal entre las
transferencias y las ventas, el generador conserva:

`fecha_venta = date.today()`

### 12.2. Alcance de la reproducibilidad

La semilla fija permite reproducir los datos
sintéticos y sus relaciones bajo las mismas
condiciones de ejecución.

Sin embargo, las fechas automáticas relacionadas
con RN-11 pueden variar cuando la carga se realiza
en días diferentes.

Por lo tanto, la reproducibilidad determinística
no incluye dichas fechas automáticas.

### 12.3. Decisión adoptada

Se acordó mantener `date.today()` para los
comprobantes y respetar el comportamiento
original del trigger RN-11.

No se modifican los archivos compartidos:

- `database/migrations/001_esquema.sql`
- `database/migrations/005_triggers.sql`

La decisión queda resuelta y documentada.



## 13. Resultados y evidencia

Los resultados de las cargas, las validaciones
de integridad y las mediciones de rendimiento
se documentan en:

`docs/etapa3_carga_masiva.md`

### 13.1. Ejecución definitiva con CSV

El 09/11/2026 se registró una ejecución completa
del generador actualizado, utilizando los catálogos
CSV del repositorio.

Los resultados principales fueron:

- 150.000 comprobantes generados.
- 500.000 renglones de comprobante.
- 20.000 clientes.
- 2.000 ingresos procesados.
- 2.000 transferencias procesadas.

La ejecución finalizó con código de salida 0
y las validaciones de integridad informaron
cero inconsistencias.

Estos resultados corresponden a la ejecución
documentada de esa fecha. La correspondencia
exacta con el código y los CSV de la entrega
se confirmará mediante las validaciones finales.

Los resultados anteriores a la incorporación
de los catálogos CSV se conservan como
antecedentes y se distinguen de esta ejecución.

## 14. Control de versiones

El desarrollo de la Etapa 3 se realiza en la rama:

`valen/etapa3`

Los cambios deben revisarse y probarse antes
de cualquier integración con otras ramas.
