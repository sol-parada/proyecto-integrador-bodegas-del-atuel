
# Etapa 4 — Índices y rendimiento
## Proyecto Integrador: Bodegas del Atuel

## 1. Objetivo

Analizar el rendimiento de los cinco índices originales y de un sexto índice incorporado posteriormente, relacionándolos con consultas reales del sistema y evaluando sus beneficios y costos mediante mediciones controladas.

## 2. Entorno utilizado

- Motor: PostgreSQL 16.
- Base de datos: bodegas_etapa3_csv_final.
- Comprobantes: 150.000 registros.
- Renglones de comprobante: 500.000 registros.
- Transferencias: 2.000 registros.
- Renglones de transferencia: 11.078 registros.

Las estadísticas se actualizaron mediante ANALYZE.

Las mediciones iniciales se realizaron conservando
los índices de claves primarias y restricciones UNIQUE,
sin crear los cinco índices adicionales de la Etapa 4.

## 3. Tarea 1 — Relación entre índices y consultas reales

Inicialmente se evaluaron cinco índices definidos en database/migrations/008_indices.sql. Posteriormente, a partir de las pruebas de rendimiento de S4, se decidió incorporar un sexto índice sobre renglon_transferencia(cod_vino). Su evaluación y justificación se presentan al final del informe.

### 3.1. idx_comprobante_sala_fecha

Tipo: índice compuesto.

Columnas: id_sala, fecha.

Consulta relacionada: S8, ventas por sala.

Permite buscar comprobantes de una sala determinada
dentro de un intervalo de fechas.

La columna id_sala se encuentra primero porque
puede utilizarse como filtro de igualdad, seguida
de fecha para aplicar un filtro de rango.

Su utilidad debe evaluarse mediante consultas
que filtren por ambas columnas.

### 3.2. idx_transferencia_pendientes

Tipo: índice parcial.

Columnas: id_sala, fecha_confeccion.

Predicado: estado <> 'procesado'.

Consulta relacionada: S5, transferencias pendientes.

El índice almacena únicamente las transferencias
que todavía no fueron procesadas.

Puede resultar beneficioso cuando los movimientos
pendientes representan una proporción pequeña
del total.

### 3.3. idx_renglon_comprobante_vino

Tipo: índice sobre clave foránea.

Columna: cod_vino.

Consulta relacionada: S1, ranking de vinos vendidos.

La clave primaria de renglon_comprobante utiliza
numero_comprobante y cod_vino, por lo que no está
organizada principalmente para búsquedas por vino.

El nuevo índice permite localizar renglones
a partir de cod_vino.

Sin embargo, S1 necesita procesar las ventas de
todos los vinos, por lo que no se garantiza
una mejora de rendimiento en esa consulta.

### 3.4. idx_comprobante_fecha_incl

Tipo: índice con INCLUDE.

Columna de búsqueda: fecha.

Columnas incluidas: id_sala, total.

Consulta relacionada: S8, ventas por sala del
último trimestre.

Permite filtrar por fecha y disponer de las
columnas utilizadas para agrupar y sumar ventas.

Puede favorecer un Index Only Scan cuando
las condiciones de visibilidad lo permiten.

### 3.5. idx_transferencia_fecha_sala

Tipo: índice compuesto.

Columnas: fecha_confeccion, id_sala.

Consulta relacionada: S4, transferencias recientes.

El orden prioriza el filtro temporal utilizado
para consultar movimientos de distintas salas.

Su utilidad depende de la selectividad del
período consultado.

## 4. Tarea 2 — Mediciones sin índices adicionales

Se utilizó EXPLAIN (ANALYZE, BUFFERS) para
obtener planes de ejecución, tiempos y accesos
a memoria y disco.

### 4.1. Consulta S1

Objetivo: ranking de los diez vinos con mayor
cantidad de botellas vendidas.

