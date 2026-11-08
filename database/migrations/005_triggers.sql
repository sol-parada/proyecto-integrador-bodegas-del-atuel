-- ============================================================================
-- BODEGAS DEL ATUEL - 005_TRIGGERS.SQL
-- Triggers de integridad y reglas de negocio - Etapa 2
-- ============================================================================


-- ============================================================================
-- RN-15: cantidades positivas en renglones de comprobantes
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_validar_cantidad_comprobante()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.cantidad <= 0 THEN
        RAISE EXCEPTION
            'RN-15: la cantidad del renglón del comprobante debe ser mayor que cero';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_cantidad_comprobante
ON renglon_comprobante;

CREATE TRIGGER trg_validar_cantidad_comprobante
BEFORE INSERT OR UPDATE ON renglon_comprobante
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_cantidad_comprobante();


-- ============================================================================
-- RN-13: auditoría de cambios de precio
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_auditar_precio_vino()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.precio IS DISTINCT FROM OLD.precio THEN
        INSERT INTO auditoria_precio (
            cod_vino,
            precio_anterior,
            precio_nuevo,
            fecha_hora,
            usuario
        )
        VALUES (
            OLD.cod_vino,
            OLD.precio,
            NEW.precio,
            CURRENT_TIMESTAMP,
            CURRENT_USER
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditar_precio_vino
ON vino;

CREATE TRIGGER trg_auditar_precio_vino
AFTER UPDATE OF precio ON vino
FOR EACH ROW
EXECUTE FUNCTION fn_trg_auditar_precio_vino();


-- ============================================================================
-- RN-11: protección de la fecha de confección de transferencias
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_proteger_fecha_transferencia()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.fecha_confeccion := CURRENT_DATE;
    ELSIF NEW.fecha_confeccion IS DISTINCT FROM OLD.fecha_confeccion THEN
        RAISE EXCEPTION
            'RN-11: la fecha de confección de una transferencia no puede modificarse';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_fecha_transferencia
ON transferencia;

CREATE TRIGGER trg_proteger_fecha_transferencia
BEFORE INSERT OR UPDATE OF fecha_confeccion ON transferencia
FOR EACH ROW
EXECUTE FUNCTION fn_trg_proteger_fecha_transferencia();


-- ============================================================================
-- RN-12: bloqueo de renglones de ingresos fuera de confección
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_bloquear_renglon_ingreso()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_codigo_ingreso INTEGER;
    v_estado estado_documento;
BEGIN
    v_codigo_ingreso := CASE
        WHEN TG_OP = 'DELETE' THEN OLD.codigo_ingreso
        ELSE NEW.codigo_ingreso
    END;

    SELECT estado
    INTO v_estado
    FROM ingreso
    WHERE codigo_ingreso = v_codigo_ingreso;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe el ingreso asociado al renglón';
    END IF;

    IF v_estado <> 'en_confeccion' THEN
        RAISE EXCEPTION
            'RN-12: no se pueden modificar renglones de un ingreso que no está en confección';
    END IF;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_renglon_ingreso
ON renglon_ingreso;

CREATE TRIGGER trg_bloquear_renglon_ingreso
BEFORE INSERT OR UPDATE OR DELETE ON renglon_ingreso
FOR EACH ROW
EXECUTE FUNCTION fn_trg_bloquear_renglon_ingreso();


-- ============================================================================
-- RN-12: bloqueo de renglones de transferencias fuera de confección
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_bloquear_renglon_transferencia()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_numero_solicitud INTEGER;
    v_estado estado_documento;
BEGIN
    v_numero_solicitud := CASE
        WHEN TG_OP = 'DELETE' THEN OLD.numero_solicitud
        ELSE NEW.numero_solicitud
    END;

    SELECT estado
    INTO v_estado
    FROM transferencia
    WHERE numero_solicitud = v_numero_solicitud;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe la transferencia asociada al renglón';
    END IF;

    IF v_estado <> 'en_confeccion' THEN
        RAISE EXCEPTION
            'RN-12: no se pueden modificar renglones de una transferencia que no está en confección';
    END IF;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_renglon_transferencia
ON renglon_transferencia;

CREATE TRIGGER trg_bloquear_renglon_transferencia
BEFORE INSERT OR UPDATE OR DELETE ON renglon_transferencia
FOR EACH ROW
EXECUTE FUNCTION fn_trg_bloquear_renglon_transferencia();


-- ============================================================================
-- RN-10 y RN-11: control de transición de estados
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_validar_transicion_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.estado IS NOT DISTINCT FROM OLD.estado THEN
        RETURN NEW;
    END IF;

    IF NOT (
        OLD.estado = 'en_confeccion' AND NEW.estado = 'terminado'
        OR
        OLD.estado = 'terminado' AND NEW.estado = 'procesado'
    ) THEN
        RAISE EXCEPTION
            'RN-10/RN-11: transición de estado no permitida: % -> %',
            OLD.estado,
            NEW.estado;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_estado_ingreso
ON ingreso;

CREATE TRIGGER trg_validar_estado_ingreso
BEFORE UPDATE OF estado ON ingreso
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_transicion_estado();

DROP TRIGGER IF EXISTS trg_validar_estado_transferencia
ON transferencia;

CREATE TRIGGER trg_validar_estado_transferencia
BEFORE UPDATE OF estado ON transferencia
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_transicion_estado();


-- ============================================================================
-- RN-05: composición de cada vino exactamente igual al 100 %
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_trg_validar_composicion_vino()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_cod_vino INTEGER;
    v_total NUMERIC;
BEGIN
    FOR v_cod_vino IN
        SELECT DISTINCT cod_vino
        FROM (
            SELECT CASE
                WHEN TG_OP <> 'INSERT' THEN OLD.cod_vino
            END AS cod_vino

            UNION ALL

            SELECT CASE
                WHEN TG_OP <> 'DELETE' THEN NEW.cod_vino
            END AS cod_vino
        ) vinos_afectados
        WHERE cod_vino IS NOT NULL
    LOOP
        SELECT COALESCE(SUM(porcentaje), 0)
        INTO v_total
        FROM composicion_vino
        WHERE cod_vino = v_cod_vino;

        IF v_total IS DISTINCT FROM 100::NUMERIC THEN
            RAISE EXCEPTION
                'RN-05: la composición del vino % debe sumar 100%% y actualmente suma %',
                v_cod_vino,
                v_total;
        END IF;
    END LOOP;

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_composicion_vino
ON composicion_vino;

CREATE CONSTRAINT TRIGGER trg_validar_composicion_vino
AFTER INSERT OR UPDATE OR DELETE ON composicion_vino
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION fn_trg_validar_composicion_vino();


-- ============================================================================
-- RN-08 y RN-09: registrar venta, validar stock y calcular importes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_trg_registrar_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_id_sala INTEGER;
    v_stock INTEGER;
    v_precio NUMERIC(10, 2);
    v_tasa NUMERIC(5, 4);
    v_bruto NUMERIC(12, 2);
    v_descuento NUMERIC(12, 2);
BEGIN
    SELECT c.id_sala
    INTO v_id_sala
    FROM public.comprobante AS c
    WHERE c.numero_comprobante = NEW.numero_comprobante
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'RN-08: el comprobante % no existe',
            NEW.numero_comprobante
            USING ERRCODE = 'P0002';
    END IF;

    SELECT v.precio
    INTO v_precio
    FROM public.vino AS v
    WHERE v.cod_vino = NEW.cod_vino;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'RN-08: el vino % no existe',
            NEW.cod_vino
            USING ERRCODE = 'P0002';
    END IF;

    SELECT ss.cantidad
    INTO v_stock
    FROM public.stock_sala AS ss
    WHERE ss.id_sala = v_id_sala
      AND ss.cod_vino = NEW.cod_vino
    FOR UPDATE;

    IF NOT FOUND OR v_stock < NEW.cantidad THEN
        RAISE EXCEPTION
            'RN-09: stock insuficiente para el vino % en la sala %',
            NEW.cod_vino,
            v_id_sala
            USING ERRCODE = '23514';
    END IF;

    v_tasa := public.fn_descuento_cliente(
        (SELECT c.id_cliente
         FROM public.comprobante AS c
         WHERE c.numero_comprobante = NEW.numero_comprobante)
    );

    v_bruto := ROUND(NEW.cantidad * v_precio, 2);
    v_descuento := ROUND(v_bruto * v_tasa, 2);

    NEW.precio_unitario := v_precio;
    NEW.descuento := v_descuento;
    NEW.subtotal := v_bruto - v_descuento;

    UPDATE public.stock_sala
    SET cantidad = cantidad - NEW.cantidad
    WHERE id_sala = v_id_sala
      AND cod_vino = NEW.cod_vino;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_venta
ON public.renglon_comprobante;

CREATE TRIGGER trg_registrar_venta
BEFORE INSERT ON public.renglon_comprobante
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_registrar_venta();


-- ============================================================================
-- RN-08: actualizar totales del comprobante
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_trg_actualizar_totales_comprobante()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_numero_comprobante INTEGER;
BEGIN
    v_numero_comprobante := COALESCE(NEW.numero_comprobante, OLD.numero_comprobante);

    UPDATE public.comprobante AS c
    SET subtotal = importes.subtotal_bruto,
        descuento = importes.descuento_total,
        total = importes.total_neto
    FROM (
        SELECT
            COALESCE(SUM(r.cantidad * r.precio_unitario), 0)::NUMERIC(12, 2)
                AS subtotal_bruto,
            COALESCE(SUM(r.descuento), 0)::NUMERIC(12, 2)
                AS descuento_total,
            COALESCE(SUM(r.subtotal), 0)::NUMERIC(12, 2)
                AS total_neto
        FROM public.renglon_comprobante AS r
        WHERE r.numero_comprobante = v_numero_comprobante
    ) AS importes
    WHERE c.numero_comprobante = v_numero_comprobante;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_actualizar_totales_comprobante
ON public.renglon_comprobante;

CREATE TRIGGER trg_actualizar_totales_comprobante
AFTER INSERT OR UPDATE OR DELETE
ON public.renglon_comprobante
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_actualizar_totales_comprobante();