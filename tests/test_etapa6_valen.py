
"""
Etapa 6 - Tarea 4
Pruebas unitarias de operaciones, validaciones,
manejo de errores y rutas HTTP.

No requiere una base de datos funcionando.
"""

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, HTTPException

from etapa6_valen.comprobantes import crear_comprobante
from etapa6_valen.ingresos import crear_ingreso
from etapa6_valen.transferencias import crear_transferencia
from etapa6_valen.errores import (
    convertir_error_postgresql,
    convertir_error_validacion,
)
from etapa6_valen.api_rutas import crear_router


def conexion_simulada():
    """Prepara una conexion y un cursor simulados."""
    conexion = MagicMock()
    cursor = conexion.cursor.return_value.__enter__.return_value
    return conexion, cursor


# --------------------------------------------------
# PRUEBAS DE VALIDACION
# --------------------------------------------------

def test_comprobante_sin_renglones():
    conexion, _ = conexion_simulada()

    with pytest.raises(ValueError, match="al menos un vino"):
        crear_comprobante(conexion, 1, 1, [])


def test_comprobante_con_vino_repetido():
    conexion, _ = conexion_simulada()

    renglones = [
        {"cod_vino": 1, "cantidad": 2},
        {"cod_vino": 1, "cantidad": 3},
    ]

    with pytest.raises(ValueError, match="repetir"):
        crear_comprobante(conexion, 1, 1, renglones)


def test_ingreso_con_cantidad_negativa():
    conexion, _ = conexion_simulada()

    with pytest.raises(ValueError, match="mayor que cero"):
        crear_ingreso(
            conexion, 1, "20123456789",
            [{"cod_vino": 1, "cantidad": -5}],
        )


def test_transferencia_con_cantidad_cero():
    conexion, _ = conexion_simulada()

    with pytest.raises(ValueError, match="mayor que cero"):
        crear_transferencia(
            conexion, 1,
            [{"cod_vino": 1, "cantidad": 0}],
        )


# --------------------------------------------------
# PRUEBAS DE OPERACIONES EXITOSAS SIMULADAS
# --------------------------------------------------

def test_crear_comprobante():
    conexion, cursor = conexion_simulada()

    cursor.fetchone.side_effect = [
        {"numero_comprobante": 15},
        {
            "numero_comprobante": 15,
            "total": 1500,
        },
    ]
    cursor.fetchall.return_value = [
        {"cod_vino": 1, "cantidad": 2},
    ]

    resultado = crear_comprobante(
        conexion, 1, 1,
        [{"cod_vino": 1, "cantidad": 2}],
    )

    assert resultado["numero_comprobante"] == 15
    assert resultado["total"] == 1500
    assert len(resultado["renglones"]) == 1
    assert cursor.execute.call_count == 4


def test_crear_ingreso():
    conexion, cursor = conexion_simulada()

    cursor.fetchone.side_effect = [
        {"codigo_ingreso": 10},
        {
            "codigo_ingreso": 10,
            "estado": "en_confeccion",
        },
    ]
    cursor.fetchall.return_value = [
        {"cod_vino": 1, "cantidad": 50},
    ]

    resultado = crear_ingreso(
        conexion, 1, "20123456789",
        [{"cod_vino": 1, "cantidad": 50}],
    )

    assert resultado["codigo_ingreso"] == 10
    assert resultado["estado"] == "en_confeccion"
    assert len(resultado["renglones"]) == 1


def test_crear_transferencia():
    conexion, cursor = conexion_simulada()

    cursor.fetchone.side_effect = [
        {"numero_solicitud": 20},
        {
            "numero_solicitud": 20,
            "estado": "en_confeccion",
        },
    ]
    cursor.fetchall.return_value = [
        {"cod_vino": 1, "cantidad": 10},
    ]

    resultado = crear_transferencia(
        conexion, 1,
        [{"cod_vino": 1, "cantidad": 10}],
    )

    assert resultado["numero_solicitud"] == 20
    assert resultado["estado"] == "en_confeccion"


# --------------------------------------------------
# PRUEBAS DE ERRORES SQLSTATE
# --------------------------------------------------

@pytest.mark.parametrize(
    "sqlstate,esperado",
    [
        ("23505", 409),  # Registro duplicado
        ("23503", 409),  # Clave foranea
        ("23514", 422),  # Restriccion o stock
        ("23502", 422),  # Dato obligatorio
        ("P0001", 409),  # Regla de negocio
        ("P0002", 404),  # Recurso inexistente
        ("22P02", 400),  # Formato invalido
        ("40001", 503),  # Conflicto de concurrencia
        ("40P01", 503),  # Deadlock
    ],
)
def test_errores_postgresql(sqlstate, esperado):
    error = SimpleNamespace(pgcode=sqlstate)

    respuesta = convertir_error_postgresql(error)

    assert isinstance(respuesta, HTTPException)
    assert respuesta.status_code == esperado


def test_error_desconocido_no_expone_detalles():
    error = SimpleNamespace(pgcode="XX999")

    respuesta = convertir_error_postgresql(error)

    assert respuesta.status_code == 500
    assert respuesta.detail["codigo"] == "ERROR_INTERNO"


def test_error_validacion_devuelve_422():
    respuesta = convertir_error_validacion(
        ValueError("Cantidad invalida")
    )

    assert respuesta.status_code == 422
    assert respuesta.detail["codigo"] == "VALIDACION"


# --------------------------------------------------
# PRUEBAS DE DOCUMENTACION OPENAPI
# --------------------------------------------------

def test_rutas_registradas():
    app = FastAPI()
    app.include_router(crear_router(lambda: None))

    esquema = app.openapi()
    rutas = esquema["paths"]

    endpoints_esperados = {
        "/comprobantes": "post",
        "/comprobantes/{numero}": "get",
        "/ingresos": "post",
        "/ingresos/{codigo}/renglones": "post",
        "/ingresos/{codigo}/terminar": "post",
        "/ingresos/{codigo}/procesar": "post",
        "/transferencias": "post",
        "/transferencias/{numero}/renglones": "post",
        "/transferencias/{numero}/terminar": "post",
        "/transferencias/{numero}/procesar": "post",
    }

    for ruta, metodo in endpoints_esperados.items():
        assert ruta in rutas, f"Falta la ruta: {ruta}"
        assert metodo in rutas[ruta], (
            f"Falta el metodo {metodo.upper()} en {ruta}"
        )


def test_openapi_se_genera():
    app = FastAPI()
    app.include_router(crear_router(lambda: None))

    esquema = app.openapi()

    assert "/comprobantes" in esquema["paths"]
    assert "/ingresos" in esquema["paths"]
    assert "/transferencias" in esquema["paths"]
