from typing import Any

from psycopg2.extras import RealDictCursor

from app.pool import get_connection, release_connection


def listar_transferencias(estado: str | None = None) -> list[dict[str, Any]]:
    """
    Listado de transferencias con su estado y la cantidad de renglones.

    La pantalla de transferencias usa el estado para habilitar las
    acciones: solo se puede cargar renglones en confección, solo se
    puede terminar una en confección y solo se puede procesar una
    terminada.
    """

    filtros = []
    params: list[Any] = []

    if estado is not None:
        filtros.append("t.estado = %s")
        params.append(estado)

    where = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                f"""
                SELECT t.numero_solicitud,
                       t.id_sala,
                       t.fecha_confeccion,
                       t.estado::text AS estado,
                       s.calle AS calle_sala,
                       s.numero AS numero_sala,
                       l.nombre AS localidad_sala,
                       COUNT(rt.cod_vino) AS cantidad_renglones,
                       COALESCE(SUM(rt.cantidad), 0) AS total_botellas
                FROM transferencia AS t
                JOIN sala_venta AS s
                    ON s.id_sala = t.id_sala
                JOIN localidad AS l
                    ON l.codigo_postal = s.codigo_postal
                LEFT JOIN renglon_transferencia AS rt
                    ON rt.numero_solicitud = t.numero_solicitud
                {where}
                GROUP BY t.numero_solicitud, t.id_sala, t.fecha_confeccion,
                         t.estado, s.calle, s.numero, l.nombre
                ORDER BY t.numero_solicitud DESC
                """,
                params,
            )
            return [dict(fila) for fila in cursor.fetchall()]
    finally:
        release_connection(connection)


def obtener_transferencia(numero_solicitud: int) -> dict[str, Any] | None:
    """
    Detalle de una transferencia con sus renglones.
    """

    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT t.numero_solicitud,
                       t.id_sala,
                       t.fecha_confeccion,
                       t.estado::text AS estado,
                       s.calle AS calle_sala,
                       s.numero AS numero_sala,
                       l.nombre AS localidad_sala
                FROM transferencia AS t
                JOIN sala_venta AS s
                    ON s.id_sala = t.id_sala
                JOIN localidad AS l
                    ON l.codigo_postal = s.codigo_postal
                WHERE t.numero_solicitud = %s
                """,
                (numero_solicitud,),
            )
            cabecera = cursor.fetchone()

            if cabecera is None:
                return None

            transferencia = dict(cabecera)

            cursor.execute(
                """
                SELECT rt.cod_vino, v.nombre, rt.cantidad
                FROM renglon_transferencia AS rt
                JOIN vino AS v
                    ON v.cod_vino = rt.cod_vino
                WHERE rt.numero_solicitud = %s
                ORDER BY rt.cod_vino
                """,
                (numero_solicitud,),
            )
            transferencia["renglones"] = [dict(fila) for fila in cursor.fetchall()]

            return transferencia
    finally:
        release_connection(connection)
