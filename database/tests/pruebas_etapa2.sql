-- Base de pruebas solamente. IDs negativos reservados; cualquier colisión falla.
-- Transacción con ROLLBACK: no deja los datos de prueba.
--
-- Para comprobar que una operación fue rechazada se usa un SQLSTATE propio
-- ('PT001') en el RAISE EXCEPTION de control. Así el bloque distingue:
--   - el error real de la regla (P0001, P0002, 23514, 22023...), que es el
--     que se espera y se captura con NULL;
--   - el error de control del script (PT001), que significa que la
--     operación NO fue rechazada y por lo tanto la prueba falla.
BEGIN;
INSERT INTO bodega VALUES ('99000000001','Prueba Santiago','Prueba'), ('99000000002','Otra','Prueba');
INSERT INTO localidad VALUES ('TEST-STG','Prueba','Mendoza','Responsable');
INSERT INTO sala_venta (id_sala,calle,numero,dia_cierre,codigo_postal) OVERRIDING SYSTEM VALUE
VALUES (-901,'Prueba','1','lunes','TEST-STG');
INSERT INTO transportista(codigo_transportista,razon_social,cuit,email,telefono,domicilio) OVERRIDING SYSTEM VALUE
VALUES (-901,'Prueba','99000000003','prueba@example.invalid','0','Prueba');
INSERT INTO vino(cod_vino,nombre,tipo,anada,volumen_ml,graduacion,precio,cuit_bodega) OVERRIDING SYSTEM VALUE
VALUES (-903,'Tercero','blanco',2024,750,12,100,'99000000001'),
       (-902,'Segundo','tinto',2024,750,14,200,'99000000001'),
       (-901,'Primero','tinto',2024,750,14,100,'99000000001');
INSERT INTO cliente(id_cliente,nombre_razon_social,tipo_doc,nro_doc,direccion,localidad,tipo_cliente,descuento) OVERRIDING SYSTEM VALUE
VALUES (-901,'Socio','TEST','STG1','Prueba','Prueba','socio',0.10),
       (-902,'Distribuidor','TEST','STG2','Prueba','Prueba','distribuidor',0.20),
       (-903,'Exportador','TEST','STG3','Prueba','Prueba','exportador',0.30);
INSERT INTO cliente_socio VALUES (-901);
INSERT INTO cliente_distribuidor VALUES (-902,'Prueba','STG-HABILITACION');
INSERT INTO cliente_exportador VALUES (-903,'Chile');

-- RN-06: el descuento vigente depende del tipo de cliente.
DO $$ BEGIN
    ASSERT fn_descuento_cliente(-901) = .10, 'RN-06 socio';
    ASSERT fn_descuento_cliente(-902) = .20, 'RN-06 distribuidor';
    ASSERT fn_descuento_cliente(-903) = .30, 'RN-06 exportador';
    ASSERT fn_calcular_descuento_cliente(-901,10000) = 9000;
    ASSERT fn_calcular_descuento_cliente(-902,10000) = 8000;
    ASSERT fn_calcular_descuento_cliente(-903,10000) = 7000;
    ASSERT fn_calcular_descuento_cliente(-901,0.05) = 0.04, 'redondeo monetario';
    ASSERT fn_stock_sala(-901,-901) = 0;
    ASSERT fn_antiguedad_anios(DATE '2020-10-21',DATE '2025-10-20') = 4;
    ASSERT fn_antiguedad_anios(DATE '2020-10-21',DATE '2025-10-21') = 5;

    BEGIN
        PERFORM fn_descuento_cliente(-9999);
        RAISE EXCEPTION 'No rechazó cliente ausente' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-06 no rechazó el cliente ausente';
        WHEN SQLSTATE 'P0002' THEN NULL;
    END;

    BEGIN
        PERFORM fn_calcular_descuento_cliente(-901,-1);
        RAISE EXCEPTION 'No rechazó monto negativo' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-06 no rechazó el monto negativo';
        WHEN SQLSTATE '22023' THEN NULL;
    END;
END $$;

-- RN-10: un ingreso debe pasar por terminado antes de procesarse.
INSERT INTO ingreso(codigo_ingreso,codigo_transportista,cuit_bodega) OVERRIDING SYSTEM VALUE
VALUES (-901,-901,'99000000001'),(-902,-901,'99000000001'),(-903,-901,'99000000002');
INSERT INTO renglon_ingreso VALUES (-901,-903,10),(-901,-902,10),(-903,-901,10);

DO $$ BEGIN
    -- En confección: debe rechazarse (P0001).
    BEGIN
        CALL sp_procesar_ingreso(-901);
        RAISE EXCEPTION 'Aceptó en confección' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-10 aceptó un ingreso en confección';
        WHEN SQLSTATE 'P0001' THEN NULL;
    END;

    -- Inexistente: debe rechazarse (P0002).
    BEGIN
        CALL sp_procesar_ingreso(-9999);
        RAISE EXCEPTION 'Aceptó ingreso inexistente' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-10 aceptó un ingreso inexistente';
        WHEN SQLSTATE 'P0002' THEN NULL;
    END;
END $$;

