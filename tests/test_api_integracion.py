"""
Bodegas del Atuel - Etapa 6
Pruebas de integracion de la API contra PostgreSQL real.

Estas pruebas NO usan simulaciones: se conectan a la base de datos y
verifican que las reglas de negocio viven en PostgreSQL y que la API las
traduce a los codigos HTTP correctos.

Requieren una base PostgreSQL levantada con el proyecto cargado.
Si no esta disponible, las pruebas se omiten (skip) en lugar de fallar,
para no romper la ejecucion de la suite en un equipo recien clonado.

Ejecutar:
    uv run pytest tests/test_api_integracion.py -v
"""

import os
from pathlib import Path

import psycopg2
import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient

RAIZ = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=RAIZ / ".env")

from app.main import app  # noqa: E402  (import posterior a la carga del .env)


def _conexion_disponible() -> bool:
    try:
        conexion = psycopg2.connect(
            dbname=os.getenv("POSTGRES_DB", "bodegas_atuel"),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", ""),
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            connect_timeout=5,
        )
    except Exception:
        return False

    conexion.close()
    return True


pytestmark = pytest.mark.skipif(
    not _conexion_disponible(),
    reason="Requiere PostgreSQL levantado con el proyecto cargado",
)


@pytest.fixture(scope="module")
def cliente():
    """Cliente HTTP contra la API real."""
    with TestClient(app) as instancia:
        yield instancia


@pytest.fixture(scope="module")
def bd():
    """Conexion directa al propietario, para preparar datos y verificar."""
    conexion = psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB", "bodegas_atuel"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", ""),
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=os.getenv("POSTGRES_PORT", "5432"),
    )
    conexion.autocommit = True
    yield conexion
    conexion.close()


@pytest.fixture
def datos_venta(bd):
    """
    Prepara una sala, un vino con stock y un cliente.

    Devuelve los identificadores y el stock inicial para poder verificar
    que una operacion fallida no dejo datos a medias.
    """

    with bd.cursor() as cur:
        cur.execute(
            """
            SELECT ss.id_sala, ss.cod_vino, ss.cantidad
            FROM stock_sala AS ss
            WHERE ss.cantidad > 0
            ORDER BY ss.id_sala, ss.cod_vino
            LIMIT 1
            """
        )
        fila = cur.fetchone()

        if fila is None:
            pytest.skip("La base no tiene stock de sala cargado")

        id_sala, cod_vino, stock = fila

        cur.execute(
            """
            SELECT c.id_cliente
            FROM cliente AS c
            JOIN cliente_socio AS cs ON cs.id_cliente = c.id_cliente
            ORDER BY c.id_cliente
            LIMIT 1
            """
        )
        cliente_socio = cur.fetchone()

        if cliente_socio is None:
            pytest.skip("La base no tiene clientes socio cargados")

        cur.execute("SELECT COUNT(*) FROM comprobante")
        comprobantes_iniciales = cur.fetchone()[0]

    return {
        "id_sala": id_sala,
        "cod_vino": cod_vino,
        "stock": stock,
        "id_cliente": cliente_socio[0],
        "comprobantes_iniciales": comprobantes_iniciales,
    }


# ---------------------------------------------------------------------------
# SALUD Y DOCUMENTACION
# ---------------------------------------------------------------------------

def test_salud_responde_ok(cliente):
    """El endpoint /salud verifica que la API llega a la base."""
    respuesta = cliente.get("/salud")

    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "ok"


