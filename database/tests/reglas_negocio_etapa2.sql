-- Pruebas explícitas de RN-01 a RN-15.
-- Se ejecuta sobre una base con todas las migraciones aplicadas.
-- La transacción termina con ROLLBACK y no conserva datos.

BEGIN;

-- Datos aislados para las pruebas.
INSERT INTO localidad (
    codigo_postal, nombre, provincia, encargado_regional
) VALUES (
    'TEST-RN', 'Localidad de prueba', 'Mendoza', 'Encargado de prueba'
);

INSERT INTO sala_venta (
    id_sala, calle, numero, dia_cierre, codigo_postal
) OVERRIDING SYSTEM VALUE
VALUES (
    -950, 'Calle de prueba', '950', 'lunes', 'TEST-RN'
);

INSERT INTO empleado (
    cuit, nombre, fecha_ingreso, salario, id_sala
) VALUES (
    '99000000950', 'Empleado de prueba', CURRENT_DATE, 1000, -950
);

INSERT INTO bodega (
    cuit, razon_social, domicilio
) VALUES (
    '99000000951', 'Bodega de prueba RN', 'Domicilio de prueba'
);

INSERT INTO cepa (
    id_cepa, nombre, tipo
) OVERRIDING SYSTEM VALUE
VALUES
    (-950, 'Cepa RN tinta', 'tinta'),
    (-951, 'Cepa RN blanca', 'blanca');

INSERT INTO finca (
    id_finca, nombre, superficie_ha, departamento, provincia
) OVERRIDING SYSTEM VALUE
VALUES (
    -950, 'Finca de prueba RN', 10, 'San Rafael', 'Mendoza'
);

INSERT INTO parcela (
    id_finca, nro_parcela, superficie_ha, anio_plantacion, id_cepa
) VALUES (
    -950, 1, 5, 2020, -950
);

INSERT INTO vino (
    cod_vino, nombre, tipo, anada, volumen_ml, graduacion, precio, cuit_bodega
) OVERRIDING SYSTEM VALUE
VALUES
    (-950, 'Vino RN prueba', 'tinto', 2024, 750, 14, 1000, '99000000951'),
    (-951, 'Vino RN transferencia', 'blanco', 2024, 750, 12, 800, '99000000951');

INSERT INTO transportista (
    codigo_transportista, razon_social, cuit, email, telefono, domicilio
) OVERRIDING SYSTEM VALUE
VALUES (
    -950, 'Transportista RN', '99000000952',
    'transportista-rn@example.invalid', '000', 'Domicilio RN'
);

INSERT INTO cliente (
    id_cliente, nombre_razon_social, tipo_doc, nro_doc, direccion,
    localidad, tipo_cliente, descuento
) OVERRIDING SYSTEM VALUE
VALUES
    (-950, 'Socio RN', 'TEST', 'RN-SOCIO',
     'Domicilio RN', 'Localidad de prueba', 'socio', 0.10),
    (-951, 'Exportador RN', 'TEST', 'RN-EXPORTADOR',
     'Domicilio RN', 'Localidad de prueba', 'exportador', 0.30);

INSERT INTO cliente_socio (id_cliente)
VALUES (-950);

INSERT INTO cliente_exportador (
    id_cliente, pais_destino_principal
) VALUES (
    -951, 'Chile'
);

INSERT INTO stock_sala (
    id_sala, cod_vino, cantidad
) VALUES (
    -950, -950, 2
);

INSERT INTO stock_deposito (
    cod_vino, cantidad
) VALUES (
    -951, 10
);

-- Composición válida para que el constraint trigger diferido
-- permita confirmar la transacción.
INSERT INTO composicion_vino (
    cod_vino, id_cepa, porcentaje
) VALUES
    (-950, -950, 60),
    (-950, -951, 40);


-- RN-01: el precio debe ser mayor que cero.
DO $$
BEGIN
    BEGIN
        INSERT INTO vino (
            cod_vino, nombre, tipo, anada, volumen_ml,
            graduacion, precio, cuit_bodega
        ) OVERRIDING SYSTEM VALUE
        VALUES (
            -952, 'Vino precio inválido', 'tinto', 2024, 750,
            12, 0, '99000000951'
        );

        RAISE EXCEPTION 'RN-01 no rechazó un precio cero';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'RN-01 OK: precio cero rechazado';
    END;
END;
$$;

