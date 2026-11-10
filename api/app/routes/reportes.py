from fastapi import APIRouter

from app.repositories.reportes import (
    top_vinos, trazabilidad_vino, transportista_activo, ventas_por_sala, vinos_sin_stock,
)

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.get("/top-vinos")
def get_top_vinos() -> list[dict]:
    return top_vinos()


@router.get("/ventas-por-sala")
def get_ventas_por_sala() -> list[dict]:
    return ventas_por_sala()


@router.get("/vinos-sin-stock")
def get_vinos_sin_stock() -> list[dict]:
    return vinos_sin_stock()


@router.get("/transportista-activo")
def get_transportista_activo() -> list[dict]:
    return transportista_activo()


@router.get("/trazabilidad/{cod_vino}")
def get_trazabilidad(cod_vino: int) -> list[dict]:
    return trazabilidad_vino(cod_vino)
