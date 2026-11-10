-- -----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS Y DOMINIOS
-- -----------------------------------------------------------------------------
CREATE TYPE tipo_cepa AS ENUM ('tinta', 'blanca');
CREATE TYPE tipo_vino AS ENUM ('tinto', 'blanco', 'rosado', 'espumante');
CREATE TYPE tipo_cliente_enum AS ENUM ('socio', 'distribuidor', 'exportador');
CREATE TYPE estado_documento AS ENUM ('en_confeccion', 'terminado', 'procesado');

-- Dominio para CUIT (11 digitos numericos)
CREATE DOMAIN cuit_dom AS CHAR(11) CHECK (VALUE ~ '^[0-9]{11}$');

-- -----------------------------------------------------------------------------
-- 2. LOCALIDADES, SALAS DE VENTA Y EMPLEADOS
-- -----------------------------------------------------------------------------
CREATE TABLE localidad (
    codigo_postal VARCHAR(10) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL,
    encargado_regional VARCHAR(150) NOT NULL
);

CREATE TABLE sala_venta (
    id_sala INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    calle VARCHAR(100) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    dia_cierre VARCHAR(15) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL REFERENCES localidad(codigo_postal) ON DELETE RESTRICT
);

CREATE TABLE empleado (
    cuit cuit_dom PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    fecha_ingreso DATE NOT NULL,
    salario NUMERIC(12, 2) NOT NULL,
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- 3. PRODUCCION DE UVA Y CALIDAD
-- -----------------------------------------------------------------------------
CREATE TABLE bodega (
    cuit cuit_dom PRIMARY KEY,
    razon_social VARCHAR(150) NOT NULL,
    domicilio VARCHAR(200) NOT NULL
);

CREATE TABLE cepa (
    id_cepa INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    tipo tipo_cepa NOT NULL
);

CREATE TABLE finca (
    id_finca INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    superficie_ha NUMERIC(8, 2) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    provincia VARCHAR(100) NOT NULL
);

-- Parcela es una Entidad DÃ©bil de Finca
CREATE TABLE parcela (
    id_finca INT NOT NULL REFERENCES finca(id_finca) ON DELETE CASCADE,
    nro_parcela INT NOT NULL,
    superficie_ha NUMERIC(8, 2) NOT NULL,
    anio_plantacion SMALLINT NOT NULL,
    id_cepa INT NOT NULL REFERENCES cepa(id_cepa) ON DELETE RESTRICT,
    PRIMARY KEY (id_finca, nro_parcela)
);

CREATE TABLE lote_uva (
    nro_lote INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_finca INT NOT NULL,
    nro_parcela INT NOT NULL,
    campana SMALLINT NOT NULL,
    fecha_cosecha DATE NOT NULL,
    kg_cosechados NUMERIC(10, 2) NOT NULL,
    cuit_bodega_destino cuit_dom NOT NULL REFERENCES bodega(cuit) ON DELETE RESTRICT,
    FOREIGN KEY (id_finca, nro_parcela) REFERENCES parcela(id_finca, nro_parcela) ON DELETE RESTRICT
);

CREATE TABLE analisis_calidad (
    id_analisis INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nro_lote INT NOT NULL REFERENCES lote_uva(nro_lote) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    grado_brix NUMERIC(4, 2) NOT NULL,
    ph NUMERIC(3, 2) NOT NULL,
    acidez_total NUMERIC(5, 2) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. VINOS, COMPOSICION Y MARIDAJES
-- -----------------------------------------------------------------------------
CREATE TABLE vino (
    cod_vino INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo tipo_vino NOT NULL,
    anada SMALLINT NOT NULL,
    volumen_ml INT NOT NULL,
    graduacion NUMERIC(4, 2) NOT NULL,
    precio NUMERIC(10, 2) NOT NULL,
    cuit_bodega cuit_dom NOT NULL REFERENCES bodega(cuit) ON DELETE RESTRICT
);

CREATE TABLE composicion_vino (
    cod_vino INT NOT NULL REFERENCES vino(cod_vino) ON DELETE CASCADE,
    id_cepa INT NOT NULL REFERENCES cepa(id_cepa) ON DELETE RESTRICT,
    porcentaje NUMERIC(5, 2) NOT NULL,
    PRIMARY KEY (cod_vino, id_cepa)
);

CREATE TABLE maridaje (
    id_maridaje INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    temp_servicio_sugerida_c NUMERIC(4, 1) NOT NULL
);

CREATE TABLE vino_maridaje (
    cod_vino INT NOT NULL REFERENCES vino(cod_vino) ON DELETE CASCADE,
    id_maridaje INT NOT NULL REFERENCES maridaje(id_maridaje) ON DELETE RESTRICT,
    PRIMARY KEY (cod_vino, id_maridaje)
);

-- -----------------------------------------------------------------------------
-- 5. CLIENTES Y PERMISOS DE EXPORTACION (Class Table Inheritance)
-- -----------------------------------------------------------------------------
CREATE TABLE cliente (
    id_cliente INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_razon_social VARCHAR(150) NOT NULL,
    tipo_doc VARCHAR(20) NOT NULL,
    nro_doc VARCHAR(30) NOT NULL UNIQUE,
    direccion VARCHAR(200) NOT NULL,
    localidad VARCHAR(100) NOT NULL,
    fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_cliente tipo_cliente_enum NOT NULL
);

CREATE TABLE cliente_socio (
    id_cliente INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE
);

CREATE TABLE cliente_distribuidor (
    id_cliente INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    zona_cobertura VARCHAR(150) NOT NULL,
    nro_habilitacion VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE cliente_exportador (
    id_cliente INT PRIMARY KEY REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    pais_destino_principal VARCHAR(100) NOT NULL
);

CREATE TABLE permiso_exportacion (
    cod_permiso VARCHAR(50) PRIMARY KEY,
    id_cliente_exportador INT NOT NULL REFERENCES cliente_exportador(id_cliente) ON DELETE CASCADE,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL
);

-- -----------------------------------------------------------------------------
-- 6. TRANSPORTISTAS
-- -----------------------------------------------------------------------------
CREATE TABLE transportista (
    codigo_transportista INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razon_social VARCHAR(150) NOT NULL,
    cuit cuit_dom NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    domicilio VARCHAR(200) NOT NULL
);

CREATE TABLE transportista_cobertura (
    codigo_transportista INT NOT NULL REFERENCES transportista(codigo_transportista) ON DELETE CASCADE,
    codigo_postal VARCHAR(10) NOT NULL REFERENCES localidad(codigo_postal) ON DELETE RESTRICT,
    PRIMARY KEY (codigo_transportista, codigo_postal)
);

-- -----------------------------------------------------------------------------
-- 7. DEPOSITO CENTRAL, INGRESOS Y TRANSFERENCIAS
-- -----------------------------------------------------------------------------
CREATE TABLE stock_deposito (
    cod_vino INT PRIMARY KEY REFERENCES vino(cod_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL DEFAULT 0
);

CREATE TABLE ingreso (
    codigo_ingreso INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado estado_documento NOT NULL DEFAULT 'en_confeccion',
    codigo_transportista INT NOT NULL REFERENCES transportista(codigo_transportista) ON DELETE RESTRICT,
    cuit_bodega cuit_dom NOT NULL REFERENCES bodega(cuit) ON DELETE RESTRICT
);

CREATE TABLE renglon_ingreso (
    codigo_ingreso INT NOT NULL REFERENCES ingreso(codigo_ingreso) ON DELETE CASCADE,
    cod_vino INT NOT NULL REFERENCES vino(cod_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL,
    PRIMARY KEY (codigo_ingreso, cod_vino)
);

CREATE TABLE transferencia (
    numero_solicitud INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT,
    fecha_confeccion DATE NOT NULL DEFAULT CURRENT_DATE,
    estado estado_documento NOT NULL DEFAULT 'en_confeccion'
);

CREATE TABLE renglon_transferencia (
    numero_solicitud INT NOT NULL REFERENCES transferencia(numero_solicitud) ON DELETE CASCADE,
    cod_vino INT NOT NULL REFERENCES vino(cod_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL,
    PRIMARY KEY (numero_solicitud, cod_vino)
);

-- -----------------------------------------------------------------------------
-- 8. STOCK EN SALA Y VENTAS (COMPROBANTES)
-- -----------------------------------------------------------------------------
CREATE TABLE stock_sala (
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT,
    cod_vino INT NOT NULL REFERENCES vino(cod_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id_sala, cod_vino)
);

CREATE TABLE comprobante (
    numero_comprobante INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_cliente INT NOT NULL REFERENCES cliente(id_cliente) ON DELETE RESTRICT,
    id_sala INT NOT NULL REFERENCES sala_venta(id_sala) ON DELETE RESTRICT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    descuento NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE renglon_comprobante (
    numero_comprobante INT NOT NULL REFERENCES comprobante(numero_comprobante) ON DELETE CASCADE,
    cod_vino INT NOT NULL REFERENCES vino(cod_vino) ON DELETE RESTRICT,
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    descuento NUMERIC(10, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL,
    PRIMARY KEY (numero_comprobante, cod_vino)
);

-- -----------------------------------------------------------------------------
-- 9. AUDITORIA DE PRECIOS
-- -----------------------------------------------------------------------------
CREATE TABLE auditoria_precio (
    id_auditoria INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cod_vino INT NOT NULL REFERENCES vino(cod_vino) ON DELETE CASCADE,
    precio_anterior NUMERIC(10, 2) NOT NULL,
    precio_nuevo NUMERIC(10, 2) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(100) NOT NULL DEFAULT CURRENT_USER
);