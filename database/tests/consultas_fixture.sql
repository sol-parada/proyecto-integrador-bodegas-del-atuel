-- Datos de apoyo para probar las consignas de consultas SQL.
--
-- Depende de algunos datos que prepara pruebas_etapa2.sql (sala, bodega,
-- vinos, clientes y empleados), por eso se ejecuta dentro de esa
-- transaccion y antes del ROLLBACK final:
--
--   psql -v ON_ERROR_STOP=1 -U postgres -d <base> \
--       -f pruebas_etapa2.sql -f consultas_fixture.sql
--
-- Solo en base descartable: usa IDs negativos reservados. Los IDs propios
-- de este archivo arrancan en -940 para no chocar con los de
-- pruebas_etapa2.sql (-901 a -951).
--
-- Todos los INSERT usan ON CONFLICT DO NOTHING para que el script pueda
-- ejecutarse mas de una vez sobre la misma base sin fallar.
-- La bodega 99000000001 la crea pruebas_etapa2.sql. Este archivo agrega
-- una segunda, con CUIT y razón social propios, para no chocar con el
-- UNIQUE de razón social.
INSERT INTO bodega(cuit,razon_social,domicilio) OVERRIDING SYSTEM VALUE
VALUES ('99000000021','Bodega secundaria de consultas','Domicilio de prueba')
ON CONFLICT (cuit) DO NOTHING;

INSERT INTO cepa(id_cepa,nombre,tipo) OVERRIDING SYSTEM VALUE
VALUES (-940,'Cepa de consultas tinta','tinta'),
       (-941,'Cepa de consultas blanca','blanca')
ON CONFLICT (id_cepa) DO NOTHING;

INSERT INTO finca(id_finca,nombre,superficie_ha,departamento,provincia) OVERRIDING SYSTEM VALUE
VALUES (-940,'Finca de consultas',6,'San Rafael','Mendoza')
ON CONFLICT (id_finca) DO NOTHING;

INSERT INTO parcela(id_finca,nro_parcela,superficie_ha,anio_plantacion,id_cepa) OVERRIDING SYSTEM VALUE
VALUES (-940,1,2,2000,-940),(-940,2,4,2000,-941)
ON CONFLICT (id_finca,nro_parcela) DO NOTHING;

INSERT INTO lote_uva(id_finca,nro_parcela,campana,fecha_cosecha,kg_cosechados,cuit_bodega_destino)
VALUES (-940,1,2024,'2024-03-01',200,'99000000021'),
       (-940,2,2024,'2024-03-01',800,'99000000021'),
       (-940,1,2025,'2025-03-01',2000,'99000000021')
ON CONFLICT DO NOTHING;

-- Stock en la sala de pruebas: los comprobantes de este archivo lo
-- necesitan para que el trigger RN-09 acepte los renglones.
INSERT INTO stock_sala(id_sala,cod_vino,cantidad) OVERRIDING SYSTEM VALUE
VALUES (-901,-903,50),(-901,-902,50),(-901,-901,50)
ON CONFLICT (id_sala,cod_vino) DO NOTHING;

INSERT INTO comprobante(numero_comprobante,fecha,id_cliente,id_sala,subtotal,descuento,total)
OVERRIDING SYSTEM VALUE VALUES
(-940,'2024-01-10',-903,-901,800,280,520),
(-941,'2024-02-10',-901,-901,400,40,360)
ON CONFLICT (numero_comprobante) DO NOTHING;

INSERT INTO renglon_comprobante(numero_comprobante,cod_vino,cantidad,precio_unitario,descuento,subtotal)
VALUES
(-940,-903,2,100,70,130),(-940,-902,2,200,140,260),(-940,-901,2,100,70,130),
(-941,-902,2,200,40,360)
ON CONFLICT (numero_comprobante,cod_vino) DO NOTHING;

INSERT INTO permiso_exportacion(cod_permiso,id_cliente_exportador,fecha_emision,fecha_vencimiento)
VALUES
('STG-P1',-903,'2024-01-01','2025-01-01'),('STG-P2',-903,'2024-01-01','2025-01-01'),
('STG-P3',-903,'2024-01-01','2025-01-01'),('STG-P4',-903,'2024-01-01','2025-01-01')
ON CONFLICT (cod_permiso) DO NOTHING;

INSERT INTO empleado(cuit,nombre,fecha_ingreso,salario,id_sala)
VALUES
('99000000011','Exactamente cinco',(CURRENT_DATE-INTERVAL '5 years')::date,1000,-901),
('99000000012','Cinco y un día',(CURRENT_DATE-INTERVAL '5 years')::date-1,1000,-901)
ON CONFLICT (cuit) DO NOTHING;
