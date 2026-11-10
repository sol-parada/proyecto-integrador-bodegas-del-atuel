from fastapi import APIRouter

from app.repositories.deposito import stock_deposito

router = APIRouter(prefix="/deposito", tags=["deposito"])


@router.get("/stock")
def get_stock_deposito() -> list[dict]:
    """
    Stock disponible en el deposito central, por vino.
    """
    return stock_deposito()
