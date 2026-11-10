from typing import Any

from psycopg2.extras import RealDictCursor

from app.pool import get_connection, release_connection
from app.db.transactions import transaction


def listar_vinos(
    *,
    tipo: str | None,
    cepa: str | None,
    bodega: str | None,
    anada: int | None,
    page: int,
    limit: int,
) -> tuple[list[dict[str, Any]], int]:
    filters: list[str] = []
    params: list[Any] = []

    if tipo is not None:
        filters.append("v.tipo = %s")
        params.append(tipo)

    if cepa is not None:
        filters.append(
            """
            EXISTS (
                SELECT 1
                FROM composicion_vino AS cv
                JOIN cepa AS c ON c.id_cepa = cv.id_cepa
                WHERE cv.cod_vino = v.cod_vino
                  AND c.nombre ILIKE %s
            )
            """
        )
        params.append(f"%{cepa}%")

    if bodega is not None:
        filters.append(
            """
            (
                v.cuit_bodega::text = %s
                OR b.razon_social ILIKE %s
            )
            """
        )
        params.extend([bodega, f"%{bodega}%"])

    if anada is not None:
        filters.append("v.anada = %s")
        params.append(anada)

    where_clause = ""
    if filters:
        where_clause = "WHERE " + " AND ".join(filters)

    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM vino AS v
                JOIN bodega AS b ON b.cuit = v.cuit_bodega
                {where_clause}
                """,
                params,
            )
            total = cursor.fetchone()["count"]

            offset = (page - 1) * limit

            cursor.execute(
                f"""
                SELECT
                    v.cod_vino,
                    v.nombre,
                    v.tipo::text AS tipo,
                    v.anada,
                    v.volumen_ml,
                    v.graduacion,
                    v.precio,
                    v.cuit_bodega::text AS cuit_bodega
                FROM vino AS v
                JOIN bodega AS b ON b.cuit = v.cuit_bodega
                {where_clause}
                ORDER BY v.cod_vino
                LIMIT %s OFFSET %s
                """,
                [*params, limit, offset],
            )
            items = [dict(row) for row in cursor.fetchall()]

        return items, total
    finally:
        release_connection(connection)


def obtener_vino(cod_vino: int) -> dict[str, Any] | None:
    connection = get_connection()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute("""
                SELECT v.cod_vino, v.nombre, v.tipo::text AS tipo, v.anada,
                       v.volumen_ml, v.graduacion, v.precio,
                       v.cuit_bodega::text AS cuit_bodega, b.razon_social AS bodega,
                       COALESCE(sd.cantidad, 0) AS stock_deposito,
                       COALESCE(SUM(ss.cantidad), 0) AS stock_salas
                FROM vino v JOIN bodega b ON b.cuit = v.cuit_bodega
                LEFT JOIN stock_deposito sd ON sd.cod_vino = v.cod_vino
                LEFT JOIN stock_sala ss ON ss.cod_vino = v.cod_vino
                WHERE v.cod_vino = %s
                GROUP BY v.cod_vino, b.razon_social, sd.cantidad
            """, (cod_vino,))
            vino = cursor.fetchone()
            if vino is None:
                return None
            result = dict(vino)
            result["stock_total"] = result["stock_deposito"] + result["stock_salas"]
            cursor.execute("""
                SELECT c.id_cepa, c.nombre, cv.porcentaje
                FROM composicion_vino cv JOIN cepa c USING (id_cepa)
                WHERE cv.cod_vino = %s ORDER BY c.id_cepa
            """, (cod_vino,))
            result["composicion"] = [dict(row) for row in cursor.fetchall()]
            cursor.execute("""
                SELECT m.id_maridaje, m.nombre, m.temp_servicio_sugerida_c
                FROM vino_maridaje vm JOIN maridaje m USING (id_maridaje)
                WHERE vm.cod_vino = %s ORDER BY m.id_maridaje
            """, (cod_vino,))
            result["maridajes"] = [dict(row) for row in cursor.fetchall()]
            return result
    finally:
        release_connection(connection)


def crear_vino(data: dict[str, Any]) -> dict[str, Any]:
    with transaction() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO vino (nombre, tipo, anada, volumen_ml, graduacion, precio, cuit_bodega)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING cod_vino
            """, [data["nombre"], data["tipo"], data["anada"], data["volumen_ml"],
                  data["graduacion"], data["precio"], data["cuit_bodega"]])
            cod_vino = cursor.fetchone()[0]
            cursor.executemany(
                "INSERT INTO composicion_vino (cod_vino, id_cepa, porcentaje) VALUES (%s, %s, %s)",
                [(cod_vino, cepa, porcentaje) for cepa, porcentaje in data["composicion"]],
            )
            cursor.executemany(
                "INSERT INTO vino_maridaje (cod_vino, id_maridaje) VALUES (%s, %s)",
                [(cod_vino, maridaje) for maridaje in data["maridajes"]],
            )
    return obtener_vino(cod_vino)


def actualizar_vino(cod_vino: int, data: dict[str, Any]) -> dict[str, Any] | None:
    with transaction() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE vino SET nombre=%s, tipo=%s, anada=%s, volumen_ml=%s,
                    graduacion=%s, precio=%s, cuit_bodega=%s
                WHERE cod_vino=%s
            """, [data["nombre"], data["tipo"], data["anada"], data["volumen_ml"],
                  data["graduacion"], data["precio"], data["cuit_bodega"], cod_vino])
            if cursor.rowcount == 0:
                return None
            cursor.execute("DELETE FROM composicion_vino WHERE cod_vino = %s", (cod_vino,))
            cursor.executemany(
                "INSERT INTO composicion_vino (cod_vino, id_cepa, porcentaje) VALUES (%s, %s, %s)",
                [(cod_vino, cepa, porcentaje) for cepa, porcentaje in data["composicion"]],
            )
            cursor.execute("DELETE FROM vino_maridaje WHERE cod_vino = %s", (cod_vino,))
            cursor.executemany(
                "INSERT INTO vino_maridaje (cod_vino, id_maridaje) VALUES (%s, %s)",
                [(cod_vino, maridaje) for maridaje in data["maridajes"]],
            )
    return obtener_vino(cod_vino)


def eliminar_vino(cod_vino: int) -> bool:
    with transaction() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM vino WHERE cod_vino = %s", (cod_vino,))
            return cursor.rowcount == 1