-- ============================================================================
-- BODEGAS DEL ATUEL - 004_DATOS_PRUEBA.SQL
-- ============================================================================

-- Insertar clientes de prueba
INSERT INTO cliente (
    nombre_razon_social,
    tipo_doc,
    nro_doc,
    direccion,
    localidad,
    tipo_cliente,
    descuento
) VALUES
(
    'Distribuidora El Atuel',
    'CUIT',
    '30-71123456-8',
    'Av. Mitre 123',
    'San Rafael',
    'distribuidor',
    0.20
),
(
    'Juan Carlos Gómez',
    'DNI',
    '32987654',
    'Calle Las Heras 456',
    'San Rafael',
    'socio',
    0.10
)
ON CONFLICT (nro_doc) DO NOTHING;

-- Verificación de la función de cálculo de descuento
SELECT
    id_cliente,
    nombre_razon_social,
    tipo_cliente,
    fn_calcular_descuento_cliente(id_cliente, 10000.00) AS total_con_descuento
FROM cliente;