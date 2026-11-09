
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

### 2.1. Cantidades registradas

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

**Importante:** los resultados de esta sección corresponden a una ejecución completa realizada antes de incorporar la lectura de los catálogos CSV.

Por ese motivo, cantidades como las de cepa, maridaje y sus tablas relacionadas pueden variar en una nueva ejecución.

Los resultados se conservan como evidencia de la primera carga masiva completa, pero deberán actualizarse después de probar la versión corregida del generador.


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

Esta prueba valida el funcionamiento del generador
actualizado en modo reducido. Todavía no reemplaza
la evidencia de una carga completa con los CSV.


## 3. Estado de verificaciones

- [x] Lectura e inserción de los tres catálogos CSV.
- [x] Carga definitiva de 150.000 comprobantes.
- [x] Carga definitiva de 500.000 renglones.
- [x] Conteos definitivos de las 29 tablas.
- [x] Integridad referencial y reglas de stock.
- [x] Consistencia de importes de comprobantes.
- [x] Medición del tiempo total de ejecución.
- [x] Generación y restauración del respaldo anterior.
- [ ] Generación del respaldo de la carga actualizada.
- [ ] Verificación de restauración del respaldo actualizado.
- [ ] Acuerdo sobre fechas y regla RN-11.
- [ ] Revisión final del repositorio y entrega.


## 4. Reproducibilidad de fechas

El generador utiliza una semilla fija y una fecha de referencia para permitir la reproducción de los datos sintéticos.

Sin embargo, se identificó una diferencia entre los requisitos de reproducibilidad de la Etapa 3 y la regla RN-11 implementada en la Etapa 2.

En la Etapa 1, la tabla transferencia define fecha_confeccion con DEFAULT CURRENT_DATE.

Posteriormente, en la Etapa 2, el trigger de la RN-11 establece obligatoriamente CURRENT_DATE al insertar una transferencia.

Como consecuencia, PostgreSQL asigna la fecha de ejecución, independientemente de la fecha que intente proporcionar el generador.

Si los comprobantes utilizan una fecha histórica fija y las transferencias utilizan la fecha actual, podrían registrarse ventas anteriores al abastecimiento de mercadería.

Por este motivo, se mantiene temporalmente la fecha actual para los comprobantes, respetando el comportamiento de la RN-11.

**Estado:** pendiente de acuerdo con el grupo.

Se deberá definir una solución que permita realizar pruebas reproducibles sin alterar indebidamente las reglas de negocio implementadas en las etapas anteriores.


## 5. Ejecución definitiva con catálogos CSV

**Fecha de ejecución:** 09/11/2026.

**Base de datos:** bodegas_etapa3_csv_final.

**Motor:** PostgreSQL 16.

**Modo:** MODO_PRUEBA = False.

La carga masiva definitiva se ejecutó utilizando la
versión actualizada de etapa3.py y los catálogos
CSV del repositorio.

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

La reproducibilidad completa de las fechas
continúa pendiente del acuerdo sobre la RN-11.