- Tiempo de la primera medición: 177,344 ms.
- Tiempo del plan guardado: 420,258 ms.
- Costo estimado final: 8955,22.
- Acceso principal: Parallel Seq Scan.
- Buffers shared hit: 1876.
- Buffers shared read: 2326.
- Tabla principal: renglon_comprobante.
- Registros procesados: 500.000.

PostgreSQL recorrió los renglones de comprobante,
realizó un Hash Join con vino y agrupó los resultados.

### 4.2. Consulta S4

Objetivo: identificar las cinco salas que
solicitaron mayor cantidad del vino 90 mediante
transferencias durante los últimos 15 días.

- Código de vino utilizado: 90.
- Tiempo de la primera medición: 5,747 ms.
- Tiempo del plan guardado: 2,725 ms.
- Costo estimado final: 275,01.
- Acceso principal: Seq Scan.
- Buffers shared hit: 99.
- Buffers shared read: 0.
- Transferencias examinadas: 2.000.
- Renglones examinados: 11.078.
- Renglones correspondientes al vino: 58.
- Renglones descartados por el filtro: 11.020.

PostgreSQL realizó recorridos secuenciales,
un Hash Join y una agrupación por sala.

### 4.3. Consulta S8

Objetivo: calcular el monto total vendido
por sala durante el último trimestre.

- Tiempo de la primera medición: 79,797 ms.
- Tiempo del plan guardado: 627,902 ms.
- Costo estimado final: 8816,00.
- Acceso principal: Parallel Seq Scan.
- Buffers shared hit: 2571.
- Buffers shared read: 3851.
- Tabla principal: comprobante.
- Registros procesados: 150.000.

La consulta utilizó agregación paralela y
ordenamiento por monto total descendente.


## 5. Comparación de las mediciones iniciales

| Consulta | Primera medición | Plan guardado | Acceso principal |
|---|---:|---:|---|
| S1 | 177,344 ms | 420,258 ms | Parallel Seq Scan |
| S4 | 5,747 ms | 2,725 ms | Seq Scan |
| S8 | 79,797 ms | 627,902 ms | Parallel Seq Scan |

Las dos mediciones de cada consulta se realizaron
sin aplicar los cinco índices adicionales.

Se observaron diferencias en los tiempos de ejecución,
especialmente en las consultas S1 y S8.

Estas variaciones pueden estar relacionadas con
la caché de PostgreSQL, la lectura desde disco,
la actividad del sistema y otras condiciones
de ejecución.

Para la comparación posterior con índices se
utilizará un procedimiento de medición uniforme.

Los planes completos guardados constituyen
la evidencia de referencia.


### 5.1. Mediciones repetidas sin índices adicionales

Para obtener valores de referencia más confiables,
se ejecutaron tres mediciones adicionales por consulta
utilizando EXPLAIN (ANALYZE, BUFFERS).

Cada ejecución se realizó sobre la misma base de datos,
sin instalar los índices adicionales de la Etapa 4.

| Consulta | Ejecución 1 | Ejecución 2 | Ejecución 3 | Mediana |
|---|---:|---:|---:|---:|
| S1 | 524,101 ms | 239,963 ms | 193,426 ms | 239,963 ms |
| S4 | 15,103 ms | 2,375 ms | 2,326 ms | 2,375 ms |
| S8 | 360,324 ms | 106,938 ms | 66,841 ms | 106,938 ms |

Los tiempos corresponden a la propiedad Execution Time
informada por PostgreSQL.

La mediana se calculó ordenando los tres valores y
seleccionando el valor central.

### 5.2. Interpretación de las variaciones

Se observaron diferencias importantes entre
las ejecuciones de una misma consulta.

En S1, el tiempo disminuyó de 524,101 ms a
193,426 ms.

En S8, disminuyó de 360,324 ms a 66,841 ms.

Estas diferencias podrían estar relacionadas
con el almacenamiento en caché, la lectura
desde disco y la actividad del sistema.

No se puede atribuir una causa concreta sin
realizar mediciones adicionales.

Por este motivo, la comparación posterior con
índices deberá utilizar el mismo procedimiento.

### 5.3. Valores de referencia

