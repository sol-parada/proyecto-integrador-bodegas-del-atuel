
# Etapa 3 — Carga masiva de datos
## Proyecto Integrador: Bodegas del Atuel

## 1. Comparación de rendimiento

Se realizó una prueba de rendimiento utilizando PostgreSQL 16, Python, psycopg2 y execute_values.

Ambas modalidades insertaron 10.000 registros en una tabla temporal, sin modificar las tablas permanentes del proyecto.

| Método | Tiempo |
|---|---:|
| Inserción individual | 20,4937 segundos |
| Inserción por lotes | 0,1399 segundos |

**Cantidad de registros:** 10.000.

**Tamaño de lote:** 1.000 registros.

**Factor de aceleración:** 146,46 veces.

La inserción por lotes resultó considerablemente más rápida en las condiciones de esta prueba.

La medición no incluye los triggers ni las reglas de negocio específicas de las ventas. Por lo tanto, estos resultados no representan el tiempo total de la carga masiva del proyecto.

## 2. Resultados de la carga masiva

Se realizó una carga completa utilizando PostgreSQL 16, Python, Faker y psycopg2.

### 2.1. Cantidades registradas en una ejecución histórica

Esta tabla conserva una ejecución anterior a la incorporación
de los catálogos CSV y no representa los resultados definitivos.

| Tabla | Registros |
|---|---:|
| localidad | 6 |
| sala_venta | 15 |
| empleado | 300 |
| bodega | 10 |
| cepa | 12 |
| finca | 50 |
| parcela | 503 |
| lote_uva | 4.024 |
| analisis_calidad | 8.073 |
| vino | 300 |
| composicion_vino | 598 |
| maridaje | 12 |
| vino_maridaje | 619 |
| cliente | 20.000 |
| cliente_socio | 6.680 |
| cliente_distribuidor | 6.726 |
| cliente_exportador | 6.594 |
| permiso_exportacion | 19.627 |
| transportista | 15 |
| transportista_cobertura | 45 |
| stock_deposito | 300 |
| ingreso | 2.000 |
| renglon_ingreso | 6.982 |
| transferencia | 2.000 |
| renglon_transferencia | 11.049 |
| stock_sala | 4.500 |
| comprobante | 150.000 |
| renglon_comprobante | 500.000 |
| auditoria_precio | 1 |

### 2.2. Requisitos de volumen

Se verificó que cinco tablas superaron los 10.000 registros:

- cliente: 20.000 registros.
- permiso_exportacion: 19.627 registros.
- renglon_transferencia: 11.049 registros.
- comprobante: 150.000 registros.
- renglon_comprobante: 500.000 registros.

Además, dos tablas superaron los 100.000 registros:

- comprobante: 150.000 registros.
- renglon_comprobante: 500.000 registros.

La ejecución cumplió los requisitos mínimos de volumen establecidos para la Etapa 3.

### 2.3. Validaciones de integridad

La ejecución informó los siguientes resultados:

| Validación | Inconsistencias |
|---|---:|
| Stocks negativos | 0 |
| Comprobantes con importes incorrectos | 0 |
| Comprobantes sin cliente | 0 |
| Renglones sin comprobante | 0 |
| Transferencias sin sala | 0 |
| Lotes sin parcela | 0 |
| Composiciones incorrectas | 0 |

Los 2.000 ingresos y las 2.000 transferencias fueron procesados mediante los procedimientos almacenados desarrollados en la Etapa 2.

Esto permitió utilizar la lógica de negocio implementada en PostgreSQL para administrar los movimientos de mercadería y actualizar los stocks.

### 2.4. Auditoría de precios

Durante la ejecución se generó y verificó un registro de auditoría correspondiente a una modificación de precio.

La prueba permitió comprobar el funcionamiento del trigger de auditoría implementado en la Etapa 2.

**Registros de auditoría generados:** 1.

### 2.5. Resultado de la ejecución

La carga masiva finalizó correctamente, superó las validaciones ejecutadas y confirmó los datos en PostgreSQL.

Los resultados definitivos y vigentes se encuentran en la sección 5.


### 2.6. Prueba reducida con catálogos CSV

