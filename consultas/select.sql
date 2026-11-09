\set ON_ERROR_STOP on

-- S1: Ranking de los 10 vinos con mayor cantidad de botellas vendidas
-- en toda la red de salas.
SELECT
    v.cod_vino,
    v.nombre,
    SUM(r.cantidad) AS botellas_vendidas
FROM vino AS v
JOIN renglon_comprobante AS r
    ON r.cod_vino = v.cod_vino
GROUP BY v.cod_vino, v.nombre
ORDER BY botellas_vendidas DESC, v.cod_vino
LIMIT 10;


-- S2: Vinos que se vendieron en todas las salas.
-- Se utiliza división relacional con NOT EXISTS.
SELECT
    v.cod_vino,
    v.nombre
FROM vino AS v
WHERE NOT EXISTS (
    SELECT 1
    FROM sala_venta AS s
    WHERE NOT EXISTS (
        SELECT 1
        FROM comprobante AS c
        JOIN renglon_comprobante AS r
            ON r.numero_comprobante = c.numero_comprobante
        WHERE c.id_sala = s.id_sala
          AND r.cod_vino = v.cod_vino
    )
)
ORDER BY v.cod_vino;


-- S7: Empresa de transporte con mayor actividad durante el último mes.
-- La actividad se mide por la cantidad de ingresos trasladados.
SELECT
    t.codigo_transportista,
    t.razon_social,
    COUNT(i.codigo_ingreso) AS ingresos_trasladados
FROM transportista AS t
JOIN ingreso AS i
    ON i.codigo_transportista = t.codigo_transportista
WHERE i.fecha >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY t.codigo_transportista, t.razon_social
ORDER BY ingresos_trasladados DESC, t.codigo_transportista
LIMIT 1;


-- S8: Monto total de ventas por sala durante el último trimestre.
SELECT
    c.id_sala,
    SUM(c.total) AS monto_total_ventas
FROM comprobante AS c
WHERE c.fecha >= CURRENT_DATE - INTERVAL '3 months'
GROUP BY c.id_sala
ORDER BY monto_total_ventas DESC, c.id_sala;


-- S9: Ficha completa de un vino.
-- Incluye cepas, porcentajes, bodega, maridajes y stock total.
-- Parámetro: :vino corresponde al código de un vino existente.
\set vino 90
WITH composicion AS (
    SELECT
        cv.cod_vino,
        jsonb_agg(
            jsonb_build_object(
                'cepa', ce.nombre,
                'porcentaje', cv.porcentaje
            )
            ORDER BY ce.nombre
        ) AS cepas
    FROM composicion_vino AS cv
    JOIN cepa AS ce
        ON ce.id_cepa = cv.id_cepa
    GROUP BY cv.cod_vino
),
maridajes AS (
    SELECT
        vm.cod_vino,
        jsonb_agg(
            jsonb_build_object(
                'maridaje', m.nombre,
                'temperatura_c', m.temp_servicio_sugerida_c
            )
            ORDER BY m.nombre
        ) AS maridajes
    FROM vino_maridaje AS vm
    JOIN maridaje AS m
        ON m.id_maridaje = vm.id_maridaje
    GROUP BY vm.cod_vino
),
stock_salas AS (
    SELECT cod_vino, SUM(cantidad) AS cantidad
    FROM stock_sala
    GROUP BY cod_vino
)
SELECT
    v.cod_vino,
    v.nombre,
    v.tipo,
    v.anada,
    b.razon_social AS bodega,
    COALESCE(c.cepas, '[]'::jsonb) AS cepas,
    COALESCE(m.maridajes, '[]'::jsonb) AS maridajes,
    COALESCE(sd.cantidad, 0) AS stock_deposito,
    COALESCE(ss.cantidad, 0) AS stock_salas,
    COALESCE(sd.cantidad, 0) + COALESCE(ss.cantidad, 0) AS stock_total
FROM vino AS v
JOIN bodega AS b
    ON b.cuit = v.cuit_bodega
LEFT JOIN composicion AS c
    ON c.cod_vino = v.cod_vino
LEFT JOIN maridajes AS m
    ON m.cod_vino = v.cod_vino
LEFT JOIN stock_deposito AS sd
    ON sd.cod_vino = v.cod_vino
LEFT JOIN stock_salas AS ss
    ON ss.cod_vino = v.cod_vino
WHERE v.cod_vino = :'vino'::INTEGER;


-- S10: Rendimiento de cada parcela y campaña, identificando
-- las parcelas por debajo del promedio de su finca y campaña.
WITH rendimientos AS (
    SELECT
        p.id_finca,
        p.nro_parcela,
        l.campana,
        l.kg_cosechados / NULLIF(p.superficie_ha, 0) AS kg_por_ha
    FROM parcela AS p
    JOIN lote_uva AS l
        ON l.id_finca = p.id_finca
       AND l.nro_parcela = p.nro_parcela
),
comparacion AS (
    SELECT
        r.*,
        (
            SELECT AVG(r2.kg_por_ha)
            FROM rendimientos AS r2
            WHERE r2.id_finca = r.id_finca
              AND r2.campana = r.campana
        ) AS promedio_finca
    FROM rendimientos AS r
)
SELECT
    id_finca,
    nro_parcela,
    campana,
    kg_por_ha,
    promedio_finca,
    kg_por_ha < promedio_finca AS bajo_promedio
FROM comparacion
ORDER BY id_finca, campana, nro_parcela;