Las medianas obtenidas antes de instalar los
índices adicionales son:

- S1: 239,963 ms.
- S4: 2,375 ms.
- S8: 106,938 ms.

Estos valores constituyen la referencia inicial
para la comparación posterior de rendimiento.

Los planes completos de las nueve ejecuciones
se encuentran en:

database/performance/planes_sin_indices/

## 6. Interpretación de resultados

En las tres consultas se observaron recorridos
secuenciales sobre las tablas principales.

Esto no demuestra por sí solo que falten índices.

Cuando PostgreSQL necesita procesar una proporción
elevada de una tabla, un recorrido secuencial puede
ser más eficiente que utilizar un índice.

Por lo tanto, las mejoras deberán confirmarse
mediante mediciones posteriores.

## 7. Evidencias

Los planes completos obtenidos con
EXPLAIN (ANALYZE, BUFFERS) se guardaron en:

- database/performance/planes_sin_indices/S1.txt
- database/performance/planes_sin_indices/S4.txt
- database/performance/planes_sin_indices/S8.txt

Las mediciones guardadas en estos archivos pueden
tener tiempos diferentes a las mediciones iniciales,
debido a que fueron ejecutadas nuevamente.


## 8. Tarea 3 — Mediciones con índices adicionales

### 8.1. Metodología

Se comparó el rendimiento de S1, S4 y S8 utilizando
dos bases equivalentes provenientes de la misma carga:

- bodegas_etapa4_sin_indices
- bodegas_etapa4_con_indices

La segunda base contiene los cinco índices adicionales
definidos en database/migrations/008_indices.sql.

Se ejecutó ANALYZE y se realizaron cinco mediciones
por consulta y configuración mediante
EXPLAIN (ANALYZE, BUFFERS).

Para reducir la influencia de valores extremos,
se compararon las medianas de los tiempos registrados.

### 8.2. Comparación de rendimiento

| Consulta | Sin índices (ms) | Con índices (ms) | Diferencia |
|---|---:|---:|---|
| S1 | 171,066 | 163,235 | 4,58 % menor tiempo |
| S4 | 2,491 | 2,692 | 8,07 % mayor tiempo |
| S8 | 72,592 | 63,884 | 12,00 % menor tiempo |

Los resultados corresponden a las cinco repeticiones
controladas de cada configuración, y no deben confundirse
con las mediciones exploratorias anteriores.

### 8.3. Costos, recorridos y filas

| Consulta | Costo final estimado sin/con índices | Recorrido principal | Filas devueltas |
|---|---:|---|---:|
| S1 | 8956,22 / 8956,22 | Parallel Seq Scan | 10 |
| S4 | 253,01 / 253,01 | Seq Scan | 5 |
| S8 | 4548,14 / 4548,14 | Parallel Seq Scan | 15 |

En las tres consultas se mantuvieron los métodos
principales de acceso y los costos estimados.

S1 procesa 500.000 renglones de comprobantes.
S4 examina 2.000 transferencias y 11.078 renglones.
S8 procesa 150.000 comprobantes.

### 8.4. Interpretación

PostgreSQL no utilizó los índices adicionales
en las tres consultas originales.

S1 necesita agrupar ventas de todos los vinos.
S4 trabaja con una cantidad relativamente pequeña
de transferencias y fechas poco selectivas.
S8 procesa todos los comprobantes porque pertenecen
al período consultado.

Por eso, los recorridos secuenciales resultaron
convenientes para el planificador.

Aunque S1 y S8 mostraron menores tiempos en la
comparación, no es correcto atribuir esas diferencias
a los índices adicionales porque los planes de acceso
no cambiaron.

### 8.5. Pruebas complementarias

Se realizaron pruebas adicionales con filtros más
selectivos y se observaron mejoras utilizando:

- idx_renglon_comprobante_vino: 79,63 %.
- idx_comprobante_sala_fecha: 57,73 %.

Estas pruebas demuestran la utilidad de dichos
índices en consultas específicas, pero no equivalen
a tres mejoras en las consultas originales.

