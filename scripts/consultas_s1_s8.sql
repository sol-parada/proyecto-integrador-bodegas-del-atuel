-- ============================================================================
-- BODEGAS DEL ATUEL - CONSULTAS DE SELECCIÃ“N E INFORMES (S1 A S8)
-- Responsable: Renata
-- Base de Datos: PostgreSQL 18
-- ============================================================================

\echo '=== S1: Listado general de vinos con su cepa principal ==='
SELECT 
    v.cod_vino, 
    v.nombre AS vino, 
    v.precio, 
    c.nombre AS cepa_principal, 
    c.tipo AS tipo_cepa
FROM vino v
JOIN composicion_vino cv ON v.cod_vino = cv.cod_vino
JOIN cepa c ON cv.id_cepa = c.id_cepa
ORDER BY v.nombre;

\echo '=== S2: Vinos tintos con precio superior al precio promedio ==='
SELECT 
    v.cod_vino, 
    v.nombre, 
    v.precio
FROM vino v
JOIN composicion_vino cv ON v.cod_vino = cv.cod_vino
JOIN cepa c ON cv.id_cepa = c.id_cepa
WHERE c.tipo = 'tinta'
  AND v.precio > (SELECT AVG(precio) FROM vino)
ORDER BY v.precio DESC;

\echo '=== S3: Cantidad de variedades de vino producidas por tipo de cepa ==='
SELECT 
    c.tipo AS tipo_cepa, 
    COUNT(DISTINCT v.cod_vino) AS total_variedades
FROM vino v
JOIN composicion_vino cv ON v.cod_vino = cv.cod_vino
JOIN cepa c ON cv.id_cepa = c.id_cepa
GROUP BY c.tipo;

\echo '=== S4: Maridajes sugeridos y temperatura de servicio ==='
SELECT 
    v.nombre AS vino, 
    m.nombre AS maridaje_sugerido, 
    m.temp_servicio_sugerida_c
FROM vino v
JOIN vino_maridaje vm ON v.cod_vino = vm.cod_vino
JOIN maridaje m ON vm.id_maridaje = m.id_maridaje
ORDER BY v.nombre;

\echo '=== S5: Top 5 vinos con mayor valor de catÃ¡logo ==='
SELECT 
    cod_vino, 
    nombre, 
    precio, 
    graduacion
FROM vino
ORDER BY precio DESC
LIMIT 5;

\echo '=== S6: Precio promedio de vinos agrupados por cepa ==='
SELECT 
    c.nombre AS cepa, 
    ROUND(AVG(v.precio), 2) AS precio_promedio
FROM vino v
JOIN composicion_vino cv ON v.cod_vino = cv.cod_vino
JOIN cepa c ON cv.id_cepa = c.id_cepa
GROUP BY c.nombre
ORDER BY precio_promedio DESC;

\echo '=== S7: Vinos que no poseen maridaje asignado ==='
SELECT 
    v.cod_vino, 
    v.nombre
FROM vino v
LEFT JOIN vino_maridaje vm ON v.cod_vino = vm.cod_vino
WHERE vm.id_maridaje IS NULL;

\echo '=== S8: Informe consolidado de stock y graduaciÃ³n alcohÃ³lica ==='
SELECT 
    COUNT(*) AS total_variedades,
    ROUND(AVG(graduacion), 2) AS graduacion_promedio,
    MIN(precio) AS precio_minimo,
    MAX(precio) AS precio_maximo
FROM vino;