UPDATE ingreso SET estado='terminado' WHERE codigo_ingreso IN (-901,-902,-903);
CALL sp_procesar_ingreso(-901);

DO $$ BEGIN
    ASSERT (SELECT cantidad=10 FROM stock_deposito WHERE cod_vino=-903);
    ASSERT (SELECT estado='procesado' FROM ingreso WHERE codigo_ingreso=-901);

    -- Procesado dos veces: debe rechazarse.
    BEGIN
        CALL sp_procesar_ingreso(-901);
        RAISE EXCEPTION 'Procesó ingreso dos veces' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-10 procesó un ingreso ya procesado';
        WHEN SQLSTATE 'P0001' THEN NULL;
    END;

    -- Sin renglones: debe rechazarse.
    BEGIN
        CALL sp_procesar_ingreso(-902);
        RAISE EXCEPTION 'Aceptó ingreso vacío' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-10 aceptó un ingreso sin renglones';
        WHEN SQLSTATE 'P0001' THEN NULL;
    END;

    -- Bodega incompatible: debe rechazarse.
    BEGIN
        CALL sp_procesar_ingreso(-903);
        RAISE EXCEPTION 'Aceptó bodega incompatible' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-10 aceptó una bodega incompatible';
        WHEN SQLSTATE 'P0001' THEN NULL;
        WHEN SQLSTATE '23514' THEN NULL;
    END;
END $$;

-- RN-11: una transferencia se procesa contra el depósito central.
INSERT INTO transferencia(numero_solicitud,id_sala) OVERRIDING SYSTEM VALUE
VALUES (-901,-901),(-902,-901),(-903,-901),(-904,-901);
-- -902: primer renglón se podría aplicar y segundo falla por falta de fila.
-- -903: segundo renglón falla por stock insuficiente.
INSERT INTO renglon_transferencia VALUES
(-901,-903,3),(-902,-903,2),(-902,-901,1),(-903,-903,2),(-903,-902,11);

DO $$ BEGIN
    -- En confección: debe rechazarse (P0001).
    BEGIN
        CALL sp_procesar_transferencia(-901);
        RAISE EXCEPTION 'Aceptó confección' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-11 aceptó una transferencia en confección';
        WHEN SQLSTATE 'P0001' THEN NULL;
    END;

    -- Inexistente: debe rechazarse (P0002).
    BEGIN
        CALL sp_procesar_transferencia(-9999);
        RAISE EXCEPTION 'Aceptó inexistente' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-11 aceptó una transferencia inexistente';
        WHEN SQLSTATE 'P0002' THEN NULL;
    END;
END $$;

UPDATE transferencia SET estado='terminado' WHERE numero_solicitud IN (-901,-902,-903,-904);
CALL sp_procesar_transferencia(-901);

DO $$ BEGIN
    ASSERT (SELECT cantidad=7 FROM stock_deposito WHERE cod_vino=-903);
    ASSERT (SELECT estado='procesado' FROM transferencia WHERE numero_solicitud=-901);

    -- Procesada dos veces: debe rechazarse.
    BEGIN
        CALL sp_procesar_transferencia(-901);
        RAISE EXCEPTION 'Procesó dos veces' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-11 procesó una transferencia ya procesada';
        WHEN SQLSTATE 'P0001' THEN NULL;
    END;

    -- Stock ausente en el deposito: debe rechazarse.
    BEGIN
        CALL sp_procesar_transferencia(-902);
        RAISE EXCEPTION 'Aceptó stock ausente' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-11 aceptó una transferencia sin stock en depósito';
        WHEN SQLSTATE 'P0001' THEN NULL;
        WHEN SQLSTATE '23514' THEN NULL;
    END;

    -- Stock insuficiente: debe rechazarse.
    BEGIN
        CALL sp_procesar_transferencia(-903);
        RAISE EXCEPTION 'Aceptó stock insuficiente' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-11 aceptó una transferencia con stock insuficiente';
        WHEN SQLSTATE 'P0001' THEN NULL;
        WHEN SQLSTATE '23514' THEN NULL;
    END;

    -- Sin renglones: debe rechazarse.
    BEGIN
        CALL sp_procesar_transferencia(-904);
        RAISE EXCEPTION 'Aceptó transferencia vacía' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-11 aceptó una transferencia sin renglones';
        WHEN SQLSTATE 'P0001' THEN NULL;
    END;
END $$;

-- RN-08: el total se calcula en la base, no a mano.
DO $$ BEGIN
    BEGIN
        PERFORM fn_total_comprobante(-9999);
        RAISE EXCEPTION 'Aceptó comprobante ausente' USING ERRCODE = 'PT001';
    EXCEPTION
        WHEN SQLSTATE 'PT001' THEN RAISE EXCEPTION 'RN-08 aceptó un comprobante inexistente';
        WHEN SQLSTATE 'P0002' THEN NULL;
    END;
END $$;

DO $$
BEGIN
    RAISE NOTICE 'PRUEBAS DE ETAPA 2: todas las reglas se comportan como corresponde.';
END;
$$;

-- La transacción se cierra con ROLLBACK desde el script orquestador
-- (docker/pruebas/ejecutar_pruebas.sh), después de correr
-- consultas_fixture.sql, que necesita los datos preparados acá.