### 8.6. Evidencias

Los planes completos y las cinco repeticiones se
encuentran en:

database/performance/comparacion_controlada/

Las pruebas complementarias están documentadas
en las secciones siguientes de este informe.

### 8.7. Observación sobre el criterio de aceptación

Se completaron las comparaciones de S1, S4 y S8 con y sin los cinco índices originales. También se documentaron tres mejoras medidas: dos en consultas complementarias filtradas y una en S4 mediante el sexto índice incorporado posteriormente. Las mejoras de las consultas complementarias no deben confundirse con mejoras de las versiones globales originales de S1 y S8. El cumplimiento literal del criterio de aceptación queda sujeto a la revisión final del equipo.

## 9. Prueba complementaria del índice por vino

Se evaluó el índice idx_renglon_comprobante_vino
mediante una consulta que obtiene la cantidad
de botellas vendidas del vino con código 90.

La consulta filtra la tabla renglon_comprobante,
que contiene 500.000 registros.

### Consulta utilizada

```sql
SELECT cod_vino,
       SUM(cantidad) AS botellas_vendidas
FROM renglon_comprobante
WHERE cod_vino = 90
GROUP BY cod_vino;
```

### Resultados

Se realizaron cinco mediciones por configuración,
alternando las bases con y sin índices adicionales.

| Prueba | Sin índice (ms) | Con índice (ms) |
|---|---:|---:|
| 1 | 44,067 | 13,706 |
| 2 | 65,958 | 13,401 |
| 3 | 67,890 | 7,846 |
| 4 | 59,730 | 12,170 |
| 5 | 46,324 | 9,243 |
| Mediana | 59,730 | 12,170 |

Reducción observada del tiempo: 79,63 %.

Factor de aceleración aproximado: 4,91 veces.

### Análisis de los planes

Sin el índice adicional, PostgreSQL utilizó
Parallel Seq Scan sobre renglon_comprobante.

Con el índice adicional, utilizó Bitmap Index Scan
sobre idx_renglon_comprobante_vino, seguido de
Bitmap Heap Scan.

En la medición inicial, el costo estimado final
disminuyó de 7774,12 a 3173,73.

La consulta encontró 1.857 registros del vino 90.

### Conclusión

Los resultados de las mediciones repetidas
mostraron una mejora considerable para la búsqueda
selectiva por código de vino.

Esta prueba demuestra la utilidad del índice
idx_renglon_comprobante_vino para consultas
que filtran por cod_vino.

Se trata de una prueba complementaria, no de
un reemplazo de la consulta S1 del enunciado.

### Evidencia

Los diez planes completos y los tiempos medidos
se encuentran en:

database/performance/prueba_indice_vino/


## 10. Prueba del índice compuesto por sala y fecha

Se evaluó el índice idx_comprobante_sala_fecha,
definido sobre las columnas id_sala y fecha.

La consulta calcula el monto total vendido en
la sala 1 durante los últimos tres meses.

### Consulta utilizada

```sql
SELECT id_sala, SUM(total) AS monto_total
FROM comprobante
WHERE id_sala = 1
  AND fecha >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY id_sala;
```

### Mediciones

| Prueba | Sin índice (ms) | Con índice (ms) |
|---|---:|---:|
| 1 | 22,490 | 11,478 |
| 2 | 22,709 | 11,927 |
| 3 | 21,418 | 9,381 |
| 4 | 26,789 | 9,598 |
| 5 | 27,707 | 9,535 |
| Mediana | 22,709 | 9,598 |

Reducción observada del tiempo: 57,73 %.

Factor de aceleración aproximado: 2,37 veces.

### Análisis de los planes

Sin índices adicionales, PostgreSQL utilizó
Parallel Seq Scan sobre comprobante.

Con los índices adicionales, PostgreSQL utilizó
Bitmap Index Scan sobre idx_comprobante_sala_fecha,
seguido de Bitmap Heap Scan.

El costo estimado final del plan inicial
disminuyó de 4339,66 a 1910,22.

