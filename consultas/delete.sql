\set ON_ERROR_STOP on

-- D1: Borrar comprobantes de más de cinco años asociados
-- a clientes socios. El borrado arrastra sus renglones por CASCADE.
BEGIN;

SELECT COUNT(*) AS comprobantes_candidatos
FROM comprobante AS co
JOIN cliente_socio AS cs
    ON cs.id_cliente = co.id_cliente
WHERE co.fecha < CURRENT_DATE - INTERVAL '5 years';

DELETE FROM comprobante AS co
USING cliente_socio AS cs
WHERE cs.id_cliente = co.id_cliente
  AND co.fecha < CURRENT_DATE - INTERVAL '5 years'
RETURNING co.numero_comprobante;

SELECT
    COUNT(*) FILTER (
        WHERE co2.fecha < CURRENT_DATE - INTERVAL '5 years'
          AND EXISTS (
              SELECT 1
              FROM cliente_socio AS cs2
              WHERE cs2.id_cliente = co2.id_cliente
          )
    ) AS comprobantes_candidatos_restantes
FROM comprobante AS co2;

SELECT
    (
        SELECT COUNT(*)
        FROM renglon_comprobante AS r
        JOIN comprobante AS co2
            ON co2.numero_comprobante = r.numero_comprobante
        JOIN cliente_socio AS cs2
            ON cs2.id_cliente = co2.id_cliente
        WHERE co2.fecha < CURRENT_DATE - INTERVAL '5 years'
    ) AS renglones_asociados_restantes;

ROLLBACK;


-- D2: Eliminar cepas que no componen ningún vino ni están
-- plantadas en ninguna parcela.
BEGIN;

SELECT COUNT(*) AS cepas_candidatas
FROM cepa AS ce
WHERE NOT EXISTS (
    SELECT 1
    FROM composicion_vino AS cv
    WHERE cv.id_cepa = ce.id_cepa
)
AND NOT EXISTS (
    SELECT 1
    FROM parcela AS p
    WHERE p.id_cepa = ce.id_cepa
);

DELETE FROM cepa AS ce
WHERE NOT EXISTS (
    SELECT 1
    FROM composicion_vino AS cv
    WHERE cv.id_cepa = ce.id_cepa
)
AND NOT EXISTS (
    SELECT 1
    FROM parcela AS p
    WHERE p.id_cepa = ce.id_cepa
)
RETURNING ce.id_cepa, ce.nombre;

SELECT COUNT(*) AS cepas_candidatas_restantes
FROM cepa AS ce
WHERE NOT EXISTS (
    SELECT 1
    FROM composicion_vino AS cv
    WHERE cv.id_cepa = ce.id_cepa
)
AND NOT EXISTS (
    SELECT 1
    FROM parcela AS p
    WHERE p.id_cepa = ce.id_cepa
);

ROLLBACK;


-- D3: Eliminar empleados de salas de General Alvear
-- que trabajaron menos de dos años.
BEGIN;

SELECT COUNT(*) AS empleados_candidatos
FROM empleado AS e
JOIN sala_venta AS s
    ON s.id_sala = e.id_sala
JOIN localidad AS l
    ON l.codigo_postal = s.codigo_postal
WHERE l.nombre = 'General Alvear'
  AND e.fecha_ingreso > CURRENT_DATE - INTERVAL '2 years';

DELETE FROM empleado AS e
USING sala_venta AS s
JOIN localidad AS l
    ON l.codigo_postal = s.codigo_postal
WHERE e.id_sala = s.id_sala
  AND l.nombre = 'General Alvear'
  AND e.fecha_ingreso > CURRENT_DATE - INTERVAL '2 years'
RETURNING e.cuit, e.id_sala, e.fecha_ingreso;

SELECT COUNT(*) AS empleados_candidatos_restantes
FROM empleado AS e
JOIN sala_venta AS s
    ON s.id_sala = e.id_sala