Después de incorporar las correcciones solicitadas,
se ejecutó nuevamente el generador sobre una base
vacía con PostgreSQL 16.

Se utilizó MODO_PRUEBA = True.

| Componente | Registros |
|---|---:|
| Cepas | 8 |
| Maridajes | 7 |
| Fincas | 50 |
| Parcelas | 499 |
| Clientes | 20.000 |
| Ingresos procesados | 2.000 |
| Transferencias procesadas | 2.000 |
| Renglones de transferencia | 10.907 |
| Comprobantes | 100 |
| Renglones de comprobante | 350 |
| Auditorías de precios | 1 |

La prueba confirmó que los catálogos CSV se insertaron
correctamente y que el generador respetó las relaciones
entre tablas.

Los controles de stock, importes e integridad
referencial finalizaron sin inconsistencias.

La transacción fue confirmada en PostgreSQL.


Esta prueba permitió validar inicialmente el
funcionamiento del generador actualizado en modo
reducido.

Posteriormente, el 09/11/2026, se ejecutó la
carga masiva definitiva con los catálogos CSV.
Sus resultados están documentados en la sección 5.

## 3. Estado de verificaciones

- [x] Lectura e inserción de los cuatro catálogos CSV.
- [x] Carga definitiva de 150.000 comprobantes.
- [x] Carga definitiva de 500.000 renglones.
- [x] Conteos definitivos de las 29 tablas.
- [x] Integridad referencial y reglas de stock.
- [x] Consistencia de importes de comprobantes.
- [x] Medición del tiempo total de ejecución.
- [x] Generación y restauración del respaldo anterior.
- [x] Generación del respaldo de la carga actualizada.
- [x] Verificación de restauración del respaldo actualizado.
- [x] Acuerdo sobre fechas y regla RN-11, documentado en la sección 4.
- [x] Revisión final del repositorio y entrega.

## 4. Reproducibilidad de datos y coherencia con RN-11

El generador utiliza una semilla fija para reproducir
los datos sintéticos, sus cantidades y relaciones,
siempre que se mantengan las mismas condiciones
de ejecución.

### 4.1. Tratamiento de las fechas

Las fechas de las transferencias y los comprobantes
dependen del día real de ejecución.

Esto ocurre porque el trigger correspondiente a
la regla de negocio RN-11 establece obligatoriamente
`CURRENT_DATE` para las transferencias.

Para mantener la coherencia temporal entre las
transferencias y las ventas, el generador conserva:

`fecha_venta = date.today()`

### 4.2. Alcance de la reproducibilidad

La semilla fija permite reproducir los datos
sintéticos y sus relaciones bajo las mismas
condiciones de ejecución.

Sin embargo, las fechas automáticas dependen del
día en que se realiza la carga.

Por lo tanto, la reproducibilidad determinística
no incluye las fechas automáticas relacionadas
con la regla RN-11.

### 4.3. Decisión adoptada

Se mantiene `date.today()` para los comprobantes
y se respeta el comportamiento original del
trigger RN-11 para las transferencias.

No se modifican los archivos compartidos:

- `database/migrations/001_esquema.sql`
- `database/migrations/005_triggers.sql`

La decisión sobre el tratamiento de fechas
queda resuelta y documentada.

## 5. Ejecución definitiva con catálogos CSV

**Fecha de ejecución:** 09/11/2026.

**Base de datos:** bodegas_etapa3_test.

**Motor:** PostgreSQL 16.

**Modo:** MODO_PRUEBA = False.

La carga masiva definitiva se ejecutó utilizando la
versión actualizada de etapa3.py y los cuatro
catálogos CSV del repositorio:

- `cepas.csv`
- `maridajes.csv`
- `departamentos.csv`
- `localidades.csv`

### 5.1. Tiempo de ejecución

| Indicador | Resultado |
|---|---:|
| Tiempo total | 00:04:54.4595331 |
| Duración aproximada | 4 minutos y 54 segundos |
| Código de salida | 0 |
| Comprobantes generados | 150.000 |
| Renglones de comprobante | 500.000 |

El tiempo incluye la generación, inserción,
procesamiento de movimientos y validaciones
ejecutadas por el generador.