La consulta encontró 10.000 comprobantes
correspondientes a la sala 1.

### Conclusión

Las cinco mediciones mostraron una mejora
consistente del rendimiento con los índices
adicionales.

El índice compuesto resulta útil para consultas
que filtran por una sala determinada y un período.

Esta es una variante filtrada de S8, utilizada
como prueba complementaria del índice.

Los planes y resultados se encuentran en:

database/performance/prueba_indice_sala_fecha/

---

## Costo de escritura con y sin índices adicionales

### Objetivo

Evaluar el costo de mantener índices adicionales al insertar
registros en la tabla comprobante.

La prueba se realizó en dos bases temporales independientes,
creadas a partir de las bases de comparación de la Etapa 4:

- etapa4_escritura_sin: sin índices adicionales.
- etapa4_escritura_con: con los cinco índices de la migración 008.

En particular, comprobante tiene dos índices adicionales:
idx_comprobante_sala_fecha e idx_comprobante_fecha_incl.

### Metodología

Se ejecutaron cinco repeticiones alternadas en ambas bases,
insertando 5.000 comprobantes mediante generate_series.

Cada ejecución utilizó EXPLAIN (ANALYZE, BUFFERS) dentro
de una transacción finalizada con ROLLBACK.

Las inserciones utilizaron el cliente 1 y la sala 1,
respetando las claves foráneas existentes.

Se excluyó la primera ejecución exploratoria del cálculo
de las medianas.

### Resultados

| Repetición | Sin índices (ms) | Con índices (ms) |
|---|---:|---:|
| 1 | 236,945 | 307,778 |
| 2 | 192,563 | 226,663 |
| 3 | 174,967 | 251,239 |
| 4 | 190,813 | 260,847 |
| 5 | 169,740 | 267,431 |
| **Mediana** | **190,813** | **260,847** |

El tiempo total de ejecución aumentó aproximadamente
un 36,70 % al mantener los índices adicionales.

### Comparación de operaciones y buffers

| Indicador (mediana) | Sin índices | Con índices |
|---|---:|---:|
| Tiempo del nodo Insert (ms) | 53,797 | 128,847 |
| Shared hit | 15.204 | 30.397 |
| Shared dirtied | 55 | 83 |
| Shared written | 55 | 83 |

El tiempo del nodo Insert aumentó aproximadamente
un 139,51 %.

Los accesos a buffers en memoria prácticamente se duplicaron,
mientras que los bloques modificados y escritos también
aumentaron.

### Interpretación

Los índices adicionales requieren mantenimiento cuando
se insertan nuevos registros.

El tiempo total también incluye las verificaciones
de claves foráneas, por lo que no representa exclusivamente
el mantenimiento de los índices.

Estas mediciones corresponden a INSERT sobre comprobante,
donde intervienen dos índices adicionales. No representan
el costo conjunto de escritura de los cinco índices
de la Etapa 4.

### Conclusión

En las cinco repeticiones, la inserción de comprobantes
mostró mayor tiempo total con los índices adicionales.

Esto evidencia el compromiso entre acelerar consultas
de lectura y aumentar el costo de las operaciones
de escritura.

Las pruebas se realizaron sobre bases temporales.
No se modificaron los datos originales de la Etapa 3.


---

## Indice candidato evaluado y descartado

### Indice propuesto

```sql
CREATE INDEX idx_comprobante_fecha_simple_prueba
ON comprobante (fecha);
```

Se evaluo la posibilidad de incorporar un indice B-tree
simple sobre fecha para acelerar consultas por periodo.

### Prueba experimental

El indice se creo dentro de una transaccion en la base
temporal etapa4_escritura_con.

Su tamano fue de 1.032 kB.

Se analizo la siguiente consulta:

```sql
SELECT fecha, id_sala, total
FROM comprobante
WHERE fecha >= CURRENT_DATE - INTERVAL '3 months';
```

El resultado de EXPLAIN fue:

```text
Seq Scan on comprobante
(cost=0.00..4422.00 rows=150000 width=20)
```

