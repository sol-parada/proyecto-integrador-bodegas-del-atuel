# Diccionario de Datos — Bodegas del Atuel

## 1. Información general

- **Motor:** PostgreSQL 16
- **Base de datos:** definida mediante `POSTGRES_DB` en `.env`
- **Esquema fuente:** `database/migrations/001_esquema.sql`
- **Etapa:** Etapa 1 — Modelado
- **Convención:** las claves primarias se indican como PK y las claves foráneas como FK.

## 2. Tipos y dominios

### Tipos enumerados

| Tipo | Valores |
|---|---|
| `tipo_cepa` | `tinta`, `blanca` |
| `tipo_vino` | `tinto`, `blanco`, `rosado`, `espumante` |
| `tipo_cliente_enum` | `socio`, `distribuidor`, `exportador` |
| `estado_documento` | `en_confeccion`, `terminado`, `procesado` |

### Dominio

| Dominio | Regla |
|---|---|
| `cuit_dom` | Cadena de exactamente 11 dígitos numéricos |

## 3. Tablas de localidades, salas y empleados

### Tabla: `localidad`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `codigo_postal` | `VARCHAR(10)` | PK, NOT NULL | Código postal de la localidad |
| `nombre` | `VARCHAR(100)` | NOT NULL | Nombre de la localidad |
| `provincia` | `VARCHAR(100)` | NOT NULL | Provincia |
| `encargado_regional` | `VARCHAR(150)` | NOT NULL | Responsable regional |

### Tabla: `sala_venta`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_sala` | `INT` | PK, identidad | Identificador de la sala |
| `calle` | `VARCHAR(100)` | NOT NULL | Calle de la sala |
| `numero` | `VARCHAR(20)` | NOT NULL | Número o identificación del domicilio |
| `dia_cierre` | `VARCHAR(15)` | NOT NULL | Día de cierre de la sala |
| `codigo_postal` | `VARCHAR(10)` | FK, NOT NULL | Localidad de la sala |

**Relación:** `sala_venta.codigo_postal` referencia a `localidad.codigo_postal`.

### Tabla: `empleado`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `cuit` | `cuit_dom` | PK, NOT NULL | CUIT del empleado |
| `nombre` | `VARCHAR(150)` | NOT NULL | Nombre completo |
| `fecha_ingreso` | `DATE` | NOT NULL | Fecha de ingreso |
| `salario` | `NUMERIC(12,2)` | NOT NULL | Salario del empleado |
| `id_sala` | `INT` | FK, NOT NULL | Sala donde trabaja |

**Relación:** `empleado.id_sala` referencia a `sala_venta.id_sala`.

## 4. Tablas de producción de uva y calidad

### Tabla: `bodega`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `cuit` | `cuit_dom` | PK, NOT NULL | CUIT de la bodega |
| `razon_social` | `VARCHAR(150)` | NOT NULL | Razón social |
| `domicilio` | `VARCHAR(200)` | NOT NULL | Domicilio de la bodega |

### Tabla: `cepa`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_cepa` | `INT` | PK, identidad | Identificador de la cepa |
| `nombre` | `VARCHAR(100)` | UNIQUE, NOT NULL | Nombre de la cepa |
| `tipo` | `tipo_cepa` | NOT NULL | Tipo de cepa: tinta o blanca |

### Tabla: `finca`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_finca` | `INT` | PK, identidad | Identificador de la finca |
| `nombre` | `VARCHAR(100)` | NOT NULL | Nombre de la finca |
| `superficie_ha` | `NUMERIC(8,2)` | NOT NULL | Superficie en hectáreas |
| `departamento` | `VARCHAR(100)` | NOT NULL | Departamento |
| `provincia` | `VARCHAR(100)` | NOT NULL | Provincia |

### Tabla: `parcela`

