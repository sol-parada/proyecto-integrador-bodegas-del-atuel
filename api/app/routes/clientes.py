from fastapi import APIRouter, HTTPException, Query, status

from app.repositories.clientes import (
    actualizar_cliente, crear_cliente, eliminar_cliente, listar_clientes, obtener_cliente,
)
from app.schemas.cliente import Cliente, ClienteCreate, ClienteUpdate

router = APIRouter(prefix="/clientes", tags=["clientes"])


@router.get("", response_model=dict)
def get_clientes(tipo_cliente: str | None = Query(default=None),
                 page: int = Query(default=1, ge=1),
                 limit: int = Query(default=20, ge=1, le=100)) -> dict:
    items, total = listar_clientes(page, limit, tipo_cliente)
    return {"items": items, "page": page, "limit": limit, "total": total}


@router.get("/{id_cliente}", response_model=Cliente)
def get_cliente(id_cliente: int) -> Cliente:
    row = obtener_cliente(id_cliente)
    if row is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return row


@router.post("", response_model=Cliente, status_code=status.HTTP_201_CREATED)
def post_cliente(data: ClienteCreate) -> Cliente:
    return crear_cliente(data.model_dump(exclude_none=True))


@router.put("/{id_cliente}", response_model=Cliente)
def put_cliente(id_cliente: int, data: ClienteUpdate) -> Cliente:
    row = actualizar_cliente(id_cliente, data.model_dump())
    if row is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return row


@router.delete("/{id_cliente}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cliente(id_cliente: int) -> None:
    if not eliminar_cliente(id_cliente):
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
