from typing import Any

from psycopg2.extras import RealDictCursor

from app.pool import get_connection, release_connection


def listar_salas() -> list[dict[str, Any]]:
    """
    Listado de salas de venta con su localidad.

    Lo necesitan las pantallas de venta, transferencias y tablero,
    para elegir en que sala se opera.
    """

    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT s.id_sala,
                       s.calle,
                       s.numero,
                       s.dia_cierre,
                       s.codigo_postal,
                       l.nombre AS localidad
                FROM sala_venta AS s
                JOIN localidad AS l
                    ON l.codigo_postal = s.codigo_postal
                ORDER BY s.id_sala
                """
            )
            return [dict(fila) for fila in cursor.fetchall()]
    finally:
        release_connection(connection)


def stock_de_sala(id_sala: int) -> list[dict[str, Any]]:
    """
    Stock disponible de cada vino en una sala determinada.

    Es solo de lectura: la base sigue siendo la que valida y descuenta.
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
                       COALESCE(ss.cantidad, 0) AS stock_sala
                FROM vino AS v
                LEFT JOIN stock_sala AS ss
                    ON ss.cod_vino = v.cod_vino
                   AND ss.id_sala = %s
                ORDER BY v.nombre
                """,
                (id_sala,),
            )
            return [dict(fila) for fila in cursor.fetchall()]
    finally:
        release_connection(connection)
