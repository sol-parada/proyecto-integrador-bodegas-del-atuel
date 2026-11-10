"""
Bodegas del Atuel - Traduccion de errores de PostgreSQL a respuestas HTTP.

Modulo unico de la API: cualquier error de la base se traduce aqui usando
el codigo SQLSTATE, segun la tabla de traduccion del TPI (Etapa 6).

  Situacion en PostgreSQL                      SQLSTATE  Respuesta HTTP
  UNIQUE violado                                  23505   409 Conflict
  FOREIGN KEY violada                             23503   409 Conflict
  CHECK violado                                   23514   422 Unprocessable Entity
  NOT NULL violado                                23502   422 Unprocessable Entity
  Regla de negocio rechazada por trigger o
  procedimiento (RAISE EXCEPTION)                P0001   409 Conflict
  Recurso inexistente                             P0002   404 Not Found
  Formato invalido para el tipo                   22P02   400 Bad Request
  Serializacion o deadlock                    40001/40P01 503 Service Unavailable

La API no recalcula totales, descuentos ni stock: la base decide y la API
solo traduce el error. Por eso el mensaje que viaja al cliente es el que
escribio la regla de negocio en la base.
"""

from fastapi import HTTPException
from psycopg2 import Error as PostgreSQLError


# SQLSTATE -> (estado HTTP, mensaje generico, usar mensaje de la base)
ERRORES_SQLSTATE: dict[str, tuple[int, str, bool]] = {
    "23505": (409, "El registro ya existe.", False),
    "23503": (409, "La operacion incumple una referencia de datos.", False),
    "23514": (422, "La operacion incumple una regla de negocio.", True),
    "23502": (422, "Falta un dato obligatorio.", True),
    "P0001": (409, "La operacion no esta permitida en el estado actual.", True),
    "P0002": (404, "El recurso solicitado no existe.", True),
    "22P02": (400, "Uno de los datos tiene un formato invalido.", False),
    "40001": (503, "Conflicto de concurrencia. Intente nuevamente.", False),
    "40P01": (503, "Conflicto entre operaciones. Intente nuevamente.", False),
}


def _mensaje_de_la_base(error: PostgreSQLError) -> str | None:
    """
    Devuelve el mensaje primario de PostgreSQL, si esta disponible.

    Es el texto que escribio el trigger o el procedimiento, por ejemplo
    'RN-09: stock insuficiente para el vino 1 en la sala 1'.
    """

    diagnostico = getattr(error, "diag", None)

    if diagnostico is None:
        return None

    mensaje = getattr(diagnostico, "message_primary", None)

    if not mensaje:
        return None

    return str(mensaje).strip()


def convertir_error_postgresql(error: PostgreSQLError) -> HTTPException:
    """
    Convierte un SQLSTATE en un error HTTP seguro.

    Para los codigos que provienen de una regla de negocio se conserva el
    mensaje de la base, porque es el que explica al usuario por que se
    rechazo la operacion. Para el resto se usa un mensaje generico para no
    filtrar detalles internos del esquema.
    """

    sqlstate = getattr(error, "pgcode", None)

    estado, mensaje_generico, usar_mensaje_base = ERRORES_SQLSTATE.get(
        sqlstate, (500, "Ocurrio un error interno al procesar la operacion.", False)
    )

    mensaje = mensaje_generico

    if usar_mensaje_base:
        mensaje_base = _mensaje_de_la_base(error)
        if mensaje_base:
            mensaje = mensaje_base

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
    Convierte las validaciones de los modulos de la API
    en una respuesta HTTP 422.
    """

    return HTTPException(
        status_code=422,
        detail={
            "codigo": "VALIDACION",
            "mensaje": str(error),
        },
    )
