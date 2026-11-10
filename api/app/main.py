from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from psycopg2 import Error as PsycopgError

from app.dependencies import get_db_connection
from app.errores import convertir_error_postgresql
from app.pool import close_pool, initialize_pool
from app.routes.health import router as health_router
from app.routes.vinos import router as vinos_router
from app.routes.clientes import router as clientes_router
from app.routes.reportes import router as reportes_router
from app.routes.salas import router as salas_router
from app.routes.deposito import router as deposito_router
from app.routes.transferencias import router as transferencias_router
from app.operaciones.api_rutas import crear_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_pool()
    yield
    close_pool()


app = FastAPI(
    title="Bodegas del Atuel API",
    version="1.0.0",
    description=(
        "API REST del sistema de gestion y distribucion vitivinicola "
        "Bodegas del Atuel. Las reglas de negocio viven en PostgreSQL: "
        "la API no recalcula totales, descuentos ni stock."
    ),
    lifespan=lifespan,
)


@app.exception_handler(PsycopgError)
async def postgres_error_handler(request: Request, error: PsycopgError) -> JSONResponse:
    """
    Cualquier error de PostgreSQL que no se haya convertido antes
    pasa por la misma tabla de traduccion SQLSTATE.
    """

    http_error = convertir_error_postgresql(error)
    detalle = http_error.detail

    return JSONResponse(
        status_code=http_error.status_code,
        content={
            "detail": detalle["mensaje"],
            "sqlstate": detalle["codigo"],
        },
        headers=http_error.headers,
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, error: HTTPException) -> JSONResponse:
    """
    Normaliza la forma de la respuesta de error.

    La API responde siempre con {"detail": ..., "sqlstate": ...}, que es
    el contrato que consume el front.
    """

    detalle = error.detail

    if isinstance(detalle, dict) and "mensaje" in detalle:
        contenido = {
            "detail": detalle["mensaje"],
            "sqlstate": detalle.get("codigo"),
        }
    else:
        contenido = {"detail": detalle, "sqlstate": None}

    return JSONResponse(
        status_code=error.status_code,
        content=contenido,
        headers=error.headers,
    )


app.include_router(health_router)
app.include_router(vinos_router)
app.include_router(clientes_router)
app.include_router(salas_router)
app.include_router(deposito_router)
app.include_router(reportes_router)
app.include_router(transferencias_router)
app.include_router(crear_router(get_db_connection))
