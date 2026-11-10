-- =============================================================================
-- BODEGAS DEL ATUEL - 009_ETAPA6_API.SQL
-- Ajustes de la base para la API REST (Etapa 6)
-- =============================================================================
--
-- Ejecutar DESPUÉS de:
--   001_esquema.sql
--   002_constraints.sql
--   003_funciones.sql
--   004_procedimientos.sql
--   005_triggers.sql
--   006_vistas.sql
--   007_roles.sql
--   008_indices.sql
--
-- Es idempotente: se puede volver a aplicar sobre una base ya migrada.
--
-- Este archivo resuelve tres puntos que la etapa 6 dejó pendientes:
--
--   1. El rol con LOGIN que usa la API. La etapa 2 creó roles NOLOGIN de
--      agrupación, pero ningún rol podía conectarse por password. El TPI
--      exige que la API se conecte con un rol de lectura/escritura que NO
--      sea el propietario, y la rúbrica descuenta puntos si la API entra
--      como superusuario.
--
--   2. El descuento vigente de los clientes (RN-06). La columna cliente
--      .descuento es NOT NULL y no tenía DEFAULT, por lo que la API no
--      podía dar de alta clientes. El descuento lo decide la base según
--      el tipo de cliente, no la API (regla de oro del TPI).
--
--   3. Los GRANT que la API necesita sobre auditoria_precio. El trigger
--      RN-13 inserta ahí y el endpoint /reportes/trazabilidad lo consulta.
--
-- -----------------------------------------------------------------------------
-- 1. ROL DE LECTURA/ESCRITURA DE LA API
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = 'app_api'
    ) THEN
        CREATE ROLE app_api LOGIN;
    END IF;
END
$$;

ALTER ROLE app_api LOGIN;
ALTER ROLE app_api NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

-- La contraseña real NO vive en el repositorio. Se define al desplegar:
--   psql -v api_password="$API_DB_PASSWORD" -f 009_etapa6_api.sql
-- o, si ya existe el rol, con un ALTER ROLE app_api PASSWORD '...'.
\if :{?api_password}
ALTER ROLE app_api PASSWORD :'api_password';
\endif

-- -----------------------------------------------------------------------------
-- 2. RN-06: EL DESCUENTO LO DEFINE LA BASE, NO LA API
-- -----------------------------------------------------------------------------
-- El trigger completa la columna en los INSERT. Así la API nunca calcula
-- descuentos y la regla sigue valiendo aunque alguien acceda por psql.

CREATE OR REPLACE FUNCTION public.fn_trg_cliente_descuento()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Si cambia el tipo de cliente, el descuento vigente se recalcula.
        -- Si no cambia, se respeta el valor actual (U6 permite subirlo al 35 %).
        IF NEW.tipo_cliente IS DISTINCT FROM OLD.tipo_cliente THEN
            NEW.descuento := CASE NEW.tipo_cliente
                WHEN 'socio' THEN 0.10
                WHEN 'distribuidor' THEN 0.20
                WHEN 'exportador' THEN 0.30
            END;
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.descuento IS NULL THEN
        NEW.descuento := CASE NEW.tipo_cliente
            WHEN 'socio' THEN 0.10
            WHEN 'distribuidor' THEN 0.20
            WHEN 'exportador' THEN 0.30
        END;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_descuento ON public.cliente;

CREATE TRIGGER trg_cliente_descuento
BEFORE INSERT OR UPDATE OF tipo_cliente ON public.cliente
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_cliente_descuento();

-- -----------------------------------------------------------------------------
-- 3. PRIVILEGIOS MÍNIMOS DE LA API
-- -----------------------------------------------------------------------------
-- Solo lo que la API usa. El stock y los totales NO se modifican desde la
-- API: los triggers y procedimientos de la base son los únicos autorizados.

GRANT USAGE ON SCHEMA public TO app_api;

-- Solo lectura.
GRANT SELECT ON
    public.vino,
    public.bodega,
    public.cepa,
    public.composicion_vino,
    public.maridaje,
    public.vino_maridaje,
    public.cliente,
    public.cliente_socio,
    public.cliente_distribuidor,
    public.cliente_exportador,
    public.permiso_exportacion,
    public.transportista,
    public.localidad,
    public.sala_venta,
    public.stock_deposito,
    public.stock_sala,
    public.comprobante,
    public.renglon_comprobante,
    public.ingreso,
    public.renglon_ingreso,
    public.transferencia,
    public.renglon_transferencia,
    public.auditoria_precio
TO app_api;

-- Alta de catálogo y de clientes.
GRANT INSERT ON
    public.vino,
    public.composicion_vino,
    public.vino_maridaje,
    public.cliente,
    public.cliente_socio,
    public.cliente_distribuidor,
    public.cliente_exportador,
    public.permiso_exportacion,
    public.comprobante,
    public.renglon_comprobante,
    public.ingreso,
    public.renglon_ingreso,
    public.transferencia,
    public.renglon_transferencia,
    public.auditoria_precio
TO app_api;

-- Modificación de catálogo y de clientes.
GRANT UPDATE ON
    public.vino,
    public.composicion_vino,
    public.vino_maridaje,
    public.cliente,
    public.cliente_socio,
    public.cliente_distribuidor,
    public.cliente_exportador,
    public.permiso_exportacion
TO app_api;

-- Baja de catálogo y de clientes. Los borrados con movimientos asociados
-- los rechaza la propia base (ON DELETE RESTRICT) y la API los traduce.
GRANT DELETE ON
    public.vino,
    public.composicion_vino,
    public.vino_maridaje,
    public.cliente,
    public.cliente_socio,
    public.cliente_distribuidor,
    public.cliente_exportador,
    public.permiso_exportacion
TO app_api;

-- Identificadores autogenerados (IDENTITY).
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_api;

-- Procedimientos de la base: la API cambia estados y procesa documentos
-- llamando a estos procedimientos, nunca recalculando stock a mano.
GRANT EXECUTE ON PROCEDURE
    public.sp_terminar_ingreso(INTEGER),
    public.sp_terminar_transferencia(INTEGER),
    public.sp_procesar_ingreso(INTEGER),
    public.sp_procesar_transferencia(INTEGER)
TO app_api;

-- Funciones de apoyo.
GRANT EXECUTE ON FUNCTION
    public.fn_descuento_cliente(INTEGER),
    public.fn_calcular_descuento_cliente(INTEGER, NUMERIC),
    public.fn_stock_sala(INTEGER, INTEGER),
    public.fn_total_comprobante(INTEGER),
    public.fn_antiguedad_anios(DATE),
    public.fn_antiguedad_anios(DATE, DATE)
TO app_api;

-- Vistas de reporte.
GRANT SELECT ON
    public.vw_stock_total_vinos,
    public.vw_clientes_exportadores_info,
    public.vw_resumen_comprobantes
TO app_api;

-- =============================================================================
-- FIN DE 009_ETAPA6_API.SQL
-- =============================================================================
