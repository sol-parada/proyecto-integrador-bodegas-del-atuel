from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from psycopg2 import Error as PsycopgError

from app.dependencies import get_db_connection
from app.pool import close_pool, initialize_pool
from app.routes.health import router as health_router
from app.routes.vinos import router as vinos_router
from app.routes.clientes import router as clientes_router
from app.routes.reportes import router as reportes_router
from etapa6_valen.api_rutas import crear_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_pool()
    yield
    close_pool()


app = FastAPI(
    title="Bodegas del Atuel API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(PsycopgError)
async def postgres_error_handler(request: Request, error: PsycopgError) -> JSONResponse:
    code = error.pgcode
    status_by_code = {
        "23502": 422,
        "23503": 409,
        "23505": 409,
        "23514": 422,
        "22P02": 400,
        "40P01": 503,
        "40001": 503,
        "P0001": 409,
        "P0002": 404,
    }
    return JSONResponse(
        status_code=status_by_code.get(code, 500),
        content={"detail": error.diag.message_primary or str(error), "sqlstate": code},
    )


@app.exception_handler(HTTPException)
async def http_error_handler(request: Request, error: HTTPException) -> JSONResponse:
    detail = error.detail

    if isinstance(detail, dict) and "mensaje" in detail:
        content = {
            "detail": detail["mensaje"],
            "sqlstate": detail.get("codigo"),
        }
    else:
        content = {"detail": detail}

    return JSONResponse(
        status_code=error.status_code,
        content=content,
        headers=error.headers,
    )


app.include_router(health_router)
app.include_router(vinos_router)
app.include_router(clientes_router)
app.include_router(reportes_router)
app.include_router(crear_router(get_db_connection))
