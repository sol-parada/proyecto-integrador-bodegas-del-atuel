from fastapi import APIRouter, HTTPException, Query

from app.repositories.transferencias import listar_transferencias, obtener_transferencia

router = APIRouter(prefix="/transferencias", tags=["transferencias"])


@router.get("")
def get_transferencias(
    estado: str | None = Query(
        default=None,
        description="Filtra por estado: en_confeccion, terminado o procesado",
    ),
) -> list[dict]:
    """
    Listado de transferencias con su estado y sus renglones.
    """
    return listar_transferencias(estado)


@router.get("/{numero_solicitud}")
def get_transferencia(numero_solicitud: int) -> dict:
    """
    Detalle de una transferencia con sus renglones.
    """
    transferencia = obtener_transferencia(numero_solicitud)

    if transferencia is None:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada")

    return transferencia
