
"""
Etapa 6 - Tarea 3
Operaciones transaccionales de comprobantes.

La base de datos controla stock, precios, descuentos
y totales mediante sus triggers existentes.
"""

from psycopg2.extras import RealDictCursor


def crear_comprobante(conexion, id_cliente, id_sala, renglones):
    """
    Crea una venta completa dentro de una transaccion.

    renglones:
    [
        {"cod_vino": 1, "cantidad": 2},
        {"cod_vino": 3, "cantidad": 1}
    ]

    Si alguna operacion falla, PostgreSQL revierte
    la cabecera, los renglones y los cambios de stock.
    """

    if not renglones:
        raise ValueError("El comprobante debe tener al menos un vino.")

    codigos = [r["cod_vino"] for r in renglones]

    if len(codigos) != len(set(codigos)):
        raise ValueError("No se puede repetir un vino en el comprobante.")

    for renglon in renglones:
        if renglon["cantidad"] <= 0:
            raise ValueError("La cantidad debe ser mayor que cero.")

    with conexion:
        with conexion.cursor(cursor_factory=RealDictCursor) as cursor:

            # Crear la cabecera.
            # Los importes iniciales son cero porque
            # los triggers calculan sus valores reales.
            cursor.execute(
                """
                INSERT INTO comprobante
                    (id_cliente, id_sala, subtotal, descuento, total)
                VALUES (%s, %s, 0, 0, 0)
                RETURNING numero_comprobante
                """,
                (id_cliente, id_sala),
            )

            numero = cursor.fetchone()["numero_comprobante"]

            # Agregar los vinos.
            # El trigger BEFORE INSERT reemplaza
            # precio_unitario, descuento y subtotal.
            for renglon in renglones:
                cursor.execute(
                    """
                    INSERT INTO renglon_comprobante
                        (
                            numero_comprobante,
                            cod_vino,
                            cantidad,
                            precio_unitario,
                            descuento,
                            subtotal
                        )
                    VALUES (%s, %s, %s, 0, 0, 0)
                    """,
                    (
                        numero,
                        renglon["cod_vino"],
                        renglon["cantidad"],
                    ),
                )

            # Recuperar el comprobante calculado
            # por los triggers.
            cursor.execute(
                """
                SELECT
                    numero_comprobante,
                    fecha,
                    id_cliente,
                    id_sala,
                    subtotal,
                    descuento,
                    total
                FROM comprobante
                WHERE numero_comprobante = %s
                """,
                (numero,),
            )

            comprobante = dict(cursor.fetchone())

            cursor.execute(
                """
                SELECT
                    cod_vino,
                    cantidad,
                    precio_unitario,
                    descuento,
                    subtotal
                FROM renglon_comprobante
                WHERE numero_comprobante = %s
                ORDER BY cod_vino
                """,
                (numero,),
            )

            comprobante["renglones"] = [
                dict(fila) for fila in cursor.fetchall()
            ]

    return comprobante
