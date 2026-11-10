from typing import Any

from psycopg2.extras import RealDictCursor

from app.pool import get_connection, release_connection


def _query(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    connection = get_connection()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(sql, params)
            return [dict(row) for row in cursor.fetchall()]
    finally:
        release_connection(connection)


def top_vinos() -> list[dict[str, Any]]:
    return _query("""SELECT v.cod_vino, v.nombre, SUM(r.cantidad) AS botellas_vendidas
        FROM vino v JOIN renglon_comprobante r USING (cod_vino)
        GROUP BY v.cod_vino, v.nombre ORDER BY botellas_vendidas DESC, v.cod_vino LIMIT 10""")


def ventas_por_sala() -> list[dict[str, Any]]:
    """
    S8: monto total de ventas por sala durante el ultimo trimestre.
    """

    return _query(
        """
        SELECT c.id_sala,
               s.calle,
               s.numero,
               l.nombre AS localidad,
               COUNT(*) AS cantidad_comprobantes,
               SUM(c.total) AS ventas_totales
        FROM comprobante AS c
        JOIN sala_venta AS s
            ON s.id_sala = c.id_sala
        JOIN localidad AS l
            ON l.codigo_postal = s.codigo_postal
        WHERE c.fecha >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY c.id_sala, s.calle, s.numero, l.nombre
        ORDER BY ventas_totales DESC, c.id_sala
        """
    )


def vinos_sin_stock(id_sala: int) -> list[dict[str, Any]]:
    """
    S6: para una sala determinada, los vinos sin stock en la sala
    pero con stock disponible en el deposito central.
    """

    return _query(
        """
        SELECT v.cod_vino,
               v.nombre,
               COALESCE(ss.cantidad, 0) AS stock_sala,
               sd.cantidad AS stock_deposito
        FROM vino AS v
        JOIN stock_deposito AS sd
            ON sd.cod_vino = v.cod_vino
        LEFT JOIN stock_sala AS ss
            ON ss.cod_vino = v.cod_vino
           AND ss.id_sala = %s
        WHERE COALESCE(ss.cantidad, 0) = 0
          AND sd.cantidad > 0
        ORDER BY v.cod_vino
        """,
        (id_sala,),
    )


def transportista_activo() -> list[dict[str, Any]]:
    return _query("""SELECT t.codigo_transportista, t.razon_social,
        COUNT(i.codigo_ingreso) AS ingresos_trasladados FROM transportista t
        LEFT JOIN ingreso i ON i.codigo_transportista=t.codigo_transportista
        AND i.fecha >= CURRENT_DATE - INTERVAL '1 month'
        GROUP BY t.codigo_transportista, t.razon_social
        ORDER BY ingresos_trasladados DESC, t.codigo_transportista LIMIT 1""")


def trazabilidad_vino(cod_vino: int) -> list[dict[str, Any]]:
    return _query("""
        SELECT cod_vino, precio_anterior, precio_nuevo, fecha_hora, usuario
        FROM auditoria_precio
        WHERE cod_vino = %s
        ORDER BY fecha_hora DESC
    """, (cod_vino,))
