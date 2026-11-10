
"""
Etapa 6 - Tarea 3
Operaciones transaccionales de ingresos.

La base de datos controla los estados y las modificaciones
del stock mediante procedimientos y triggers existentes.
"""

from psycopg2.extras import RealDictCursor


def crear_ingreso(conexion, codigo_transportista, cuit_bodega, renglones):
    """
    Registra un ingreso nuevo y todos sus renglones
    dentro de una unica transaccion.

    Ejemplo de renglones:
    [
        {"cod_vino": 1, "cantidad": 100},
        {"cod_vino": 2, "cantidad": 50}
    ]
    """

    if not renglones:
        raise ValueError("El ingreso debe contener al menos un vino.")

    codigos = [r["cod_vino"] for r in renglones]

    if len(codigos) != len(set(codigos)):
        raise ValueError("No se puede repetir un vino en el ingreso.")

    for renglon in renglones:
        if renglon["cantidad"] <= 0:
            raise ValueError("La cantidad debe ser mayor que cero.")

    with conexion:
        with conexion.cursor(cursor_factory=RealDictCursor) as cursor:

            cursor.execute(
                """
                INSERT INTO ingreso
                    (codigo_transportista, cuit_bodega)
                VALUES (%s, %s)
                RETURNING codigo_ingreso
                """,
                (codigo_transportista, cuit_bodega),
            )

            codigo_ingreso = cursor.fetchone()["codigo_ingreso"]

            for renglon in renglones:
                cursor.execute(
                    """
                    INSERT INTO renglon_ingreso
                        (codigo_ingreso, cod_vino, cantidad)
                    VALUES (%s, %s, %s)
                    """,
                    (
                        codigo_ingreso,
                        renglon["cod_vino"],
                        renglon["cantidad"],
                    ),
                )

            cursor.execute(
                """
                SELECT codigo_ingreso, fecha, estado,
                       codigo_transportista, cuit_bodega
                FROM ingreso
                WHERE codigo_ingreso = %s
                """,
                (codigo_ingreso,),
            )

            resultado = dict(cursor.fetchone())

            cursor.execute(
                """
                SELECT cod_vino, cantidad
                FROM renglon_ingreso
                WHERE codigo_ingreso = %s
                ORDER BY cod_vino
                """,
                (codigo_ingreso,),
            )

            resultado["renglones"] = [
                dict(fila) for fila in cursor.fetchall()
            ]

    return resultado


def terminar_ingreso(conexion, codigo_ingreso):
    """
    Finaliza un ingreso utilizando el procedimiento
    almacenado existente.
    """

    with conexion:
        with conexion.cursor() as cursor:
            cursor.execute(
                "CALL public.sp_terminar_ingreso(%s)",
                (codigo_ingreso,),
            )

    return {
        "codigo_ingreso": codigo_ingreso,
        "estado": "terminado",
    }


def procesar_ingreso(conexion, codigo_ingreso):
    """
    Procesa un ingreso terminado.

    PostgreSQL verifica las reglas y actualiza
    el stock del deposito central.
    """

    with conexion:
        with conexion.cursor() as cursor:
            cursor.execute(
                "CALL public.sp_procesar_ingreso(%s)",
                (codigo_ingreso,),
            )

    return {
        "codigo_ingreso": codigo_ingreso,
        "estado": "procesado",
    }


def agregar_renglon_ingreso(conexion, codigo_ingreso, cod_vino, cantidad):
    """
    Agrega un vino a un ingreso existente.

    PostgreSQL verifica las claves, la cantidad y
    si el estado del ingreso permite agregar renglones.
    """

    if cantidad <= 0:
        raise ValueError("La cantidad debe ser mayor que cero.")

    with conexion:
        with conexion.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                INSERT INTO public.renglon_ingreso
                    (codigo_ingreso, cod_vino, cantidad)
                VALUES (%s, %s, %s)
                RETURNING codigo_ingreso, cod_vino, cantidad
                """,
                (codigo_ingreso, cod_vino, cantidad),
            )

            resultado = dict(cursor.fetchone())

    return resultado