def test_openapi_documenta_los_endpoints(cliente):
    """La documentacion OpenAPI esta disponible y es coherente."""
    esquema = cliente.get("/openapi.json").json()

    for ruta in [
        "/vinos",
        "/vinos/{cod_vino}",
        "/clientes",
        "/comprobantes",
        "/comprobantes/{numero}",
        "/transferencias",
        "/transferencias/{numero}/renglones",
        "/transferencias/{numero}/terminar",
        "/transferencias/{numero}/procesar",
        "/ingresos",
        "/ingresos/{codigo}/renglones",
        "/ingresos/{codigo}/procesar",
        "/reportes/top-vinos",
        "/reportes/ventas-por-sala",
        "/reportes/vinos-sin-stock",
        "/reportes/transportista-activo",
        "/reportes/trazabilidad/{cod_vino}",
        "/salud",
    ]:
        assert ruta in esquema["paths"], f"Falta documentar la ruta {ruta}"


# ---------------------------------------------------------------------------
# CATALOGO, PAGINACION Y FILTROS
# ---------------------------------------------------------------------------

def test_listado_de_vinos_paginado(cliente):
    """El listado devuelve items, page, limit y total."""
    respuesta = cliente.get("/vinos", params={"page": 1, "limit": 5})

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()

    assert set(cuerpo) == {"items", "page", "limit", "total"}
    assert cuerpo["limit"] == 5
    assert len(cuerpo["items"]) <= 5


def test_filtro_por_tipo_de_vino(cliente):
    """El filtro por tipo restringe el resultado."""
    respuesta = cliente.get("/vinos", params={"tipo": "tinto", "limit": 100})

    assert respuesta.status_code == 200

    for vino in respuesta.json()["items"]:
        assert vino["tipo"] == "tinto"


def test_inyeccion_sql_fallida_se_trata_como_texto(cliente):
    """
    Un valor malicioso en un filtro se trata como texto simple.

    No ejecuta la consulta: no devuelve todos los vinos ni revienta la API.
    Es la evidencia de que todas las consultas van parametrizadas.
    """
    payload = "' OR 1=1--"

    respuesta = cliente.get("/vinos", params={"cepa": payload, "limit": 10})

    assert respuesta.status_code == 200
    cuerpo = respuesta.json()

    total_general = cliente.get("/vinos", params={"limit": 1}).json()["total"]

    assert cuerpo["total"] == 0
    assert cuerpo["total"] != total_general


# ---------------------------------------------------------------------------
# REGLAS DE NEGOCIO: LA BASE RECHAZA Y LA API TRADUCE
# ---------------------------------------------------------------------------

def test_venta_sin_stock_devuelve_409_sin_dejar_datos(cliente, bd, datos_venta):
    """
    RN-09: no se puede vender más de lo que hay en stock de la sala.

    La base rechaza la venta y la API responde 409. No debe quedar
    ni el comprobante ni el renglón, y el stock no debe moverse.
    """
    cuerpo = {
        "id_cliente": datos_venta["id_cliente"],
        "id_sala": datos_venta["id_sala"],
        "renglones": [
            {
                "cod_vino": datos_venta["cod_vino"],
                "cantidad": datos_venta["stock"] + 100000,
            }
        ],
    }

    respuesta = cliente.post("/comprobantes", json=cuerpo)

    assert respuesta.status_code == 409
    assert respuesta.json()["sqlstate"] == "P0001"
    assert "RN-09" in respuesta.json()["detail"]

    with bd.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM comprobante")
        assert cur.fetchone()[0] == datos_venta["comprobantes_iniciales"]

        cur.execute("SELECT COUNT(*) FROM renglon_comprobante")
        renglones = cur.fetchone()[0]

        cur.execute(
            """
            SELECT cantidad FROM stock_sala
            WHERE id_sala = %s AND cod_vino = %s
            """,
            (datos_venta["id_sala"], datos_venta["cod_vino"]),
        )
        assert cur.fetchone()[0] == datos_venta["stock"]

    assert renglones > 0


