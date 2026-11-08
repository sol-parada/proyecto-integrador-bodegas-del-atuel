-- ============================================================================
-- BODEGAS DEL ATUEL - MEDICIÃ“N DE RENDIMIENTO (ANTES VS. DESPUÃ‰S)
-- Autor: Renata
-- ============================================================================

\echo '=== 1. MEDICIÃ“N ANTES: Consulta sin Ã­ndice (BÃºsqueda por precio) ==='
-- Desactivamos el uso de Ã­ndices para forzar el escaneo secuencial (Antes)
SET enable_indexscan = OFF;

EXPLAIN ANALYZE
SELECT cod_vino, nombre, precio, graduacion
FROM vino
WHERE precio > 1000.00;

\echo '=== 2. CREACIÃ“N DEL ÃNDICE ==='
CREATE INDEX IF NOT EXISTS idx_vino_precio ON vino(precio);

\echo '=== 3. MEDICIÃ“N DESPUÃ‰S: Consulta optimizada con Ã­ndice ==='
-- Reactivamos el uso de Ã­ndices para medir el impacto (DespuÃ©s)
SET enable_indexscan = ON;

EXPLAIN ANALYZE
SELECT cod_vino, nombre, precio, graduacion
FROM vino
WHERE precio > 1000.00;