Entidad débil dependiente de `finca`.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_finca` | `INT` | PK compuesta, FK | Finca a la que pertenece |
| `nro_parcela` | `INT` | PK compuesta, NOT NULL | Número de parcela |
| `superficie_ha` | `NUMERIC(8,2)` | NOT NULL | Superficie en hectáreas |
| `anio_plantacion` | `SMALLINT` | NOT NULL | Año de plantación |
| `id_cepa` | `INT` | FK, NOT NULL | Cepa plantada |

**Clave primaria:** (`id_finca`, `nro_parcela`).

**Relaciones:**

- `id_finca` referencia a `finca.id_finca`.
- `id_cepa` referencia a `cepa.id_cepa`.

### Tabla: `lote_uva`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `nro_lote` | `INT` | PK, identidad | Identificador del lote |
| `id_finca` | `INT` | FK, NOT NULL | Finca de origen |
| `nro_parcela` | `INT` | FK, NOT NULL | Parcela de origen |
| `campana` | `SMALLINT` | NOT NULL | Campaña de cosecha |
| `fecha_cosecha` | `DATE` | NOT NULL | Fecha de cosecha |
| `kg_cosechados` | `NUMERIC(10,2)` | NOT NULL | Kilogramos cosechados |
| `cuit_bodega_destino` | `cuit_dom` | FK, NOT NULL | Bodega de destino |

**Relación compuesta:** (`id_finca`, `nro_parcela`) referencia a `parcela`.

### Tabla: `analisis_calidad`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_analisis` | `INT` | PK, identidad | Identificador del análisis |
| `nro_lote` | `INT` | FK, NOT NULL | Lote analizado |
| `fecha` | `DATE` | NOT NULL | Fecha del análisis |
| `grado_brix` | `NUMERIC(4,2)` | NOT NULL | Grado Brix |
| `ph` | `NUMERIC(3,2)` | NOT NULL | Nivel de pH |
| `acidez_total` | `NUMERIC(5,2)` | NOT NULL | Acidez total |

**Relación:** `analisis_calidad.nro_lote` referencia a `lote_uva.nro_lote`.

## 5. Tablas de vinos, composición y maridajes

### Tabla: `vino`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `cod_vino` | `INT` | PK, identidad | Identificador del vino |
| `nombre` | `VARCHAR(100)` | NOT NULL | Nombre comercial |
| `tipo` | `tipo_vino` | NOT NULL | Tipo de vino |
| `anada` | `SMALLINT` | NOT NULL | Año de la cosecha |
| `volumen_ml` | `INT` | NOT NULL | Volumen de la botella en mililitros |
| `graduacion` | `NUMERIC(4,2)` | NOT NULL | Graduación alcohólica |
| `precio` | `NUMERIC(10,2)` | NOT NULL | Precio vigente |
| `cuit_bodega` | `cuit_dom` | FK, NOT NULL | Bodega que produce el vino |

**Relación:** `vino.cuit_bodega` referencia a `bodega.cuit`.

### Tabla: `composicion_vino`

Representa las cepas que componen cada vino y el porcentaje correspondiente.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `cod_vino` | `INT` | PK compuesta, FK | Vino compuesto |
| `id_cepa` | `INT` | PK compuesta, FK | Cepa utilizada |
| `porcentaje` | `NUMERIC(5,2)` | NOT NULL | Porcentaje de participación de la cepa |

**Clave primaria:** (`cod_vino`, `id_cepa`).

**Relaciones:**

- `cod_vino` referencia a `vino.cod_vino`.
- `id_cepa` referencia a `cepa.id_cepa`.

La suma de los porcentajes de cada vino se valida mediante lógica de integridad de la base de datos.

### Tabla: `maridaje`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_maridaje` | `INT` | PK, identidad | Identificador del maridaje |
| `nombre` | `VARCHAR(100)` | UNIQUE, NOT NULL | Nombre del alimento o preparación |
| `temp_servicio_sugerida_c` | `NUMERIC(4,1)` | NOT NULL | Temperatura sugerida de servicio |

### Tabla: `vino_maridaje`

Relaciona vinos con uno o más maridajes.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `cod_vino` | `INT` | PK compuesta, FK | Vino |
| `id_maridaje` | `INT` | PK compuesta, FK | Maridaje asociado |

**Clave primaria:** (`cod_vino`, `id_maridaje`).

**Relaciones:**

- `cod_vino` referencia a `vino.cod_vino`.
- `id_maridaje` referencia a `maridaje.id_maridaje`.

## 6. Tablas de clientes y permisos de exportación

La tabla `cliente` contiene los datos comunes. Las tablas `cliente_socio`,
`cliente_distribuidor` y `cliente_exportador` representan los subtipos.