JOIN localidad AS l
    ON l.codigo_postal = s.codigo_postal
WHERE l.nombre = 'General Alvear'
  AND e.fecha_ingreso > CURRENT_DATE - INTERVAL '2 years';

ROLLBACK;


-- D4: Borrar clientes socios que nunca compraron y tienen
-- más de cinco años desde el alta.
BEGIN;

SELECT COUNT(*) AS socios_candidatos
FROM cliente AS c
JOIN cliente_socio AS cs
    ON cs.id_cliente = c.id_cliente
WHERE c.fecha_alta < CURRENT_DATE - INTERVAL '5 years'
  AND NOT EXISTS (
      SELECT 1
      FROM comprobante AS co
      WHERE co.id_cliente = c.id_cliente
  );

DELETE FROM cliente AS c
USING cliente_socio AS cs
WHERE cs.id_cliente = c.id_cliente
  AND c.fecha_alta < CURRENT_DATE - INTERVAL '5 years'
  AND NOT EXISTS (
      SELECT 1
      FROM comprobante AS co
      WHERE co.id_cliente = c.id_cliente
  )
RETURNING c.id_cliente, c.nombre_razon_social;

SELECT COUNT(*) AS socios_candidatos_restantes
FROM cliente AS c
JOIN cliente_socio AS cs
    ON cs.id_cliente = c.id_cliente
WHERE c.fecha_alta < CURRENT_DATE - INTERVAL '5 years'
  AND NOT EXISTS (
      SELECT 1
      FROM comprobante AS co
      WHERE co.id_cliente = c.id_cliente
  );

ROLLBACK;


-- D5: Intentar borrar ingresos procesados de hace más de 365 días.
-- RN-12 impide borrar sus renglones mediante ON DELETE CASCADE:
-- los renglones solo pueden modificarse cuando el ingreso está
-- en_confeccion. Se conserva esta prueba para documentar la restricción.
BEGIN;

SELECT COUNT(*) AS ingresos_candidatos
FROM ingreso
WHERE estado = 'procesado'
  AND fecha < CURRENT_DATE - INTERVAL '365 days';

DO $$
BEGIN
    DELETE FROM ingreso
    WHERE estado = 'procesado'
      AND fecha < CURRENT_DATE - INTERVAL '365 days';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE
            'D5 rechazada por la regla activa de renglones: %',
            SQLERRM;
END;
$$;

SELECT COUNT(*) AS ingresos_candidatos_restantes
FROM ingreso
WHERE estado = 'procesado'
  AND fecha < CURRENT_DATE - INTERVAL '365 days';

ROLLBACK;


-- D6: Borrar clientes socios sin compras que viven
-- en una localidad específica.
-- Parámetro: :localidad corresponde al nombre de una localidad existente.
\set localidad 'General Alvear'
BEGIN;

SELECT COUNT(*) AS socios_candidatos
FROM cliente AS c
JOIN cliente_socio AS cs
    ON cs.id_cliente = c.id_cliente
WHERE c.localidad = :'localidad'
  AND NOT EXISTS (
      SELECT 1
      FROM comprobante AS co
      WHERE co.id_cliente = c.id_cliente
  );

DELETE FROM cliente AS c
USING cliente_socio AS cs
WHERE cs.id_cliente = c.id_cliente
  AND c.localidad = :'localidad'
  AND NOT EXISTS (
      SELECT 1
      FROM comprobante AS co
      WHERE co.id_cliente = c.id_cliente
  )
RETURNING c.id_cliente, c.nombre_razon_social;

SELECT COUNT(*) AS socios_candidatos_restantes
FROM cliente AS c
JOIN cliente_socio AS cs
    ON cs.id_cliente = c.id_cliente
WHERE c.localidad = :'localidad'
  AND NOT EXISTS (
      SELECT 1
      FROM comprobante AS co
      WHERE co.id_cliente = c.id_cliente
  );

ROLLBACK;