PostgreSQL no utilizo el indice candidato.

### Justificacion del descarte

Los 150.000 comprobantes de la carga tienen la misma fecha,
por lo que el filtro temporal no es selectivo.

En este escenario, PostgreSQL estima que un recorrido
secuencial de la tabla es mas conveniente.

Ademas, ya existe idx_comprobante_fecha_incl, cuyo primer
campo es fecha y que incluye id_sala y total.

El indice simple propuesto agregaria almacenamiento y
costo de mantenimiento durante las escrituras, sin una
mejora demostrada para la consulta evaluada.

Por estos motivos, se descarta su incorporacion.

La prueba se realizo con BEGIN y ROLLBACK.
No se modifico la migracion 008_indices.sql.


---

## Sintesis final de rendimiento

Se compararon las consultas S1, S4 y S8 mediante
EXPLAIN (ANALYZE, BUFFERS), con cinco repeticiones
por configuracion sobre bases equivalentes.

| Consulta | Mediana sin indices (ms) | Mediana con indices (ms) | Costo final estimado | Recorrido principal | Filas finales |
|---|---:|---:|---:|---|---:|
| S1 | 171,066 | 163,235 | 8956,22 | Parallel Seq Scan | 10 |
| S4 | 2,491 | 2,692 | 253,01 | Seq Scan | 5 |
| S8 | 72,592 | 63,884 | 4548,14 | Parallel Seq Scan | 15 |

Los costos estimados y recorridos principales se
mantuvieron iguales entre ambas configuraciones.

### Buffers observados

- S1: en la tercera repeticion, sin indices se
  registraron 2593 hit y 1610 read; con indices,
  3011 hit y 1192 read. El total fue 4203.
- S4: 77 shared hit en todas las repeticiones,
  con y sin indices adicionales.
- S8: 1570 shared hit en todas las repeticiones,
  con y sin indices adicionales.

Los planes individuales conservados en
database/performance/comparacion_controlada/
contienen los valores completos de cada ejecucion.

### Justificacion de los recorridos secuenciales

S1 agrupa ventas de todos los vinos y necesita
procesar una gran cantidad de renglones.

S4 trabaja con una tabla de 2000 transferencias
cuyas fechas son iguales en la carga evaluada.

S8 procesa los 150000 comprobantes porque todos
pertenecen al periodo consultado.

En estos escenarios, los filtros tienen baja
selectividad y PostgreSQL prefiere los recorridos
secuenciales y las agregaciones correspondientes.

Las diferencias de tiempos observadas en S1 y S8
no se atribuyen a los nuevos indices, porque los
planes de acceso no cambiaron.

Las pruebas complementarias por vino y por sala
si mostraron uso efectivo de indices adicionales.

### Balance final

Los indices pueden mejorar las busquedas
selectivas, pero no necesariamente las consultas
que procesan una proporcion elevada de la tabla.

La prueba de 5000 inserciones en comprobante
registro medianas de 190,813 ms sin indices y
260,847 ms con indices: un sobrecosto observado
del 36,70 % en el tiempo total.

Tambien se evaluo y descarto un indice simple
sobre comprobante(fecha), por falta de mejora
demostrada y por su costo adicional de mantenimiento.

No se modificaron los datos originales de la
Etapa 3 ni las reglas de negocio.


---

## Prueba experimental de optimizacion S4

## 11. Optimización de S4 mediante el sexto índice

### 11.1. Objetivo

Optimizar la consulta S4, que identifica las cinco salas que solicitaron mayor cantidad de un vino durante los últimos 15 días.

### 11.2. Índice incorporado

Después de evaluar los resultados y acordarlo con Sol, se decidió incorporar un sexto índice a `database/migrations/008_indices.sql`:

```sql
CREATE INDEX idx_renglon_transferencia_vino
ON renglon_transferencia (cod_vino);
```

Este índice permite localizar los renglones correspondientes a un vino específico sin recorrer secuencialmente toda la tabla.