-- S11a: Ranking de vinos dentro de cada sala por botellas vendidas.
WITH ventas AS (
    SELECT
        c.id_sala,
        r.cod_vino,
        SUM(r.cantidad) AS botellas_vendidas
    FROM comprobante AS c
    JOIN renglon_comprobante AS r
        ON r.numero_comprobante = c.numero_comprobante
    GROUP BY c.id_sala, r.cod_vino
)
SELECT
    id_sala,
    cod_vino,
    botellas_vendidas,
    RANK() OVER (
        PARTITION BY id_sala
        ORDER BY botellas_vendidas DESC
    ) AS puesto
FROM ventas
ORDER BY id_sala, puesto, cod_vino;


-- S11b: Ventas mensuales y acumulado histórico por sala.
WITH meses AS (
    SELECT
        id_sala,
        date_trunc('month', fecha)::DATE AS mes,
        SUM(total) AS ventas_mes
    FROM comprobante
    GROUP BY id_sala, date_trunc('month', fecha)::DATE
)
SELECT
    id_sala,
    mes,
    ventas_mes,
    SUM(ventas_mes) OVER (
        PARTITION BY id_sala
        ORDER BY mes
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS ventas_acumuladas
FROM meses
ORDER BY id_sala, mes;


-- S12a: Clientes que compraron todos los vinos de una bodega.
-- Parámetro: :bodega corresponde a un CUIT existente.
\set bodega '20126855092'
SELECT
    c.id_cliente,
    c.nombre_razon_social
FROM cliente AS c
WHERE EXISTS (
    SELECT 1
    FROM vino AS v
    WHERE v.cuit_bodega = :'bodega'::cuit_dom
)
AND NOT EXISTS (
    SELECT 1
    FROM vino AS v
    WHERE v.cuit_bodega = :'bodega'::cuit_dom
      AND NOT EXISTS (
          SELECT 1
          FROM comprobante AS co
          JOIN renglon_comprobante AS r
              ON r.numero_comprobante = co.numero_comprobante
          WHERE co.id_cliente = c.id_cliente
            AND r.cod_vino = v.cod_vino
      )
)
ORDER BY c.id_cliente;


-- S12b: Clientes que nunca compraron ningún vino tinto.
-- Se utiliza un anti-join y se evita NOT IN para no tener problemas con NULL.
SELECT
    c.id_cliente,
    c.nombre_razon_social
FROM cliente AS c
LEFT JOIN (
    SELECT DISTINCT co.id_cliente
    FROM comprobante AS co
    JOIN renglon_comprobante AS r
        ON r.numero_comprobante = co.numero_comprobante
    JOIN vino AS v
        ON v.cod_vino = r.cod_vino
    WHERE v.tipo = 'tinto'
) AS compradores_tintos
    ON compradores_tintos.id_cliente = c.id_cliente
WHERE compradores_tintos.id_cliente IS NULL
ORDER BY c.id_cliente;


-- S3: Cantidad de clientes de cada tipo que compraron en la sala
-- determinada durante la última semana.
-- Parámetro: :sala corresponde al ID de una sala existente.
\set sala 1
SELECT
    c.tipo_cliente,
    COUNT(DISTINCT c.id_cliente) AS cantidad_clientes
FROM comprobante AS co
JOIN cliente AS c
    ON c.id_cliente = co.id_cliente
WHERE co.id_sala = :'sala'::INTEGER
  AND co.fecha >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.tipo_cliente
ORDER BY c.tipo_cliente;


-- S4: Top 5 de salas que solicitaron mayor cantidad de un vino
-- mediante transferencias durante los últimos 15 días.
-- Parámetro: :vino corresponde al código de un vino existente.
\set vino 90
SELECT
    t.id_sala,
    SUM(rt.cantidad) AS botellas_solicitadas
FROM transferencia AS t
JOIN renglon_transferencia AS rt
    ON rt.numero_solicitud = t.numero_solicitud
WHERE rt.cod_vino = :'vino'::INTEGER
  AND t.fecha_confeccion >= CURRENT_DATE - INTERVAL '15 days'
GROUP BY t.id_sala
ORDER BY botellas_solicitadas DESC, t.id_sala
LIMIT 5;


-- S5: Salas con menor cantidad de transferencias pendientes.
-- Se incluyen salas sin ninguna transferencia pendiente.
SELECT
    s.id_sala,
    s.calle,
    s.numero,
    COUNT(t.numero_solicitud) AS transferencias_pendientes
FROM sala_venta AS s
LEFT JOIN transferencia AS t
    ON t.id_sala = s.id_sala
   AND t.estado <> 'procesado'
GROUP BY s.id_sala, s.calle, s.numero
ORDER BY transferencias_pendientes ASC, s.id_sala;


-- S6: Vinos sin stock en una sala determinada, pero con stock
-- disponible en el depósito central.
-- Parámetro: :sala corresponde al ID de una sala existente.
\set sala 1
SELECT
    v.cod_vino,
    v.nombre,
    COALESCE(ss.cantidad, 0) AS stock_sala,
    sd.cantidad AS stock_deposito
FROM vino AS v
JOIN stock_deposito AS sd
    ON sd.cod_vino = v.cod_vino
LEFT JOIN stock_sala AS ss
    ON ss.cod_vino = v.cod_vino
   AND ss.id_sala = :'sala'::INTEGER
WHERE COALESCE(ss.cantidad, 0) = 0
  AND sd.cantidad > 0
ORDER BY v.cod_vino;