### Tabla: `cliente`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_cliente` | `INT` | PK, identidad | Identificador del cliente |
| `nombre_razon_social` | `VARCHAR(150)` | NOT NULL | Nombre o razón social |
| `tipo_doc` | `VARCHAR(20)` | NOT NULL | Tipo de documento |
| `nro_doc` | `VARCHAR(30)` | UNIQUE, NOT NULL | Número de documento |
| `direccion` | `VARCHAR(200)` | NOT NULL | Domicilio |
| `localidad` | `VARCHAR(100)` | NOT NULL | Localidad del cliente |
| `fecha_alta` | `DATE` | NOT NULL, DEFAULT | Fecha de alta |
| `tipo_cliente` | `tipo_cliente_enum` | NOT NULL | Tipo de cliente |

### Tabla: `cliente_socio`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_cliente` | `INT` | PK, FK | Cliente perteneciente al subtipo socio |

La eliminación del cliente elimina también este registro mediante `ON DELETE CASCADE`.

### Tabla: `cliente_distribuidor`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_cliente` | `INT` | PK, FK | Cliente distribuidor |
| `zona_cobertura` | `VARCHAR(150)` | NOT NULL | Zona de cobertura |
| `nro_habilitacion` | `VARCHAR(50)` | UNIQUE, NOT NULL | Número de habilitación |

### Tabla: `cliente_exportador`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_cliente` | `INT` | PK, FK | Cliente exportador |
| `pais_destino_principal` | `VARCHAR(100)` | NOT NULL | País principal de destino |

### Tabla: `permiso_exportacion`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `cod_permiso` | `VARCHAR(50)` | PK, NOT NULL | Código del permiso |
| `id_cliente_exportador` | `INT` | FK, NOT NULL | Exportador titular |
| `fecha_emision` | `DATE` | NOT NULL | Fecha de emisión |
| `fecha_vencimiento` | `DATE` | NOT NULL | Fecha de vencimiento |

**Relaciones:**

- Cada subtipo referencia a `cliente.id_cliente`.
- `permiso_exportacion.id_cliente_exportador` referencia a `cliente_exportador.id_cliente`.
- Los permisos se eliminan junto con el exportador mediante `ON DELETE CASCADE`.

## 7. Transportistas

### Tabla: `transportista`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `codigo_transportista` | `INT` | PK, identidad | Identificador del transportista |
| `razon_social` | `VARCHAR(150)` | NOT NULL | Razón social |
| `cuit` | `cuit_dom` | UNIQUE, NOT NULL | CUIT del transportista |
| `email` | `VARCHAR(100)` | NOT NULL | Correo electrónico |
| `telefono` | `VARCHAR(30)` | NOT NULL | Teléfono |
| `domicilio` | `VARCHAR(200)` | NOT NULL | Domicilio |

### Tabla: `transportista_cobertura`

Relaciona transportistas con las localidades que cubren.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `codigo_transportista` | `INT` | PK compuesta, FK | Transportista |
| `codigo_postal` | `VARCHAR(10)` | PK compuesta, FK | Localidad cubierta |

**Clave primaria:** (`codigo_transportista`, `codigo_postal`).

**Relaciones:**

- `codigo_transportista` referencia a `transportista.codigo_transportista`.
- `codigo_postal` referencia a `localidad.codigo_postal`.

## 8. Depósito central e ingresos

### Tabla: `stock_deposito`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `cod_vino` | `INT` | PK, FK | Vino almacenado |
| `cantidad` | `INT` | NOT NULL, DEFAULT 0 | Cantidad disponible |

### Tabla: `ingreso`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `codigo_ingreso` | `INT` | PK, identidad | Identificador del ingreso |
| `fecha` | `DATE` | NOT NULL, DEFAULT | Fecha del ingreso |
| `estado` | `estado_documento` | NOT NULL, DEFAULT | Estado del ingreso |
| `codigo_transportista` | `INT` | FK, NOT NULL | Transportista utilizado |
| `cuit_bodega` | `cuit_dom` | FK, NOT NULL | Bodega de origen |

### Tabla: `renglon_ingreso`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `codigo_ingreso` | `INT` | PK compuesta, FK | Ingreso relacionado |
| `cod_vino` | `INT` | PK compuesta, FK | Vino ingresado |
| `cantidad` | `INT` | NOT NULL | Cantidad ingresada |

**Clave primaria:** (`codigo_ingreso`, `cod_vino`).

**Relaciones:**

- `ingreso.codigo_transportista` referencia a `transportista.codigo_transportista`.
- `ingreso.cuit_bodega` referencia a `bodega.cuit`.
- `renglon_ingreso.codigo_ingreso` referencia a `ingreso.codigo_ingreso`.
- `renglon_ingreso.cod_vino` referencia a `vino.cod_vino`.