-- RN-02: una sala debe referenciar una localidad existente.
DO $$
BEGIN
    BEGIN
        INSERT INTO sala_venta (
            id_sala, calle, numero, dia_cierre, codigo_postal
        ) OVERRIDING SYSTEM VALUE
        VALUES (
            -951, 'Calle inválida', '951', 'martes', 'NO-EXISTE'
        );

        RAISE EXCEPTION 'RN-02 no rechazó una localidad inexistente';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'RN-02 OK: localidad inexistente rechazada';
    END;
END;
$$;

-- RN-03: un empleado debe referenciar una sala existente.
DO $$
BEGIN
    BEGIN
        INSERT INTO empleado (
            cuit, nombre, fecha_ingreso, salario, id_sala
        ) VALUES (
            '99000000953', 'Empleado inválido', CURRENT_DATE, 1000, -951
        );

        RAISE EXCEPTION 'RN-03 no rechazó una sala inexistente';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'RN-03 OK: sala inexistente rechazada';
    END;
END;
$$;

-- RN-04: una parcela no puede cosecharse dos veces en la misma campaña.
INSERT INTO lote_uva (
    id_finca, nro_parcela, campana, fecha_cosecha,
    kg_cosechados, cuit_bodega_destino
) VALUES (
    -950, 1, 2024, DATE '2024-03-01',
    100, '99000000951'
);

DO $$
BEGIN
    BEGIN
        INSERT INTO lote_uva (
            id_finca, nro_parcela, campana, fecha_cosecha,
            kg_cosechados, cuit_bodega_destino
        ) VALUES (
            -950, 1, 2024, DATE '2024-03-02',
            120, '99000000951'
        );

        RAISE EXCEPTION 'RN-04 no rechazó una cosecha duplicada';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'RN-04 OK: cosecha duplicada rechazada';
    END;
END;
$$;

-- RN-05: la composición debe sumar exactamente 100 %.
DO $$
BEGIN
    BEGIN
        INSERT INTO composicion_vino (
            cod_vino, id_cepa, porcentaje
        ) VALUES (
            -951, -950, 50
        );

        SET CONSTRAINTS trg_validar_composicion_vino IMMEDIATE;

        RAISE EXCEPTION 'RN-05 no rechazó una composición incompleta';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM LIKE 'RN-05 no rechazó%' THEN
                RAISE;
            ELSE
                RAISE NOTICE 'RN-05 OK: composición incompleta rechazada';
            END IF;
    END;
END;
$$;

-- RN-06: el descuento depende del tipo de cliente.
DO $$
BEGIN
    ASSERT fn_descuento_cliente(-950) = 0.10,
        'RN-06 falló para socio';

    ASSERT fn_descuento_cliente(-951) = 0.30,
        'RN-06 falló para exportador';

    RAISE NOTICE 'RN-06 OK: descuentos según tipo de cliente';
END;
$$;

-- RN-07: un exportador puede tener varios permisos,
-- pero la fecha de vencimiento debe ser posterior a la emisión.
INSERT INTO permiso_exportacion (
    cod_permiso, id_cliente_exportador,
    fecha_emision, fecha_vencimiento
) VALUES (
    'RN-PERMISO-01', -951,
    DATE '2026-01-01', DATE '2027-01-01'
);

DO $$
BEGIN
    BEGIN
        INSERT INTO permiso_exportacion (
            cod_permiso, id_cliente_exportador,
            fecha_emision, fecha_vencimiento
        ) VALUES (
            'RN-PERMISO-02', -951,
            DATE '2026-01-01', DATE '2025-01-01'
        );

        RAISE EXCEPTION 'RN-07 no rechazó una fecha de vencimiento inválida';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'RN-07 OK: fecha de vencimiento inválida rechazada';
    END;
END;
$$;

-- RN-08: el total del comprobante se calcula automáticamente.
INSERT INTO comprobante (
    numero_comprobante, id_cliente, id_sala
) OVERRIDING SYSTEM VALUE
VALUES (
    -950, -950, -950
);

INSERT INTO renglon_comprobante (
    numero_comprobante, cod_vino, cantidad,
    precio_unitario, descuento, subtotal
) VALUES (
    -950, -950, 1, 999999, 999999, 999999
);

DO $$
BEGIN
    ASSERT (
        SELECT subtotal = 1000
           AND descuento = 100
           AND total = 900
        FROM comprobante
        WHERE numero_comprobante = -950
    ), 'RN-08: totales incorrectos';

    ASSERT fn_total_comprobante(-950) = 900,
        'RN-08: función de total incorrecta';

    RAISE NOTICE 'RN-08 OK: total y descuento calculados automáticamente';
