from psycopg2.extras import RealDictCursor

from app.db.transactions import transaction
from app.pool import get_connection, release_connection


COLUMNAS_CLIENTE = [
    "nombre_razon_social",
    "tipo_doc",
    "nro_doc",
    "direccion",
    "localidad",
    "tipo_cliente",
]

SELECT_CLIENTE = """
    SELECT c.id_cliente, c.nombre_razon_social, c.tipo_doc, c.nro_doc,
           c.direccion, c.localidad, c.fecha_alta,
           c.tipo_cliente::text AS tipo_cliente,
           c.descuento,
           cs.id_cliente IS NOT NULL AS es_socio,
           cd.id_cliente IS NOT NULL AS es_distribuidor,
           ce.id_cliente IS NOT NULL AS es_exportador,
           cd.zona_cobertura,
           cd.nro_habilitacion,
           ce.pais_destino_principal
    FROM cliente AS c
    LEFT JOIN cliente_socio AS cs ON cs.id_cliente = c.id_cliente
    LEFT JOIN cliente_distribuidor AS cd ON cd.id_cliente = c.id_cliente
    LEFT JOIN cliente_exportador AS ce ON ce.id_cliente = c.id_cliente
"""


def listar_clientes(page: int, limit: int, tipo_cliente: str | None) -> tuple[list[dict], int]:
    filtros = []
    params: list = []

    if tipo_cliente is not None:
        filtros.append("c.tipo_cliente = %s")
        params.append(tipo_cliente)

    where = f"WHERE {' AND '.join(filtros)}" if filtros else ""

    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                f"SELECT COUNT(*) AS total FROM cliente AS c {where}",
                params,
            )
            total = cursor.fetchone()["total"]

            cursor.execute(
                f"""
                {SELECT_CLIENTE}
                {where}
                ORDER BY c.id_cliente
                LIMIT %s OFFSET %s
                """,
                [*params, limit, (page - 1) * limit],
            )

            return [dict(fila) for fila in cursor.fetchall()], total
    finally:
        release_connection(connection)


def obtener_cliente(id_cliente: int) -> dict | None:
    connection = get_connection()

    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                f"{SELECT_CLIENTE} WHERE c.id_cliente = %s",
                (id_cliente,),
            )
            fila = cursor.fetchone()

            if fila is None:
                return None

            cliente = dict(fila)

            cursor.execute(
                """
                SELECT cod_permiso, fecha_emision, fecha_vencimiento
                FROM permiso_exportacion
                WHERE id_cliente_exportador = %s
                ORDER BY cod_permiso
                """,
                (id_cliente,),
            )
            cliente["permisos"] = [dict(p) for p in cursor.fetchall()]

            return cliente
    finally:
        release_connection(connection)


def _insertar_subtipo(cursor, tipo_cliente: str, id_cliente: int, datos: dict) -> None:
    """
    Crea la fila del subtipo que corresponde al tipo de cliente.

    La jerarquia de clientes es una tabla por subtipo: sin esta fila el
    cliente no es socio, distribuidor ni exportador, y el modelo queda
    incompleto.
    """

    if tipo_cliente == "socio":
        cursor.execute(
            "INSERT INTO cliente_socio (id_cliente) VALUES (%s)",
            (id_cliente,),
        )
        return

    if tipo_cliente == "distribuidor":
        cursor.execute(
            """
            INSERT INTO cliente_distribuidor (id_cliente, zona_cobertura, nro_habilitacion)
            VALUES (%s, %s, %s)
            """,
            (id_cliente, datos.get("zona_cobertura"), datos.get("nro_habilitacion")),
        )
        return

    if tipo_cliente == "exportador":
        cursor.execute(
            """
            INSERT INTO cliente_exportador (id_cliente, pais_destino_principal)
            VALUES (%s, %s)
            """,
            (id_cliente, datos.get("pais_destino_principal")),
        )

        for permiso in datos.get("permisos") or []:
            cursor.execute(
                """
                INSERT INTO permiso_exportacion
                    (cod_permiso, id_cliente_exportador, fecha_emision, fecha_vencimiento)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    permiso["cod_permiso"],
                    id_cliente,
                    permiso["fecha_emision"],
                    permiso["fecha_vencimiento"],
                ),
            )
        return

    raise ValueError(f"Tipo de cliente desconocido: {tipo_cliente}")


def _actualizar_subtipo(cursor, tipo_cliente: str, id_cliente: int, datos: dict) -> None:
    """
    Reemplaza la fila de subtipo y sus permisos.
    """

    cursor.execute(
        "DELETE FROM cliente_socio WHERE id_cliente = %s",
        (id_cliente,),
    )
    cursor.execute(
        "DELETE FROM cliente_distribuidor WHERE id_cliente = %s",
        (id_cliente,),
    )
    cursor.execute(
        "DELETE FROM permiso_exportacion WHERE id_cliente_exportador = %s",
        (id_cliente,),
    )

    _insertar_subtipo(cursor, tipo_cliente, id_cliente, datos)


def crear_cliente(datos: dict) -> dict:
    """
    Da de alta un cliente y la fila de su subtipo.

    El descuento no lo calcula la API: lo completa el trigger RN-06 de la
    base segun el tipo de cliente.
    """

    with transaction() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            columnas = list(COLUMNAS_CLIENTE)
            valores = [datos[columna] for columna in columnas]

            if datos.get("fecha_alta") is not None:
                columnas.append("fecha_alta")
                valores.append(datos["fecha_alta"])

            marcadores = ", ".join(["%s"] * len(valores))

            cursor.execute(
                f"""
                INSERT INTO cliente ({", ".join(columnas)})
                VALUES ({marcadores})
                RETURNING id_cliente
                """,
                valores,
            )
            id_cliente = cursor.fetchone()["id_cliente"]

            _insertar_subtipo(cursor, datos["tipo_cliente"], id_cliente, datos)

    return obtener_cliente(id_cliente)


def actualizar_cliente(id_cliente: int, datos: dict) -> dict | None:
    with transaction() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                UPDATE cliente
                SET nombre_razon_social = %s,
                    tipo_doc = %s,
                    nro_doc = %s,
                    direccion = %s,
                    localidad = %s,
                    tipo_cliente = %s
                WHERE id_cliente = %s
                """,
                [
                    datos["nombre_razon_social"],
                    datos["tipo_doc"],
                    datos["nro_doc"],
                    datos["direccion"],
                    datos["localidad"],
                    datos["tipo_cliente"],
                    id_cliente,
                ],
            )

            if cursor.rowcount == 0:
                return None

            _actualizar_subtipo(cursor, datos["tipo_cliente"], id_cliente, datos)

    return obtener_cliente(id_cliente)


def eliminar_cliente(id_cliente: int) -> bool:
    with transaction() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM cliente WHERE id_cliente = %s",
                (id_cliente,),
            )
            return cursor.rowcount == 1