## 9. Transferencias a salas

### Tabla: `transferencia`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `numero_solicitud` | `INT` | PK, identidad | Identificador de la solicitud |
| `id_sala` | `INT` | FK, NOT NULL | Sala destinataria |
| `fecha_confeccion` | `DATE` | NOT NULL, DEFAULT | Fecha de confección |
| `estado` | `estado_documento` | NOT NULL, DEFAULT | Estado de la transferencia |

### Tabla: `renglon_transferencia`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `numero_solicitud` | `INT` | PK compuesta, FK | Transferencia relacionada |
| `cod_vino` | `INT` | PK compuesta, FK | Vino transferido |
| `cantidad` | `INT` | NOT NULL | Cantidad solicitada |

**Clave primaria:** (`numero_solicitud`, `cod_vino`).

**Relaciones:**

- `transferencia.id_sala` referencia a `sala_venta.id_sala`.
- `renglon_transferencia.numero_solicitud` referencia a `transferencia.numero_solicitud`.
- `renglon_transferencia.cod_vino` referencia a `vino.cod_vino`.

## 10. Stock en salas y ventas

### Tabla: `stock_sala`

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_sala` | `INT` | PK compuesta, FK | Sala de venta |
| `cod_vino` | `INT` | PK compuesta, FK | Vino disponible |
| `cantidad` | `INT` | NOT NULL, DEFAULT 0 | Stock disponible en la sala |

**Clave primaria:** (`id_sala`, `cod_vino`).

### Tabla: `comprobante`

Representa la cabecera de una venta.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `numero_comprobante` | `INT` | PK, identidad | Identificador del comprobante |
| `fecha` | `TIMESTAMP` | NOT NULL, DEFAULT | Fecha y hora de la venta |
| `id_cliente` | `INT` | FK, NOT NULL | Cliente que realiza la compra |
| `id_sala` | `INT` | FK, NOT NULL | Sala donde se realiza la venta |
| `subtotal` | `NUMERIC(12,2)` | NOT NULL, DEFAULT 0 | Importe antes del descuento |
| `descuento` | `NUMERIC(12,2)` | NOT NULL, DEFAULT 0 | Importe descontado |
| `total` | `NUMERIC(12,2)` | NOT NULL, DEFAULT 0 | Importe total |

### Tabla: `renglon_comprobante`

Representa los vinos incluidos en una venta.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `numero_comprobante` | `INT` | PK compuesta, FK | Comprobante relacionado |
| `cod_vino` | `INT` | PK compuesta, FK | Vino vendido |
| `cantidad` | `INT` | NOT NULL | Cantidad vendida |
| `precio_unitario` | `NUMERIC(10,2)` | NOT NULL | Precio aplicado |
| `descuento` | `NUMERIC(10,2)` | NOT NULL, DEFAULT 0 | Descuento del renglón |
| `subtotal` | `NUMERIC(12,2)` | NOT NULL | Subtotal del renglón |

**Clave primaria:** (`numero_comprobante`, `cod_vino`).

**Relaciones:**

- `stock_sala.id_sala` referencia a `sala_venta.id_sala`.
- `stock_sala.cod_vino` referencia a `vino.cod_vino`.
- `comprobante.id_cliente` referencia a `cliente.id_cliente`.
- `comprobante.id_sala` referencia a `sala_venta.id_sala`.
- `renglon_comprobante.numero_comprobante` referencia a `comprobante.numero_comprobante`.
- `renglon_comprobante.cod_vino` referencia a `vino.cod_vino`.

## 11. Auditoría de precios

### Tabla: `auditoria_precio`

Registra los cambios realizados sobre el precio de los vinos.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id_auditoria` | `INT` | PK, identidad | Identificador del registro de auditoría |
| `cod_vino` | `INT` | FK, NOT NULL | Vino cuyo precio cambió |
| `precio_anterior` | `NUMERIC(10,2)` | NOT NULL | Precio antes del cambio |
| `precio_nuevo` | `NUMERIC(10,2)` | NOT NULL | Precio después del cambio |
| `fecha_hora` | `TIMESTAMP` | NOT NULL, DEFAULT | Momento del cambio |
| `usuario` | `VARCHAR(100)` | NOT NULL, DEFAULT | Usuario que realizó el cambio |

**Relación:** `auditoria_precio.cod_vino` referencia a `vino.cod_vino`.

## 12. Decisiones de diseño