### 11.3. Metodología

Se compararon dos bases equivalentes:

- `bodegas_etapa4_con_indices`: contiene los cinco índices originales.
- `etapa4_indice_s4_prueba`: contiene los cinco índices originales y el sexto índice experimental.

En la base experimental, el índice se denominó `idx_renglon_transferencia_vino_prueba`.

Se realizaron cinco ejecuciones alternadas por configuración utilizando `EXPLAIN (ANALYZE, BUFFERS)`.

### 11.4. Resultados

| Repetición | Sin sexto índice (ms) | Con sexto índice (ms) |
|---|---:|---:|
| 1 | 13,661 | 1,322 |
| 2 | 2,577 | 1,548 |
| 3 | 2,557 | 1,314 |
| 4 | 2,727 | 1,420 |
| 5 | 2,440 | 1,403 |
| **Mediana** | **2,577** | **1,403** |

**Reducción observada del tiempo de ejecución: 45,56 %.**

### 11.5. Análisis de los planes

Sin el sexto índice, PostgreSQL utilizó `Seq Scan` sobre `renglon_transferencia`.

Con el índice adicional, utilizó `Bitmap Index Scan` sobre `idx_renglon_transferencia_vino_prueba`, seguido de `Bitmap Heap Scan`.

El costo estimado final disminuyó de **253,01 a 120,17**.

De los 11.078 renglones de transferencia, solamente 58 correspondían al vino 90.

Esta selectividad explica por qué el índice resultó útil para la consulta S4.

### 11.6. Evidencias

Los diez planes completos están guardados en:

`database/performance/prueba_indice_s4/`

### 11.7. Conclusión

Las cinco mediciones mostraron tiempos inferiores al utilizar el nuevo índice.

Por este motivo, se decidió incorporarlo definitivamente a `008_indices.sql`, conservando los cinco índices anteriores.

La prueba original se realizó en una base experimental y sus resultados se conservaron como evidencia.

El nuevo índice mejora la consulta S4. Las otras dos mejoras documentadas corresponden a variantes filtradas de S1 y S8, por lo que deben distinguirse de las consultas globales originales al evaluar los criterios de aceptación.

---

## Resumen de las tres consultas con mejoras comprobadas

La siguiente tabla reúne las tres consultas en las que se
observó una reducción del tiempo de ejecución atribuible
al uso de índices adicionales.

Las mediciones se realizaron mediante
EXPLAIN (ANALYZE, BUFFERS), utilizando cinco repeticiones
por configuración y comparando las medianas.

| Consulta evaluada | Índice utilizado | Sin índice (ms) | Con índice (ms) | Mejora |
|---|---|---:|---:|---:|
| Consulta complementaria: ventas del vino 90 | idx_renglon_comprobante_vino | 59,730 | 12,170 | 79,63 % |
| Variante filtrada de S8: ventas de sala 1 en los últimos tres meses | idx_comprobante_sala_fecha | 22,709 | 9,598 | 57,73 % |
| S4: salas con mayor cantidad solicitada del vino 90 | idx_renglon_transferencia_vino | 2,577 | 1,403 | 45,56 % |

### Interpretación

Las tres consultas mostraron mejoras medidas y cambios
en los planes de ejecución al utilizar los índices.

Las primeras dos son consultas complementarias que
permiten evaluar filtros selectivos. No corresponden
a las versiones globales originales de S1 y S8.

La tercera corresponde a la consulta original S4,
optimizada mediante el sexto índice incorporado
a la migración 008_indices.sql.

Las versiones originales de S1 y S8 fueron medidas
por separado y sus diferencias de tiempo no se
atribuyeron a los índices porque sus planes de acceso
no cambiaron.

### Evidencias

Los planes completos están disponibles en:

- database/performance/prueba_indice_vino/
- database/performance/prueba_indice_sala_fecha/
- database/performance/prueba_indice_s4/

La comparación de las consultas originales S1, S4 y S8
con los cinco índices iniciales permanece documentada
en database/performance/comparacion_controlada/.

