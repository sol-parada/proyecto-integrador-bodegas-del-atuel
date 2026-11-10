
"""
Etapa 6 - Tarea 4
Traduccion de errores de PostgreSQL a respuestas HTTP.

No expone consultas SQL, credenciales ni detalles
internos de la base de datos al cliente.
"""

from fastapi import HTTPException
from psycopg2 import Error as PostgreSQLError


ERRORES_SQLSTATE = {
    "23505": (409, "El registro ya existe."),
    "23503": (409, "La operacion incumple una referencia de datos."),
    "23514": (422, "La operacion incumple una regla de negocio."),
    "23502": (422, "Falta un dato obligatorio."),
    "P0001": (409, "La operacion no esta permitida en el estado actual."),
    "P0002": (404, "El recurso solicitado no existe."),
    "22P02": (400, "Uno de los datos tiene un formato invalido."),
    "40001": (503, "Conflicto de concurrencia. Intente nuevamente."),
    "40P01": (503, "Conflicto entre operaciones. Intente nuevamente."),
}


def convertir_error_postgresql(error: PostgreSQLError) -> HTTPException:
    """
    Convierte un SQLSTATE en un error HTTP seguro.
    """

    sqlstate = getattr(error, "pgcode", None)

    estado, mensaje = ERRORES_SQLSTATE.get(
        sqlstate,
        (500, "Ocurrio un error interno al procesar la operacion."),
    )

    cabeceras = None

    if estado == 503:
        cabeceras = {"Retry-After": "1"}

    return HTTPException(
        status_code=estado,
        detail={
            "codigo": sqlstate if sqlstate in ERRORES_SQLSTATE else "ERROR_INTERNO",
            "mensaje": mensaje,
        },
        headers=cabeceras,
    )


def convertir_error_validacion(error: ValueError) -> HTTPException:
    """
    Convierte las validaciones de nuestros modulos
    en una respuesta HTTP 422.
    """

    return HTTPException(
        status_code=422,
        detail={
            "codigo": "VALIDACION",
            "mensaje": str(error),
        },
    )