### 5.2. Cantidades definitivas

| Tabla | Registros |
|---|---:|
| localidad | 6 |
| sala_venta | 15 |
| empleado | 300 |
| bodega | 10 |
| cepa | 8 |
| finca | 50 |
| parcela | 499 |
| lote_uva | 3.992 |
| analisis_calidad | 8.013 |
| vino | 300 |
| composicion_vino | 617 |
| maridaje | 7 |
| vino_maridaje | 598 |
| cliente | 20.000 |
| cliente_socio | 6.681 |
| cliente_distribuidor | 6.725 |
| cliente_exportador | 6.594 |
| permiso_exportacion | 19.637 |
| transportista | 15 |
| transportista_cobertura | 45 |
| stock_deposito | 300 |
| ingreso | 2.000 |
| renglon_ingreso | 7.011 |
| transferencia | 2.000 |
| renglon_transferencia | 11.078 |
| stock_sala | 4.500 |
| comprobante | 150.000 |
| renglon_comprobante | 500.000 |
| auditoria_precio | 1 |

### 5.3. Requisitos de volumen

Cinco tablas superaron los 10.000 registros:

- cliente: 20.000.
- permiso_exportacion: 19.637.
- renglon_transferencia: 11.078.
- comprobante: 150.000.
- renglon_comprobante: 500.000.

Dos tablas superaron los 100.000 registros:

- comprobante: 150.000.
- renglon_comprobante: 500.000.

Se cumplieron los requisitos de volumen establecidos
para la Etapa 3.

### 5.4. Validaciones definitivas

| Validación | Inconsistencias |
|---|---:|
| Stocks negativos | 0 |
| Importes de comprobantes incorrectos | 0 |
| Comprobantes sin cliente | 0 |
| Renglones sin comprobante | 0 |
| Transferencias sin sala | 0 |
| Lotes sin parcela | 0 |
| Composiciones incorrectas | 0 |

Se procesaron correctamente:

- 2.000 ingresos de mercadería.
- 2.000 transferencias de mercadería.

La prueba de auditoría de precios también
finalizó correctamente.

### 5.5. Resultado final

El generador informó:

- CARGA MASIVA COMPLETADA.
- Datos confirmados en PostgreSQL.
- Validaciones ejecutadas correctamente.
- Código de salida: 0.

La ejecución definitiva con los CSV actualizados
finalizó correctamente y cumplió los requisitos
de cantidad e integridad verificados.

La generación utiliza una semilla fija para los
datos sintéticos, pero las fechas de transferencias
y comprobantes corresponden al día real de ejecución,
según la decisión documentada en la sección 4.


### 5.6. Nueva ejecución definitiva y verificación del respaldo

El 09/11/2026 se ejecutó nuevamente el generador
actualizado, utilizando los catálogos CSV actuales
y `MODO_PRUEBA = False`.

La ejecución se realizó en una base aislada:

`bodegas_etapa3_test`

  Se aplicaron las migraciones `001` a `008` de las
  Etapas 1 y 2, sin ejecutar `database/tests/datos_prueba.sql`,
  sobre una base vacía, obteniendo 29 tablas.

La carga finalizó correctamente, con código de salida 0,
en aproximadamente 5 minutos y 19 segundos.

Resultados principales:

| Tabla | Registros |
|---|---:|
| comprobante | 150.000 |
| renglon_comprobante | 500.000 |
| cliente | 20.000 |
| transferencia | 2.000 |
| cepa | 8 |
| maridaje | 7 |

Las validaciones confirmaron:

- Stocks no negativos.
- Importes de comprobantes consistentes.
- Integridad referencial sin inconsistencias.
- Datos confirmados correctamente en PostgreSQL.

#### Generación del respaldo actualizado

Se ejecutaron los siguientes comandos:

```powershell
docker exec bodegas-atuel-db pg_dump -U postgres -d bodegas_atuel --clean --if-exists -f /tmp/dump_etapa3_definitivo.sql

docker exec bodegas-atuel-db gzip -f /tmp/dump_etapa3_definitivo.sql
```

El respaldo generado fue:

`/tmp/dump_etapa3_definitivo.sql.gz`

