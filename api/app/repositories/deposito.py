from typing import Any

from psycopg2.extras import RealDictCursor

from app.pool import get_connection, release_connection


def stock_deposito() -> list[dict[str, Any]]:
    """
    Stock disponible en el deposito central, por vino.

    Es el stock de origen de las transferencias: una linea de la
    solicitud no puede pedir mas botellas de las que hay en el deposito.
    La validacion definitiva la hace el procedimiento de la base al
    procesar la transferencia (RN-11).
    """

    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT v.cod_vino,
                       v.nombre,
                       v.tipo::text AS tipo,
                       v.anada,
                       v.volumen_ml,
                       v.precio,
                       COALESCE(sd.cantidad, 0) AS stock_deposito
                FROM vino AS v
                LEFT JOIN stock_deposito AS sd
                    ON sd.cod_vino = v.cod_vino
                ORDER BY v.nombre
                """
            )
            return [dict(fila) for fila in cursor.fetchall()]
    finally:
        release_connection(connection)
