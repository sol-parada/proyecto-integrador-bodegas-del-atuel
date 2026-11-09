
# Etapa 4 — Índices y rendimiento
## Proyecto Integrador: Bodegas del Atuel

## 1. Objetivo

Analizar la utilidad de cinco índices propuestos para
optimizar consultas reales del sistema y medir el
rendimiento de las consultas antes de aplicarlos.

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

Los cinco índices candidatos fueron definidos por
Santiago en database/migrations/008_indices.sql.

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
- Buffers shared hit: 1780.
- Buffers shared read: 2422.
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
- Buffers shared hit: 2475.
- Buffers shared read: 3947.
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

## 8. Trabajos pendientes

- Aplicar los cinco índices en una base de prueba.
- Repetir las mediciones con índices.
- Comparar planes, tiempos, costos y buffers.
- Evaluar índices utilizados y descartados.
- Medir el costo de escritura.