Tamaño aproximado: 7,8 MB.

#### Restauración en una base nueva

Se creó una base descartable independiente:

```powershell
docker exec bodegas-atuel-db createdb -U postgres bodegas_etapa3_restauracion_sol
```

Se descomprimió el respaldo:

```powershell
docker exec bodegas-atuel-db sh -c 'gzip -dc /tmp/dump_etapa3_definitivo.sql.gz > /tmp/dump_etapa3_restauracion_sol.sql'
```

Y se restauró:

```powershell
docker exec bodegas-atuel-db psql -X -v ON_ERROR_STOP=1 -U postgres -d bodegas_etapa3_restauracion_sol -f /tmp/dump_etapa3_restauracion_sol.sql
```

La restauración finalizó sin errores.

#### Verificación de la restauración

Se compararon la base original y la restaurada.

Resultados:

- 29 tablas presentes en ambas bases.
- 0 diferencias en las cantidades de registros.
- 0 diferencias en las huellas de contenido calculadas
  para las 29 tablas, independientemente del orden de filas.
- 13 secuencias con los mismos valores de `last_value`
  e `is_called`.

Los hashes SHA-256 de dos exportaciones completas
realizadas mediante `pg_dump --data-only` no coincidieron.

Sin embargo, las verificaciones posteriores de registros
y secuencias no detectaron diferencias. La causa exacta
de la diferencia entre las exportaciones no fue determinada.

La comparación del contenido de las tablas quedó registrada en:

`docs/evidencias_etapa3/comparacion_restauracion.csv`

La salida de la nueva carga definitiva quedó registrada en:

`docs/evidencias_etapa3/carga_definitiva_actualizada.txt`

Todas estas operaciones se realizaron en bases aisladas,
sin modificar la base principal ni las reglas compartidas
de la Etapa 2.


## 6. Validaciones finales posteriores a las correcciones

**Fecha:** 09/11/2026.

Se ejecutaron las validaciones finales solicitadas
para la integración de la Etapa 3.

### 6.1. Validaciones del código

Se ejecutaron los siguientes comandos:

```powershell
python -m py_compile database/seed/etapa3.py database/seed/benchmark_etapa3.py
git diff --check
```

Ambos finalizaron sin errores.

### 6.2. Nueva carga reducida

Se preparó una base de datos aislada:

`bodegas_etapa3_validacion_reducida_final`

Se aplicaron las migraciones `001` a `008`
correspondientes a las Etapas 1 y 2.

  La base contenía 29 tablas vacías antes de ejecutar
  el generador. Se aplicaron las migraciones `001` a
  `008`, sin ejecutar `database/tests/datos_prueba.sql`.

Se utilizó `MODO_PRUEBA = True`.

**Duración:** 44,65 segundos.

**Código de salida:** 0.

| Componente | Registros |
|---|---:|
| comprobante | 100 |
| renglon_comprobante | 350 |
| cepa | 8 |
| maridaje | 7 |
| cliente | 20.000 |
| ingreso | 2.000 |
| transferencia | 2.000 |
| renglon_transferencia | 10.907 |

### 6.3. Validaciones de integridad

El generador confirmó:

- Lectura e inserción de los catálogos CSV.
- Cantidades de registros verificadas.
- Stocks no negativos.
- Importes de comprobantes consistentes.
- Comprobantes sin cliente: 0.
- Renglones sin comprobante: 0.
- Transferencias sin sala: 0.
- Lotes sin parcela: 0.
- Composiciones incorrectas: 0.
- Transacción confirmada correctamente.

### 6.4. Restauración del respaldo actualizado

La restauración del respaldo definitivo fue
verificada sobre la base aislada
`bodegas_etapa3_restauracion_sol`.

Se comprobaron las cantidades y huellas de
contenido de las 29 tablas y los valores de
las 13 secuencias, sin detectar diferencias.

Los procedimientos y resultados están
documentados en la sección 5.6.

### 6.5. Evidencia

La salida de la carga reducida se encuentra en:

`docs/evidencias_etapa3/carga_reducida_final.txt`

Las pruebas se realizaron sin modificar la
base principal ni las reglas compartidas
de las Etapas 1 y 2.