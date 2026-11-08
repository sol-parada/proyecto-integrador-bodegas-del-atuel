-- ============================================================================
-- BODEGAS DEL ATUEL - CARGA DE CATALOGOS Y CONSULTAS DE CONTROL
-- Autor: Renata (CatÃ¡logos y Control)
-- ============================================================================

-- 1. LIMPIEZA PREVIA PARA EVITAR VIOLACIONES DE PK EN RE-EJECUCION
TRUNCATE TABLE cepa, maridaje RESTART IDENTITY CASCADE;

-- 2. IMPORTACION DE DATOS DESDE CSV
\copy cepa(id_cepa, nombre, tipo) FROM 'data/cepas.csv' WITH (FORMAT csv, HEADER true);
\copy maridaje(id_maridaje, nombre, temp_servicio_sugerida_c) FROM 'data/maridajes.csv' WITH (FORMAT csv, HEADER true);

-- 3. REAJUSTE DE SECUENCIAS (SERIAL)
SELECT setval(pg_get_serial_sequence('cepa', 'id_cepa'), COALESCE(MAX(id_cepa), 1)) FROM cepa;
SELECT setval(pg_get_serial_sequence('maridaje', 'id_maridaje'), COALESCE(MAX(id_maridaje), 1)) FROM maridaje;

-- 4. CONSULTAS DE CONTROL Y AUDITORIA
\echo '=== CONTROL 1: Conteo general por tabla de catÃ¡logo ==='
SELECT 'cepa' AS tabla, COUNT(*) AS total_registros FROM cepa
UNION ALL
SELECT 'maridaje' AS tabla, COUNT(*) AS total_registros FROM maridaje;

\echo '=== CONTROL 2: Cepas agrupadas por tipo de uva ==='
SELECT tipo, COUNT(*) AS cantidad_cepas
FROM cepa
GROUP BY tipo
ORDER BY cantidad_cepas DESC;

\echo '=== CONTROL 3: Listado completo de maridajes ==='
SELECT id_maridaje, nombre, temp_servicio_sugerida_c
FROM maridaje
ORDER BY id_maridaje;