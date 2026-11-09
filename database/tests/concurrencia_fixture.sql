-- Fixture para demostrar dos ventas simultáneas de la última botella.
-- Ejecutar sobre una base con todas las migraciones aplicadas.

INSERT INTO localidad (
    codigo_postal, nombre, provincia, encargado_regional
) VALUES (
    'TEST-CONC', 'Localidad concurrencia', 'Mendoza', 'Encargado concurrencia'
);

INSERT INTO sala_venta (
    id_sala, calle, numero, dia_cierre, codigo_postal
) OVERRIDING SYSTEM VALUE
VALUES (
    -970, 'Calle concurrencia', '970', 'lunes', 'TEST-CONC'
);

INSERT INTO bodega (
    cuit, razon_social, domicilio
) VALUES (
    '99000000970', 'Bodega concurrencia', 'Domicilio concurrencia'
);

INSERT INTO vino (
    cod_vino, nombre, tipo, anada, volumen_ml,
    graduacion, precio, cuit_bodega
) OVERRIDING SYSTEM VALUE
VALUES (
    -970, 'Vino última botella', 'tinto', 2024, 750,
    14, 1000, '99000000970'
);

INSERT INTO cliente (
    id_cliente, nombre_razon_social, tipo_doc, nro_doc,
    direccion, localidad, tipo_cliente, descuento
) OVERRIDING SYSTEM VALUE
VALUES (
    -970, 'Cliente concurrencia', 'TEST', 'CONC-970',
    'Domicilio concurrencia', 'Localidad concurrencia',
    'socio', 0.10
);

INSERT INTO cliente_socio (id_cliente)
VALUES (-970);

INSERT INTO stock_sala (
    id_sala, cod_vino, cantidad
) VALUES (
    -970, -970, 1
);

SELECT id_sala, cod_vino, cantidad
FROM stock_sala
WHERE id_sala = -970
  AND cod_vino = -970;