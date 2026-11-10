-- ============================================================================
-- 1. CREACIÓN DE ROLES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'rol_admin_sistema'
    ) THEN
        CREATE ROLE rol_admin_sistema NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'rol_operador_ventas'
    ) THEN
        CREATE ROLE rol_operador_ventas NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'rol_gerente_comercial'
    ) THEN
        CREATE ROLE rol_gerente_comercial NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'rol_propietario_procedimientos'
    ) THEN
        CREATE ROLE rol_propietario_procedimientos NOLOGIN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'rol_propietario_ventas'
    ) THEN
        CREATE ROLE rol_propietario_ventas NOLOGIN;
    END IF;
END
$$;

ALTER ROLE rol_admin_sistema NOLOGIN;
ALTER ROLE rol_operador_ventas NOLOGIN;
ALTER ROLE rol_gerente_comercial NOLOGIN;
ALTER ROLE rol_propietario_procedimientos NOLOGIN;
ALTER ROLE rol_propietario_ventas NOLOGIN;


-- ============================================================================
-- 2. REVOCACIONES GENERALES
-- ============================================================================

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public FROM PUBLIC;

REVOKE ALL ON ALL TABLES IN SCHEMA public
FROM rol_operador_ventas,
     rol_gerente_comercial,
     rol_propietario_procedimientos,
     rol_propietario_ventas;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public
FROM rol_operador_ventas,
     rol_gerente_comercial,
     rol_propietario_procedimientos,
     rol_propietario_ventas;

REVOKE EXECUTE ON ALL ROUTINES IN SCHEMA public
FROM rol_operador_ventas,
     rol_gerente_comercial,
     rol_propietario_procedimientos,
     rol_propietario_ventas;


-- ============================================================================
-- 3. ACCESO AL ESQUEMA
-- ============================================================================

GRANT USAGE ON SCHEMA public
TO rol_admin_sistema,
   rol_operador_ventas,
   rol_gerente_comercial,
   rol_propietario_procedimientos,
   rol_propietario_ventas;


-- ============================================================================
-- 4. PROPIETARIO DE PROCEDIMIENTOS
-- ============================================================================

GRANT SELECT ON
    public.ingreso,
    public.renglon_ingreso,
    public.transferencia,
    public.renglon_transferencia,
    public.vino
TO rol_propietario_procedimientos;

GRANT UPDATE (estado) ON
    public.ingreso,
    public.transferencia
TO rol_propietario_procedimientos;

GRANT UPDATE ON
    public.renglon_ingreso,
    public.renglon_transferencia
TO rol_propietario_procedimientos;

GRANT SELECT, INSERT, UPDATE ON
    public.stock_deposito,
    public.stock_sala
TO rol_propietario_procedimientos;

ALTER PROCEDURE public.sp_procesar_ingreso(INTEGER)
OWNER TO rol_propietario_procedimientos;

ALTER PROCEDURE public.sp_procesar_transferencia(INTEGER)
OWNER TO rol_propietario_procedimientos;

ALTER PROCEDURE public.sp_terminar_ingreso(INTEGER)
OWNER TO rol_propietario_procedimientos;

ALTER PROCEDURE public.sp_terminar_transferencia(INTEGER)
OWNER TO rol_propietario_procedimientos;


-- ============================================================================
-- 5. PROPIETARIO DE FUNCIONES DE VENTAS
-- ============================================================================

GRANT SELECT ON
    public.vino,
    public.cliente,
    public.comprobante,
    public.renglon_comprobante,
    public.stock_sala
TO rol_propietario_ventas;

GRANT UPDATE (cantidad)
ON public.stock_sala
TO rol_propietario_ventas;

GRANT UPDATE (subtotal, descuento, total)
ON public.comprobante
TO rol_propietario_ventas;

GRANT EXECUTE ON FUNCTION
    public.fn_descuento_cliente(INTEGER)
TO rol_propietario_ventas;

ALTER FUNCTION public.fn_trg_registrar_venta()
OWNER TO rol_propietario_ventas;

ALTER FUNCTION public.fn_trg_actualizar_totales_comprobante()
OWNER TO rol_propietario_ventas;

REVOKE ALL ON FUNCTION
    public.fn_trg_registrar_venta()
FROM PUBLIC;

REVOKE ALL ON FUNCTION
    public.fn_trg_actualizar_totales_comprobante()
