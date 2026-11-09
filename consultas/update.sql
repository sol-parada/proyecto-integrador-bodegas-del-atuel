-- U1–U6. Pruebas reversibles; cada bloque es independiente.
\set ON_ERROR_STOP on
\set bodega '20126855092'

-- U1: ejercicio de recálculo con política ACTUAL. No ejecutar sobre historia real
-- sin autorización comercial. Precio histórico del renglón; jamás precio actual del vino.
BEGIN;
SELECT
    COUNT(*) AS comprobantes,
    COALESCE(SUM(total), 0) AS total_antes
FROM comprobante;

UPDATE renglon_comprobante r
SET descuento = ROUND(r.cantidad * r.precio_unitario * fn_descuento_cliente(c.id_cliente), 2),
    subtotal = r.cantidad * r.precio_unitario
               - ROUND(r.cantidad * r.precio_unitario * fn_descuento_cliente(c.id_cliente), 2)
FROM comprobante c WHERE c.numero_comprobante = r.numero_comprobante;
WITH importes AS (
    SELECT c.numero_comprobante,
           COALESCE(SUM(r.cantidad * r.precio_unitario), 0) AS bruto,
           COALESCE(SUM(r.descuento), 0) AS bonificacion
    FROM comprobante c LEFT JOIN renglon_comprobante r USING(numero_comprobante)
    GROUP BY c.numero_comprobante
)
UPDATE comprobante c SET subtotal = i.bruto, descuento = i.bonificacion,
    total = fn_total_comprobante(c.numero_comprobante)
FROM importes i WHERE i.numero_comprobante = c.numero_comprobante
;

SELECT
    COUNT(*) AS comprobantes,
    COALESCE(SUM(total), 0) AS total_despues
FROM comprobante;
ROLLBACK;

-- U2: 'más de 5' incluye cinco años y un día; no usar años completos > 5.
BEGIN;
SELECT COUNT(*) AS empleados_candidatos
FROM empleado
WHERE fecha_ingreso < (CURRENT_DATE - INTERVAL '5 years')::date;

UPDATE empleado
SET salario = ROUND(salario * 1.20, 2)
WHERE fecha_ingreso < (CURRENT_DATE - INTERVAL '5 years')::date;

SELECT COUNT(*) AS empleados_actualizados
FROM empleado
WHERE fecha_ingreso < (CURRENT_DATE - INTERVAL '5 years')::date;
ROLLBACK;

-- U3: El trigger RN-13 debe auditar el cambio de precio.
BEGIN;
SELECT COUNT(*) AS vinos_candidatos
FROM vino
WHERE cuit_bodega = :'bodega'::cuit_dom;

SELECT COUNT(*) AS auditorias_antes
FROM auditoria_precio;

UPDATE vino
SET precio = ROUND(precio * 1.13, 2)
WHERE cuit_bodega = :'bodega'::cuit_dom;

SELECT COUNT(*) AS auditorias_despues
FROM auditoria_precio;
ROLLBACK;

-- U4: ambos cambios en una sola sentencia, usando los valores
-- concretos del dataset: Lunes y Miércoles.
BEGIN;
SELECT dia_cierre, COUNT(*) AS cantidad
FROM sala_venta
WHERE dia_cierre IN ('Lunes', U&'Mi\00e9rcoles')
GROUP BY dia_cierre
ORDER BY dia_cierre;

UPDATE sala_venta
SET dia_cierre = CASE dia_cierre
    WHEN 'Lunes' THEN U&'Mi\00e9rcoles'
    WHEN U&'Mi\00e9rcoles' THEN 'Lunes'
END
WHERE dia_cierre IN ('Lunes', U&'Mi\00e9rcoles');

SELECT dia_cierre, COUNT(*) AS cantidad
FROM sala_venta
WHERE dia_cierre IN ('Lunes', U&'Mi\00e9rcoles')
GROUP BY dia_cierre
ORDER BY dia_cierre;
ROLLBACK;

-- U5: incluye vinos con cero ventas; desempate determinista por código.
BEGIN;
SELECT COUNT(*) AS vinos_candidatos
FROM (
    SELECT v.cod_vino
    FROM vino v
    LEFT JOIN renglon_comprobante r USING(cod_vino)
    GROUP BY v.cod_vino
    ORDER BY COALESCE(SUM(r.cantidad), 0), v.cod_vino
    LIMIT 10
) AS candidatos;

WITH menos_vendidos AS (
    SELECT v.cod_vino FROM vino v
    LEFT JOIN renglon_comprobante r USING(cod_vino)
    GROUP BY v.cod_vino ORDER BY COALESCE(SUM(r.cantidad), 0), v.cod_vino LIMIT 10
)
UPDATE vino v
SET precio = ROUND(v.precio * 0.85, 2)
FROM menos_vendidos m
WHERE m.cod_vino = v.cod_vino;

SELECT COUNT(*) AS auditorias_generadas
FROM auditoria_precio
WHERE fecha_hora >= CURRENT_TIMESTAMP - INTERVAL '1 minute';
ROLLBACK;

-- U6: descuento vigente del 35 % para exportadores con más de tres permisos.
-- Cuenta TODOS los permisos, no solamente los vigentes (la consigna no filtra fechas).
-- No modifica comprobantes ni renglones históricos. Reejecutar no produce cambios extra.
-- Ejecutar con administrador autorizado; NO dar UPDATE(cliente) a la API por este ejercicio.
BEGIN;
SELECT COUNT(*) AS exportadores_candidatos
FROM public.cliente AS c
WHERE c.tipo_cliente = 'exportador'
  AND (SELECT COUNT(*) FROM public.permiso_exportacion AS p
       WHERE p.id_cliente_exportador = c.id_cliente) > 3
  AND c.descuento IS DISTINCT FROM 0.35;

UPDATE public.cliente AS c
SET descuento = 0.35
WHERE c.tipo_cliente = 'exportador'
  AND (SELECT COUNT(*) FROM public.permiso_exportacion AS p
       WHERE p.id_cliente_exportador = c.id_cliente) > 3
  AND c.descuento IS DISTINCT FROM 0.35
;

SELECT COUNT(*) AS exportadores_con_descuento
FROM public.cliente AS c
WHERE c.tipo_cliente = 'exportador'
  AND c.descuento = 0.35
  AND (SELECT COUNT(*) FROM public.permiso_exportacion AS p
       WHERE p.id_cliente_exportador = c.id_cliente) > 3;
ROLLBACK;
