\set ON_ERROR_STOP on

-- I1: Crear una cobertura entre General Alvear y el transportista
-- que trasladó menos ingresos durante el último trimestre.
-- La consulta evita duplicar una cobertura existente.
BEGIN;

WITH actividad AS (
    SELECT
        t.codigo_transportista,
        COUNT(i.codigo_ingreso) AS ingresos_trasladados
    FROM transportista AS t
    LEFT JOIN ingreso AS i
        ON i.codigo_transportista = t.codigo_transportista
       AND i.fecha >= CURRENT_DATE - INTERVAL '3 months'
    GROUP BY t.codigo_transportista
),
transportista_elegido AS (
    SELECT codigo_transportista
    FROM actividad
    ORDER BY ingresos_trasladados, codigo_transportista
    LIMIT 1
)
INSERT INTO transportista_cobertura (
    codigo_transportista,
    codigo_postal
)
SELECT
    te.codigo_transportista,
    l.codigo_postal
FROM transportista_elegido AS te
JOIN localidad AS l
    ON l.nombre = 'General Alvear'
   AND l.provincia = 'Mendoza'
ON CONFLICT (codigo_transportista, codigo_postal) DO NOTHING
RETURNING codigo_transportista, codigo_postal;

-- Control posterior: la cobertura debe existir dentro de la transacción.
SELECT
    tc.codigo_transportista,
    tc.codigo_postal
FROM transportista_cobertura AS tc
JOIN localidad AS l
    ON l.codigo_postal = tc.codigo_postal
WHERE l.nombre = 'General Alvear'
  AND l.provincia = 'Mendoza';

ROLLBACK;


-- I5: Insertar una nueva sala de venta asociada a una localidad existente.
BEGIN;

INSERT INTO sala_venta (
    calle,
    numero,
    dia_cierre,
    codigo_postal
)
VALUES (
    'Calle Etapa 5',
    '500',
    'lunes',
    '5620'
)
RETURNING id_sala \gset i5_

-- Control posterior: la sala existe dentro de la transacción.
SELECT id_sala, calle, numero, dia_cierre, codigo_postal
FROM sala_venta
WHERE id_sala = :i5_id_sala::INTEGER;

ROLLBACK;


-- I6: Crear un ingreso en confección por 120 botellas.
-- El vino y la bodega se seleccionan de una relación existente;
-- por ello el ingreso respeta la regla de compatibilidad de bodega.
BEGIN;

WITH seleccion AS (
    SELECT
        v.cod_vino,
        v.cuit_bodega,
        t.codigo_transportista
    FROM vino AS v
    CROSS JOIN LATERAL (
        SELECT codigo_transportista
        FROM transportista
        ORDER BY codigo_transportista
        LIMIT 1
    ) AS t
    ORDER BY v.cod_vino
    LIMIT 1
)
INSERT INTO ingreso (
    estado,
    codigo_transportista,
    cuit_bodega
)
SELECT
    'en_confeccion',
    codigo_transportista,
    cuit_bodega
FROM seleccion
RETURNING codigo_ingreso \gset i6_

INSERT INTO renglon_ingreso (
    codigo_ingreso,
    cod_vino,
    cantidad
)
SELECT
    :i6_codigo_ingreso::INTEGER,
    v.cod_vino,
    120
FROM vino AS v
WHERE v.cod_vino = (
    SELECT MIN(cod_vino)
    FROM vino
);

-- Control posterior: el ingreso queda en confección y con 120 botellas.
SELECT
    i.codigo_ingreso,
    i.estado,
    i.cuit_bodega,
    ri.cod_vino,
    ri.cantidad
FROM ingreso AS i
JOIN renglon_ingreso AS ri
    ON ri.codigo_ingreso = i.codigo_ingreso
WHERE i.codigo_ingreso = :i6_codigo_ingreso::INTEGER;

ROLLBACK;


-- I3: Crear un comprobante con tres renglones para un cliente dado
-- en la sala 1. Los triggers calculan precio, descuento y subtotal,
-- controlan el stock y actualizan los totales del comprobante.
BEGIN;

-- Parámetro: :cliente corresponde a un cliente existente.
\set cliente 1
INSERT INTO comprobante (
    id_cliente,
    id_sala
)
VALUES (
    :'cliente'::INTEGER,
    1
)
RETURNING numero_comprobante \gset i3_

-- Se eligen tres vinos distintos con al menos una botella disponible.
INSERT INTO renglon_comprobante (
    numero_comprobante,
    cod_vino,
    cantidad,
    precio_unitario,
    descuento,
    subtotal
)
SELECT
    :i3_numero_comprobante::INTEGER,
    ss.cod_vino,
    1,
    0,
    0,
    0
FROM stock_sala AS ss
WHERE ss.id_sala = 1
  AND ss.cantidad > 0
ORDER BY ss.cod_vino
LIMIT 3;

-- Control posterior: tres renglones y total calculado por la función.
SELECT
    c.numero_comprobante,
    COUNT(r.cod_vino) AS renglones,
    c.subtotal,
    c.descuento,
    c.total,
    fn_total_comprobante(c.numero_comprobante) AS total_funcion
FROM comprobante AS c
JOIN renglon_comprobante AS r
    ON r.numero_comprobante = c.numero_comprobante
WHERE c.numero_comprobante = :i3_numero_comprobante::INTEGER
GROUP BY c.numero_comprobante, c.subtotal, c.descuento, c.total;

ROLLBACK;


-- I4: Insertar una nueva bodega con un CUIT válido y no utilizado.
BEGIN;

INSERT INTO bodega (
    cuit,
    razon_social,
    domicilio
)
VALUES (
    '30999999991',
    'Bodega Etapa 5 de Prueba',
    'Ruta Provincial 143 km 10'
)
RETURNING cuit, razon_social, domicilio;

-- Control posterior: la bodega existe dentro de la transacción.
SELECT cuit, razon_social
FROM bodega
WHERE cuit = '30999999991';

ROLLBACK;


-- I2: Crear el maridaje «cordero al disco» y asociarlo a todos
-- los vinos tintos con graduación alcohólica de 14° o superior.
-- ON CONFLICT y NOT EXISTS evitan duplicaciones al reejecutar.
BEGIN;

INSERT INTO maridaje (
    nombre,
    temp_servicio_sugerida_c
)
VALUES (
    'cordero al disco',
    18.0
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO vino_maridaje (
    cod_vino,
    id_maridaje
)
SELECT
    v.cod_vino,
    m.id_maridaje
FROM vino AS v
JOIN maridaje AS m
    ON m.nombre = 'cordero al disco'
WHERE v.tipo = 'tinto'
  AND v.graduacion >= 14
ON CONFLICT (cod_vino, id_maridaje) DO NOTHING;

-- Control posterior: muestra las asociaciones creadas o ya existentes.
SELECT
    vm.cod_vino,
    v.nombre AS vino,
    v.graduacion,
    m.nombre AS maridaje
FROM vino_maridaje AS vm
JOIN vino AS v
    ON v.cod_vino = vm.cod_vino
JOIN maridaje AS m
    ON m.id_maridaje = vm.id_maridaje
WHERE m.nombre = 'cordero al disco'
ORDER BY vm.cod_vino;

ROLLBACK;
