from fastapi import APIRouter, HTTPException, Query, status

from app.repositories.vinos import (
    actualizar_vino, crear_vino, eliminar_vino, listar_vinos, obtener_vino,
)
from app.schemas.vino import VinoCreate, VinoDetalle, VinoListado, VinoUpdate

router = APIRouter(prefix="/vinos", tags=["vinos"])


@router.get("", response_model=VinoListado)
def obtener_vinos(
    tipo: str | None = Query(default=None),
    cepa: str | None = Query(default=None),
    bodega: str | None = Query(default=None),
    anada: int | None = Query(default=None, ge=1900, le=2100),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> VinoListado:
    items, total = listar_vinos(
        tipo=tipo,
        cepa=cepa,
        bodega=bodega,
        anada=anada,
        page=page,
        limit=limit,
    )

    return VinoListado(
        items=items,
        page=page,
        limit=limit,
        total=total,
    )


@router.get("/{cod_vino}", response_model=VinoDetalle)
def obtener_detalle_vino(cod_vino: int) -> VinoDetalle:
    row = obtener_vino(cod_vino)
    if row is None:
        raise HTTPException(status_code=404, detail="Vino no encontrado")
    return row


@router.post("", response_model=VinoDetalle, status_code=status.HTTP_201_CREATED)
def crear(data: VinoCreate) -> VinoDetalle:
    return crear_vino(data.model_dump())


@router.put("/{cod_vino}", response_model=VinoDetalle)
def actualizar(cod_vino: int, data: VinoUpdate) -> VinoDetalle:
    row = actualizar_vino(cod_vino, data.model_dump())
    if row is None:
        raise HTTPException(status_code=404, detail="Vino no encontrado")
    return row


@router.delete("/{cod_vino}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(cod_vino: int) -> None:
    if not eliminar_vino(cod_vino):
        raise HTTPException(status_code=404, detail="Vino no encontrado")