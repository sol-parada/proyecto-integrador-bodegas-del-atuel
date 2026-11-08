-- ============================================================================
-- BODEGAS DEL ATUEL - SUITE DE PRUEBAS SQL (ETAPA 2)
-- Autor: Renata (QA / Pruebas)
-- ============================================================================

\echo '=== PRUEBA 1: Verificación de cálculo de descuentos ==='

SELECT
    id_cliente,
    nombre_razon_social,
    tipo_cliente,
    fn_calcular_descuento_cliente(id_cliente, 10000.00) AS total_con_descuento
FROM cliente;


\echo '=== PRUEBA 2: Validación de trigger - Cantidad válida ==='

INSERT INTO localidad (
    codigo_postal,
    nombre,
    provincia,
    encargado_regional
)
VALUES (
    '5600',
    'San Rafael',
    'Mendoza',
    'Carlos Gomez'
)
ON CONFLICT (codigo_postal) DO NOTHING;


INSERT INTO bodega (
    cuit,
    razon_social,
    domicilio
)
VALUES (
    '30711234568',
    'Bodegas del Atuel S.A.',
    'Av. Balloffet 456'
)
ON CONFLICT (cuit) DO NOTHING;


INSERT INTO sala_venta (
    calle,
    numero,
    dia_cierre,
    codigo_postal
)
VALUES (
    'Av. San Martin',
    123,
    'Domingo',
    '5600'
)
ON CONFLICT DO NOTHING;


INSERT INTO vino (
    nombre,
    tipo,
    anada,
    volumen_ml,
    graduacion,
    precio,
    cuit_bodega
)
VALUES (
    'Malbec Reserva',
    'tinto',
    2022,
    750,
    14.5,
    1200.00,
    '30711234568'
)
ON CONFLICT DO NOTHING;


INSERT INTO stock_sala (
    id_sala,
    cod_vino,
    cantidad
)
VALUES (
    (
        SELECT id_sala
        FROM sala_venta
        WHERE calle = 'Av. San Martin'
          AND numero = '123'
        LIMIT 1
    ),
    (
        SELECT cod_vino
        FROM vino
        WHERE nombre = 'Malbec Reserva'
          AND anada = 2022
        LIMIT 1
    ),
    5
)
ON CONFLICT (id_sala, cod_vino)
DO UPDATE SET cantidad = EXCLUDED.cantidad;


INSERT INTO comprobante (
    id_cliente,
    id_sala,
    fecha,
    total
)
VALUES (
    (
        SELECT id_cliente
        FROM cliente
        ORDER BY id_cliente
        LIMIT 1
    ),
    (
        SELECT id_sala
        FROM sala_venta
        WHERE calle = 'Av. San Martin'
          AND numero = '123'
        LIMIT 1
    ),
    CURRENT_DATE,
    6000.00
);


INSERT INTO renglon_comprobante (
    numero_comprobante,
    cod_vino,
    cantidad,
    precio_unitario,
    descuento,
    subtotal
)
VALUES (
    currval(pg_get_serial_sequence('comprobante', 'numero_comprobante')),
    (
        SELECT cod_vino
        FROM vino
        WHERE nombre = 'Malbec Reserva'
          AND anada = 2022
        LIMIT 1
    ),
    5,
    1200.00,
    0,
    6000.00
);


\echo '=== PRUEBA 3: Validación de trigger - Cantidad inválida ==='

DO $$
BEGIN
    INSERT INTO renglon_comprobante (
        numero_comprobante,
        cod_vino,
        cantidad,
        precio_unitario,
        descuento,
        subtotal
    )
    VALUES (
        currval(pg_get_serial_sequence('comprobante', 'numero_comprobante')),
        (
            SELECT cod_vino
            FROM vino
            WHERE nombre = 'Malbec Reserva'
              AND anada = 2022
            LIMIT 1
        ),
        0,
        1200.00,
        0,
        0
    );

    RAISE EXCEPTION 'La prueba falló: se permitió una cantidad igual a cero';

EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM LIKE 'La prueba falló:%' THEN
            RAISE;
        END IF;

        RAISE NOTICE
            'Prueba exitosa: se capturó el error esperado del trigger -> %',
            SQLERRM;
END;
$$;