END;
$$;

-- RN-09: no se puede vender más stock del disponible.
DO $$
BEGIN
    BEGIN
        INSERT INTO comprobante (
            numero_comprobante, id_cliente, id_sala
        ) OVERRIDING SYSTEM VALUE
        VALUES (-951, -950, -950);

        INSERT INTO renglon_comprobante (
            numero_comprobante, cod_vino, cantidad,
            precio_unitario, descuento, subtotal
        ) VALUES (
            -951, -950, 2, 0, 0, 0
        );

        RAISE EXCEPTION 'RN-09 no rechazó una venta sin stock suficiente';
    EXCEPTION
        -- P0001: la regla de negocio (stock insuficiente) fue rechazada
        -- por el trigger trg_registrar_venta.
        WHEN raise_exception THEN
            RAISE NOTICE 'RN-09 OK: venta sin stock rechazada';
    END;
END;
$$;

-- RN-10: un ingreso debe pasar por terminado y luego procesado.
INSERT INTO ingreso (
    codigo_ingreso, codigo_transportista, cuit_bodega
) OVERRIDING SYSTEM VALUE
VALUES (
    -950, -950, '99000000951'
);

INSERT INTO renglon_ingreso (
    codigo_ingreso, cod_vino, cantidad
) VALUES (
    -950, -951, 3
);

CALL sp_terminar_ingreso(-950);
CALL sp_procesar_ingreso(-950);

DO $$
BEGIN
    ASSERT (
        SELECT estado = 'procesado'
        FROM ingreso
        WHERE codigo_ingreso = -950
    ), 'RN-10: el ingreso no terminó procesado';

    ASSERT (
        SELECT cantidad = 13
        FROM stock_deposito
        WHERE cod_vino = -951
    ), 'RN-10: stock de depósito incorrecto';

    RAISE NOTICE 'RN-10 OK: ingreso procesado y stock actualizado';
END;
$$;

-- RN-10: no se permiten retrocesos de estado.
DO $$
BEGIN
    BEGIN
        UPDATE ingreso
        SET estado = 'en_confeccion'
        WHERE codigo_ingreso = -950;

        RAISE EXCEPTION 'RN-10 no rechazó un retroceso de estado';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM LIKE 'RN-10 no rechazó%' THEN
                RAISE;
            ELSE
                RAISE NOTICE 'RN-10 OK: retroceso de estado rechazado';
            END IF;
    END;
END;
$$;

-- RN-11: la transferencia se procesa y actualiza ambos stocks.
INSERT INTO transferencia (
    numero_solicitud, id_sala
) OVERRIDING SYSTEM VALUE
VALUES (
    -950, -950
);

INSERT INTO renglon_transferencia (
    numero_solicitud, cod_vino, cantidad
) VALUES (
    -950, -951, 2
);

CALL sp_terminar_transferencia(-950);
CALL sp_procesar_transferencia(-950);

DO $$
BEGIN
    ASSERT (
        SELECT estado = 'procesado'
        FROM transferencia
        WHERE numero_solicitud = -950
    ), 'RN-11: la transferencia no terminó procesada';

    ASSERT (
        SELECT cantidad = 11
        FROM stock_deposito
        WHERE cod_vino = -951
    ), 'RN-11: stock de depósito incorrecto';

    ASSERT fn_stock_sala(-950, -951) = 2,
        'RN-11: stock de sala incorrecto';

    RAISE NOTICE 'RN-11 OK: transferencia procesada y stocks actualizados';
END;
$$;

-- RN-11: la fecha de confección se establece automáticamente
-- y no puede modificarse.
DO $$
BEGIN
    BEGIN
        UPDATE transferencia
        SET fecha_confeccion = fecha_confeccion + 1
        WHERE numero_solicitud = -950;

        RAISE EXCEPTION 'RN-11 no protegió la fecha de confección';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM LIKE 'RN-11 no protegió%' THEN
                RAISE;
            ELSE
                RAISE NOTICE 'RN-11 OK: fecha de confección protegida';
            END IF;
    END;
END;
$$;

-- RN-12: los renglones de un ingreso procesado no pueden modificarse.
INSERT INTO ingreso (
    codigo_ingreso, codigo_transportista, cuit_bodega
) OVERRIDING SYSTEM VALUE
VALUES (
    -951, -950, '99000000951'
);

INSERT INTO renglon_ingreso (
    codigo_ingreso, cod_vino, cantidad
) VALUES (
    -951, -950, 1
);

CALL sp_terminar_ingreso(-951);

