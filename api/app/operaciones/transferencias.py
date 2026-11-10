
"""
Etapa 6 - Tarea 3
Operaciones transaccionales de transferencias.

Las reglas de estados y de stock se ejecutan
en PostgreSQL mediante procedimientos y triggers.
"""

from psycopg2.extras import RealDictCursor


def crear_transferencia(conexion, id_sala, renglones):
    """
    Crea una transferencia y sus renglones
    dentro de una unica transaccion.

    Ejemplo:
    [
        {"cod_vino": 1, "cantidad": 20},
        {"cod_vino": 2, "cantidad": 10}
    ]
    """

    if not renglones:
        raise ValueError("La transferencia debe contener al menos un vino.")

    codigos = [r["cod_vino"] for r in renglones]

    if len(codigos) != len(set(codigos)):
        raise ValueError("No se puede repetir un vino en la transferencia.")

    for renglon in renglones:
        if renglon["cantidad"] <= 0:
            raise ValueError("La cantidad debe ser mayor que cero.")

    with conexion:
        with conexion.cursor(cursor_factory=RealDictCursor) as cursor:

            cursor.execute(
                """
                INSERT INTO transferencia (id_sala)
                VALUES (%s)
                RETURNING numero_solicitud
                """,
                (id_sala,),
            )

            numero = cursor.fetchone()["numero_solicitud"]

            for renglon in renglones:
                cursor.execute(
                    """
                    INSERT INTO renglon_transferencia
                        (numero_solicitud, cod_vino, cantidad)
                    VALUES (%s, %s, %s)
                    """,
                    (
                        numero,
                        renglon["cod_vino"],
                        renglon["cantidad"],
                    ),
                )

            cursor.execute(
                """
                SELECT numero_solicitud, id_sala,
                       fecha_confeccion, estado
                FROM transferencia
                WHERE numero_solicitud = %s
                """,
                (numero,),
            )

            resultado = dict(cursor.fetchone())

            cursor.execute(
                """
                SELECT cod_vino, cantidad
                FROM renglon_transferencia
                WHERE numero_solicitud = %s
                ORDER BY cod_vino
                """,
                (numero,),
            )

            resultado["renglones"] = [
                dict(fila) for fila in cursor.fetchall()
            ]

    return resultado


def terminar_transferencia(conexion, numero_solicitud):
    """
    Finaliza una transferencia mediante el
    procedimiento almacenado existente.
    """

    with conexion:
        with conexion.cursor() as cursor:
            cursor.execute(
                "CALL public.sp_terminar_transferencia(%s)",
                (numero_solicitud,),
            )

    return {
        "numero_solicitud": numero_solicitud,
        "estado": "terminado",
    }


def procesar_transferencia(conexion, numero_solicitud):
    """
    Procesa una transferencia terminada.

    PostgreSQL valida el stock del deposito,
    descuenta las cantidades y suma el stock
    correspondiente a la sala.
    """

    with conexion:
        with conexion.cursor() as cursor:
            cursor.execute(
                "CALL public.sp_procesar_transferencia(%s)",
                (numero_solicitud,),
            )

    return {
        "numero_solicitud": numero_solicitud,
        "estado": "procesado",
    }


def agregar_renglon_transferencia(
    conexion, numero_solicitud, cod_vino, cantidad
):
    """
    Agrega un vino a una transferencia existente.

    PostgreSQL controla que la transferencia permita
    agregar renglones y que los datos sean válidos.
    """

    if cantidad <= 0:
        raise ValueError("La cantidad debe ser mayor que cero.")

    with conexion:
        with conexion.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                INSERT INTO public.renglon_transferencia
                    (numero_solicitud, cod_vino, cantidad)
                VALUES (%s, %s, %s)
                RETURNING numero_solicitud, cod_vino, cantidad
                """,
                (numero_solicitud, cod_vino, cantidad),
            )

            resultado = dict(cursor.fetchone())

    return resultado
