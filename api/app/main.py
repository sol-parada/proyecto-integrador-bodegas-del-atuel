from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from psycopg2 import Error as PsycopgError

from app.pool import close_pool, initialize_pool
from app.routes.health import router as health_router
from app.routes.vinos import router as vinos_router
from app.routes.clientes import router as clientes_router
from app.routes.reportes import router as reportes_router


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

app.include_router(health_router)
app.include_router(vinos_router)
app.include_router(clientes_router)
app.include_router(reportes_router)