DO $$
BEGIN
    BEGIN
        UPDATE renglon_ingreso
        SET cantidad = 2
        WHERE codigo_ingreso = -951
          AND cod_vino = -950;

        RAISE EXCEPTION 'RN-12 no bloqueó la modificación del renglón';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM LIKE 'RN-12 no bloqueó%' THEN
                RAISE;
            ELSE
                RAISE NOTICE 'RN-12 OK: modificación de renglón bloqueada';
            END IF;
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        DELETE FROM renglon_ingreso
        WHERE codigo_ingreso = -951
          AND cod_vino = -950;

        RAISE EXCEPTION 'RN-12 no bloqueó la eliminación del renglón';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM LIKE 'RN-12 no bloqueó%' THEN
                RAISE;
            ELSE
                RAISE NOTICE 'RN-12 OK: eliminación de renglón bloqueada';
            END IF;
    END;
END;
$$;

-- RN-12: los renglones de una transferencia terminada tampoco
-- pueden modificarse.
INSERT INTO transferencia (
    numero_solicitud, id_sala
) OVERRIDING SYSTEM VALUE
VALUES (
    -951, -950
);

INSERT INTO renglon_transferencia (
    numero_solicitud, cod_vino, cantidad
) VALUES (
    -951, -950, 1
);

CALL sp_terminar_transferencia(-951);

DO $$
BEGIN
    BEGIN
        UPDATE renglon_transferencia
        SET cantidad = 2
        WHERE numero_solicitud = -951
          AND cod_vino = -950;

        RAISE EXCEPTION 'RN-12 no bloqueó la modificación de transferencia';
    EXCEPTION
        WHEN raise_exception THEN
            IF SQLERRM LIKE 'RN-12 no bloqueó%' THEN
                RAISE;
            ELSE
                RAISE NOTICE 'RN-12 OK: modificación de transferencia bloqueada';
            END IF;
    END;
END;
$$;

-- RN-13: todo cambio de precio debe quedar auditado.
UPDATE vino
SET precio = 1100
WHERE cod_vino = -950;

DO $$
BEGIN
    ASSERT (
        SELECT precio_anterior = 1000
           AND precio_nuevo = 1100
           AND cod_vino = -950
           AND usuario = CURRENT_USER
        FROM auditoria_precio
        WHERE cod_vino = -950
        ORDER BY id_auditoria DESC
        LIMIT 1
    ), 'RN-13: auditoría de precio incorrecta';

    RAISE NOTICE 'RN-13 OK: cambio de precio auditado';
END;
$$;

-- RN-14: no se pueden eliminar entidades con movimientos asociados.
DO $$
BEGIN
    BEGIN
        DELETE FROM transportista
        WHERE codigo_transportista = -950;

        RAISE EXCEPTION 'RN-14 no protegió el transportista';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'RN-14 OK: transportista protegido';
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        DELETE FROM bodega
        WHERE cuit = '99000000951';

        RAISE EXCEPTION 'RN-14 no protegió la bodega';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'RN-14 OK: bodega protegida';
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        DELETE FROM vino
        WHERE cod_vino = -950;

        RAISE EXCEPTION 'RN-14 no protegió el vino';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'RN-14 OK: vino protegido';
    END;
END;
$$;

-- RN-15: cantidades, superficies y kilos deben ser positivos.
DO $$
BEGIN
    BEGIN
        INSERT INTO stock_sala (id_sala, cod_vino, cantidad)
        VALUES (-950, -951, -1);

        RAISE EXCEPTION 'RN-15 no rechazó stock negativo';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'RN-15 OK: stock negativo rechazado';
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO finca (
            id_finca, nombre, superficie_ha,
            departamento, provincia
        ) OVERRIDING SYSTEM VALUE
        VALUES (
            -951, 'Finca inválida', 0,
            'San Rafael', 'Mendoza'
        );

        RAISE EXCEPTION 'RN-15 no rechazó superficie inválida';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'RN-15 OK: superficie inválida rechazada';
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO vino (
            cod_vino, nombre, tipo, anada, volumen_ml,
            graduacion, precio, cuit_bodega
        ) OVERRIDING SYSTEM VALUE
        VALUES (
            -953, 'Vino graduación inválida', 'tinto', 2024,
            750, 21, 100, '99000000951'
        );

        RAISE EXCEPTION 'RN-15 no rechazó graduación inválida';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'RN-15 OK: graduación inválida rechazada';
    END;
END;
$$;

-- La prueba no debe dejar datos.
ROLLBACK;