FROM PUBLIC;


-- ============================================================================
-- 6. ADMINISTRADOR
-- ============================================================================

GRANT CREATE ON SCHEMA public
TO rol_admin_sistema;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
TO rol_admin_sistema;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
TO rol_admin_sistema;

GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public
TO rol_admin_sistema;


-- ============================================================================
-- 7. OPERADOR DE VENTAS / API
-- ============================================================================

GRANT SELECT ON
    public.vino,
    public.composicion_vino,
    public.cepa,
    public.maridaje,
    public.vino_maridaje,
    public.bodega,
    public.sala_venta,
    public.localidad,
    public.cliente,
    public.cliente_socio,
    public.cliente_distribuidor,
    public.cliente_exportador,
    public.permiso_exportacion,
    public.transportista,
    public.stock_deposito,
    public.stock_sala,
    public.comprobante,
    public.renglon_comprobante,
    public.ingreso,
    public.renglon_ingreso,
    public.transferencia,
    public.renglon_transferencia
TO rol_operador_ventas;

GRANT INSERT (fecha, id_cliente, id_sala)
ON public.comprobante
TO rol_operador_ventas;

GRANT INSERT
ON public.renglon_comprobante
TO rol_operador_ventas;

GRANT INSERT (
    fecha,
    codigo_transportista,
    cuit_bodega
) ON public.ingreso
TO rol_operador_ventas;

GRANT INSERT (id_sala)
ON public.transferencia
TO rol_operador_ventas;

GRANT INSERT ON
    public.renglon_ingreso,
    public.renglon_transferencia
TO rol_operador_ventas;

GRANT UPDATE (
    fecha,
    codigo_transportista,
    cuit_bodega
) ON public.ingreso
TO rol_operador_ventas;

GRANT UPDATE (id_sala)
ON public.transferencia
TO rol_operador_ventas;

GRANT UPDATE (
    cod_vino,
    cantidad
) ON public.renglon_ingreso
TO rol_operador_ventas;

GRANT UPDATE (
    cod_vino,
    cantidad
) ON public.renglon_transferencia
TO rol_operador_ventas;

GRANT DELETE ON
    public.renglon_ingreso,
    public.renglon_transferencia
TO rol_operador_ventas;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public
TO rol_operador_ventas;


-- El operador puede ejecutar los procedimientos controlados.
GRANT EXECUTE ON PROCEDURE
    public.sp_procesar_ingreso(INTEGER),
    public.sp_procesar_transferencia(INTEGER),
    public.sp_terminar_ingreso(INTEGER),
    public.sp_terminar_transferencia(INTEGER)
TO rol_operador_ventas;


-- El operador no modifica directamente el inventario ni los totales.
REVOKE UPDATE ON
    public.stock_deposito,
    public.stock_sala,
    public.comprobante,
    public.renglon_comprobante
FROM rol_operador_ventas;

REVOKE UPDATE (estado)
ON public.ingreso, public.transferencia
FROM rol_operador_ventas;


-- Permisos de lectura de funciones.
GRANT EXECUTE ON FUNCTION
    public.fn_descuento_cliente(INTEGER),
    public.fn_calcular_descuento_cliente(INTEGER, NUMERIC),
    public.fn_stock_sala(INTEGER, INTEGER),
    public.fn_total_comprobante(INTEGER),
    public.fn_antiguedad_anios(DATE),
    public.fn_antiguedad_anios(DATE, DATE)
TO rol_operador_ventas;


-- Permiso necesario para ejecutar triggers al insertar ventas.
GRANT EXECUTE ON FUNCTION
    public.fn_trg_registrar_venta(),
    public.fn_trg_actualizar_totales_comprobante()
TO rol_operador_ventas;


-- El operador solo consulta estas vistas.
GRANT SELECT ON
    public.vw_stock_total_vinos,
    public.vw_clientes_exportadores_info,
    public.vw_resumen_comprobantes
TO rol_operador_ventas;


-- ============================================================================
-- 8. GERENTE COMERCIAL
-- ============================================================================

GRANT SELECT ON
    public.vw_stock_total_vinos,
    public.vw_clientes_exportadores_info,
    public.vw_resumen_comprobantes
TO rol_gerente_comercial;


-- ============================================================================
-- FIN DE 007_ROLES.SQL
-- ============================================================================