### 12.1. Claves primarias

Se utilizan claves primarias para identificar de forma única cada registro.

- Las entidades principales utilizan identificadores autogenerados mediante
  `GENERATED ALWAYS AS IDENTITY`, por ejemplo `id_sala`, `id_cepa`,
  `id_finca`, `cod_vino` e `id_cliente`.
- `bodega` y `empleado` utilizan el CUIT como clave primaria.
- `localidad` utiliza `codigo_postal` como clave primaria.
- Las tablas intermedias utilizan claves primarias compuestas, por ejemplo:
  - `composicion_vino(cod_vino, id_cepa)`.
  - `vino_maridaje(cod_vino, id_maridaje)`.
  - `transportista_cobertura(codigo_transportista, codigo_postal)`.
  - `stock_sala(id_sala, cod_vino)`.
- `parcela` utiliza la clave compuesta `(id_finca, nro_parcela)` porque el
  número de parcela es único dentro de cada finca, pero no necesariamente en
  todo el sistema.

### 12.2. Claves naturales y claves autogeneradas

Se utilizan claves naturales cuando el atributo identifica naturalmente a la
entidad:

- `cuit` para bodegas y empleados.
- `codigo_postal` para localidades.
- `cod_permiso` para permisos de exportación.
- `nro_doc` se mantiene como atributo único del cliente.

Se utilizan claves autogeneradas cuando el identificador es interno del
sistema y no representa necesariamente un dato del negocio:

- Salas, cepas, fincas, lotes, análisis, vinos, maridajes, clientes,
  transportistas, ingresos, transferencias, comprobantes y auditorías.

Esta separación evita depender de datos de negocio que podrían cambiar y
permite mantener referencias estables.

### 12.3. Jerarquía de clientes

La jerarquía se implementa mediante una tabla general `cliente` y tablas
específicas para cada subtipo:

- `cliente_socio`.
- `cliente_distribuidor`.
- `cliente_exportador`.

La tabla general contiene los atributos comunes y `tipo_cliente` indica la
categoría. Las tablas específicas contienen únicamente los atributos propios
de cada subtipo.

Las claves primarias de las tablas específicas también son claves foráneas
hacia `cliente`, formando una relación uno a uno. La eliminación de un cliente
elimina sus datos específicos mediante `ON DELETE CASCADE`.

### 12.4. Normalización hasta tercera forma normal

El modelo se organiza hasta la tercera forma normal:

#### Primera forma normal

- Cada columna contiene valores atómicos.
- No se almacenan listas dentro de una columna.
- Las relaciones de muchos a muchos se representan mediante tablas
  intermedias, como `composicion_vino`, `vino_maridaje` y
  `transportista_cobertura`.

#### Segunda forma normal

- Las tablas con claves compuestas contienen atributos que dependen de la
  clave completa.
- Por ejemplo, `porcentaje` en `composicion_vino` depende del par
  `(cod_vino, id_cepa)`.
- La cantidad de un renglón depende del comprobante y del vino que componen
  su clave.

#### Tercera forma normal

- Los atributos no clave dependen únicamente de la clave primaria.
- Los datos de bodegas, cepas, localidades, clientes y vinos se almacenan en
  sus propias tablas.
- Se evita repetir información descriptiva en las tablas relacionadas.
- Las relaciones se expresan mediante claves foráneas.

### 12.5. Acciones referenciales

Las acciones `ON DELETE` se definieron según la dependencia entre las
entidades:

- `CASCADE` se utiliza cuando el registro dependiente no tiene sentido sin su
  registro principal. Por ejemplo, renglones, composiciones, maridajes
  asociados, subtipos de clientes y permisos de exportación.
- `RESTRICT` se utiliza para impedir eliminar entidades que todavía son
  utilizadas por otros registros, como bodegas, vinos, salas, localidades,
  cepas y transportistas.

No se definieron acciones `ON UPDATE` explícitas. Por lo tanto, PostgreSQL
aplica el comportamiento predeterminado `NO ACTION`. Las claves referenciadas
no se actualizan automáticamente y cualquier cambio que genere referencias
inválidas es rechazado.

### 12.6. Identidad de los registros

Las columnas definidas con `GENERATED ALWAYS AS IDENTITY` son generadas por
PostgreSQL y no deben ingresarse manualmente en las operaciones normales.
Las claves naturales y los códigos definidos por el negocio sí deben ser
proporcionados por quien carga los datos.