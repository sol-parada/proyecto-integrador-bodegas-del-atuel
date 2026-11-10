from typing import Any

from psycopg2.extras import RealDictCursor

from app.db.transactions import transaction
from app.pool import get_connection, release_connection


def listar_clientes(page: int, limit: int, tipo_cliente: str | None) -> tuple[list[dict[str, Any]], int]:
    filters = []
    params: list[Any] = []
    if tipo_cliente is not None:
        filters.append("tipo_cliente = %s")
        params.append(tipo_cliente)
    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    connection = get_connection()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM cliente {where}", params)
            total = cursor.fetchone()["total"]
            cursor.execute(
                f"""
                SELECT id_cliente, nombre_razon_social, tipo_doc, nro_doc,
                       direccion, localidad, fecha_alta, tipo_cliente::text AS tipo_cliente
                FROM cliente {where}
                ORDER BY id_cliente LIMIT %s OFFSET %s
                """,
                [*params, limit, (page - 1) * limit],
            )
            return [dict(row) for row in cursor.fetchall()], total
    finally:
        release_connection(connection)


def obtener_cliente(id_cliente: int) -> dict[str, Any] | None:
    connection = get_connection()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """SELECT id_cliente, nombre_razon_social, tipo_doc, nro_doc,
                   direccion, localidad, fecha_alta, tipo_cliente::text AS tipo_cliente
                   FROM cliente WHERE id_cliente = %s""",
                (id_cliente,),
            )
            row = cursor.fetchone()
            return dict(row) if row else None
    finally:
        release_connection(connection)


def crear_cliente(data: dict[str, Any]) -> dict[str, Any]:
    with transaction() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            columns = ["nombre_razon_social", "tipo_doc", "nro_doc", "direccion", "localidad", "tipo_cliente"]
            values = [data[key] for key in columns]
            if data.get("fecha_alta") is not None:
                columns.append("fecha_alta")
                values.append(data["fecha_alta"])
            cursor.execute(
                f"""INSERT INTO cliente ({', '.join(columns)})
                    VALUES ({', '.join(['%s'] * len(values))})
                    RETURNING id_cliente, nombre_razon_social, tipo_doc, nro_doc,
                    direccion, localidad, fecha_alta, tipo_cliente::text AS tipo_cliente""",
                values,
            )
            return dict(cursor.fetchone())


def actualizar_cliente(id_cliente: int, data: dict[str, Any]) -> dict[str, Any] | None:
    with transaction() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """UPDATE cliente SET nombre_razon_social=%s, tipo_doc=%s, nro_doc=%s,
                   direccion=%s, localidad=%s, tipo_cliente=%s WHERE id_cliente=%s
                   RETURNING id_cliente, nombre_razon_social, tipo_doc, nro_doc,
                   direccion, localidad, fecha_alta, tipo_cliente::text AS tipo_cliente""",
                [data["nombre_razon_social"], data["tipo_doc"], data["nro_doc"],
                 data["direccion"], data["localidad"], data["tipo_cliente"], id_cliente],
            )
            row = cursor.fetchone()
            return dict(row) if row else None


def eliminar_cliente(id_cliente: int) -> bool:
    with transaction() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM cliente WHERE id_cliente = %s", (id_cliente,))
            return cursor.rowcount == 1