def test_venta_exitosa_calcula_importes_en_la_base(cliente, bd, datos_venta):
    """
    RN-08: el total lo calcula la base, no la API.

    El comprobante devuelto trae subtotal, descuento y total, y coinciden
    con lo almacenado.
    """
    cantidad = 2
    cuerpo = {
        "id_cliente": datos_venta["id_cliente"],
        "id_sala": datos_venta["id_sala"],
        "renglones": [
            {"cod_vino": datos_venta["cod_vino"], "cantidad": cantidad}
        ],
    }

    respuesta = cliente.post("/comprobantes", json=cuerpo)

    assert respuesta.status_code == 201
    creado = respuesta.json()

    assert creado["total"] > 0
    assert creado["total"] == creado["subtotal"] - creado["descuento"]
    assert len(creado["renglones"]) == 1

    numero = creado["numero_comprobante"]

    try:
        with bd.cursor() as cur:
            cur.execute(
                """
                SELECT subtotal, descuento, total
                FROM comprobante WHERE numero_comprobante = %s
                """,
                (numero,),
            )
            fila = cur.fetchone()

            # La API serializa a JSON (float) y la base guarda NUMERIC (Decimal):
            # se comparan como números, no por tipo.
            assert float(fila[0]) == pytest.approx(creado["subtotal"])
            assert float(fila[1]) == pytest.approx(creado["descuento"])
            assert float(fila[2]) == pytest.approx(creado["total"])
    finally:
        # Limpieza: el comprobante de prueba y el stock devuelto.
        # El trigger RN-09 ya descontó el stock de la sala, así que hay que
        # devolverlo explícitamente para dejar la base como estaba.
        with bd.cursor() as cur:
            cur.execute(
                "DELETE FROM comprobante WHERE numero_comprobante = %s",
                (numero,),
            )
            cur.execute(
                """
                UPDATE stock_sala SET cantidad = cantidad + %s
                WHERE id_sala = %s AND cod_vino = %s
                """,
                (cantidad, datos_venta["id_sala"], datos_venta["cod_vino"]),
            )


def test_precio_negativo_devuelve_422(cliente):
    """
    RN-01/RN-15: el precio de un vino es siempre mayor que cero.

    El CHECK chk_vino_precio_positivo de la base rechaza el alta.
    """
    respuesta = cliente.post(
        "/vinos",
        json={
            "nombre": "VINO PRECIO NEGATIVO",
            "tipo": "tinto",
            "anada": 2024,
            "volumen_ml": 750,
            "graduacion": 13.0,
            "precio": -100,
            "cuit_bodega": "20126855092",
            "composicion": [],
            "maridajes": [],
        },
    )

    assert respuesta.status_code == 422
    assert respuesta.json()["sqlstate"] == "23514"


