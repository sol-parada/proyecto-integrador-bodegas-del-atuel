from fastapi import APIRouter, Path

from app.repositories.salas import listar_salas, stock_de_sala

router = APIRouter(prefix="/salas", tags=["salas"])


@router.get("")
def get_salas() -> list[dict]:
    """
    Listado de salas de venta con su localidad.
    """
    return listar_salas()


@router.get("/{id_sala}/stock")
def get_stock_sala(
    id_sala: int = Path(ge=1, description="Sala de venta consultada"),
) -> list[dict]:
    """
    Stock disponible de cada vino en la sala.
    """
    return stock_de_sala(id_sala)