def test_composicion_que_no_suma_100_devuelve_409(cliente):
    """
    RN-05: los porcentajes de corte de un vino suman exactamente 100.

    Lo rechaza el constraint trigger diferido de la base.
    """
    respuesta = cliente.post(
        "/vinos",
        json={
            "nombre": "VINO COMPOSICION INVALIDA",
            "tipo": "tinto",
            "anada": 2024,
            "volumen_ml": 750,
            "graduacion": 13.0,
            "precio": 1000,
            "cuit_bodega": "20126855092",
            "composicion": [[1, 50]],
            "maridajes": [],
        },
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["sqlstate"] == "P0001"
    assert "RN-05" in respuesta.json()["detail"]


def test_cambio_de_estado_invalido_devuelve_409(cliente, bd):
    """
    RN-10/RN-11: las transiciones van en_confeccion -> terminado -> procesado
    y no retroceden. Terminar dos veces la misma transferencia se rechaza.
    """
    respuesta = cliente.post(
        "/transferencias",
        json={
            "id_sala": 1,
            "renglones": [{"cod_vino": 1, "cantidad": 1}],
        },
    )

    assert respuesta.status_code == 201
    numero = respuesta.json()["numero_solicitud"]

    try:
        primera = cliente.post(f"/transferencias/{numero}/terminar")
        assert primera.status_code == 200

        segunda = cliente.post(f"/transferencias/{numero}/terminar")
        assert segunda.status_code == 409
        assert segunda.json()["sqlstate"] == "P0001"
    finally:
        # Limpieza: se borra la cabecera y el ON DELETE CASCADE arrastra los
        # renglones. Borrar los renglones por separado está bloqueado por
        # RN-12 cuando la transferencia ya está terminada.
        with bd.cursor() as cur:
            cur.execute(
                "DELETE FROM transferencia WHERE numero_solicitud = %s",
                (numero,),
            )


def test_transferencia_sin_stock_devuelve_409(cliente, bd):
    """
    RN-11: no se puede procesar una transferencia si el depósito no
    tiene stock suficiente, y no queda ningún cambio a medias.
    """
    with bd.cursor() as cur:
        cur.execute(
            """
            SELECT cod_vino FROM stock_deposito
            ORDER BY cod_vino LIMIT 1
            """
        )
        fila = cur.fetchone()

        if fila is None:
            pytest.skip("La base no tiene stock de depósito cargado")

        cod_vino = fila[0]

        cur.execute(
            """
            SELECT COALESCE(SUM(cantidad), 0) FROM stock_deposito
            WHERE cod_vino = %s
            """,
            (cod_vino,),
        )
        stock_deposito = cur.fetchone()[0]

    respuesta = cliente.post(
        "/transferencias",
        json={
            "id_sala": 1,
            "renglones": [
                {"cod_vino": cod_vino, "cantidad": stock_deposito + 100000}
            ],
        },
    )

    assert respuesta.status_code == 201
    numero = respuesta.json()["numero_solicitud"]

    try:
        cliente.post(f"/transferencias/{numero}/terminar")
        procesado = cliente.post(f"/transferencias/{numero}/procesar")

        assert procesado.status_code == 409
        assert procesado.json()["sqlstate"] == "P0001"

        with bd.cursor() as cur:
            cur.execute(
                """
                SELECT estado FROM transferencia WHERE numero_solicitud = %s
                """,
                (numero,),
            )
            assert cur.fetchone()[0] == "terminado"

            cur.execute(
                """
                SELECT COALESCE(SUM(cantidad), 0) FROM stock_deposito
                WHERE cod_vino = %s
                """,
                (cod_vino,),
            )
            assert cur.fetchone()[0] == stock_deposito
    finally:
        # Limpieza: se borra la cabecera y el ON DELETE CASCADE arrastra los
        # renglones. Borrar los renglones por separado está bloqueado por
        # RN-12 cuando la transferencia ya está terminada.
        with bd.cursor() as cur:
            cur.execute(
                "DELETE FROM transferencia WHERE numero_solicitud = %s",
                (numero,),
            )

def test_referencia_inexistente_devuelve_409(cliente):
    """
    23503: una clave foránea que apunta a un dato inexistente.
    """
    respuesta = cliente.post(
        "/comprobantes",
        json={
            "id_cliente": 999999999,
            "id_sala": 999999999,
            "renglones": [{"cod_vino": 1, "cantidad": 1}],
        },
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["sqlstate"] == "23503"


# ---------------------------------------------------------------------------
# CLIENTES: JERARQUIA DE TRES SUBTIPOS
# ---------------------------------------------------------------------------

def test_alta_de_cliente_crea_el_subtipo_y_el_descuento(cliente, bd):
    """
    RN-06: el descuento depende del tipo de cliente y lo asigna la base.

    La API no manda el descuento: el trigger de la base lo completa.
    """
    respuesta = cliente.post(
        "/clientes",
        json={
            "nombre_razon_social": "DISTRIBUIDOR DE PRUEBA",
            "tipo_doc": "CUIT",
            "nro_doc": "30999999999",
            "direccion": "Calle de prueba 123",
            "localidad": "Maipu",
            "tipo_cliente": "distribuidor",
            "zona_cobertura": "Zona Norte",
            "nro_habilitacion": "HAB-PRUEBA-1",
        },
    )

    assert respuesta.status_code == 201
    creado = respuesta.json()

    assert creado["es_distribuidor"] is True
    assert creado["es_socio"] is False
    assert creado["descuento"] == 0.20
    assert creado["zona_cobertura"] == "Zona Norte"

    with bd.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM cliente_distribuidor
            WHERE id_cliente = %s
            """,
            (creado["id_cliente"],),
        )
        assert cur.fetchone()[0] == 1

        cur.execute(
            "DELETE FROM cliente WHERE id_cliente = %s",
            (creado["id_cliente"],),
        )


def test_alta_de_exportador_crea_sus_permisos(cliente, bd):
    """RN-07: un exportador puede tener varios permisos de exportación."""
    respuesta = cliente.post(
        "/clientes",
        json={
            "nombre_razon_social": "EXPORTADOR DE PRUEBA",
            "tipo_doc": "CUIT",
            "nro_doc": "30999988888",
            "direccion": "Calle de prueba 456",
            "localidad": "San Rafael",
            "tipo_cliente": "exportador",
            "pais_destino_principal": "Estados Unidos",
            "permisos": [
                {
                    "cod_permiso": "PERM-PRUEBA-1",
                    "fecha_emision": "2026-01-01",
                    "fecha_vencimiento": "2027-01-01",
                },
                {
                    "cod_permiso": "PERM-PRUEBA-2",
                    "fecha_emision": "2026-01-01",
                    "fecha_vencimiento": "2027-01-01",
                },
            ],
        },
    )

    assert respuesta.status_code == 201
    creado = respuesta.json()

    assert creado["es_exportador"] is True
    assert creado["descuento"] == 0.30
    assert len(creado["permisos"]) == 2

    with bd.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*) FROM cliente_exportador
            WHERE id_cliente = %s
            """,
            (creado["id_cliente"],),
        )
        assert cur.fetchone()[0] == 1

        cur.execute(
            "DELETE FROM cliente WHERE id_cliente = %s",
            (creado["id_cliente"],),
        )


def test_cliente_con_nro_doc_duplicado_devuelve_409(cliente, bd):
    """23505: unicidad del número de documento."""
    with bd.cursor() as cur:
        cur.execute("SELECT nro_doc FROM cliente LIMIT 1")
        nro_doc = cur.fetchone()[0]

    respuesta = cliente.post(
        "/clientes",
        json={
            "nombre_razon_social": "DUPLICADO DE PRUEBA",
            "tipo_doc": "DNI",
            "nro_doc": nro_doc,
            "direccion": "Calle duplicada 1",
            "localidad": "Maipu",
            "tipo_cliente": "socio",
        },
    )

    assert respuesta.status_code == 409
    assert respuesta.json()["sqlstate"] == "23505"


# ---------------------------------------------------------------------------
# REPORTES: LAS CONSULTAS DE LA SECCION 8 EXPUESTAS COMO ENDPOINTS
# ---------------------------------------------------------------------------

def test_reporte_top_vinos(cliente):
    respuesta = cliente.get("/reportes/top-vinos")

    assert respuesta.status_code == 200
    assert len(respuesta.json()) <= 10


def test_reporte_vinos_sin_stock_usa_sala_y_deposito(cliente):
    """
    S6: vinos sin stock en la sala pero con stock en el depósito central.
    """
    respuesta = cliente.get("/reportes/vinos-sin-stock", params={"id_sala": 1})

    assert respuesta.status_code == 200

    for vino in respuesta.json():
        assert vino["stock_sala"] == 0
        assert vino["stock_deposito"] > 0


def test_reporte_trazabilidad_consulta_auditoria(cliente):
    """El endpoint de trazabilidad lee la tabla de auditoría de precios."""
    respuesta = cliente.get("/reportes/trazabilidad/1")

    assert respuesta.status_code == 200
    assert isinstance(respuesta.json(), list)
