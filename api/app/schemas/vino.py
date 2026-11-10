from decimal import Decimal

from pydantic import BaseModel, Field


class VinoResumen(BaseModel):
    cod_vino: int
    nombre: str
    tipo: str
    anada: int
    volumen_ml: int
    graduacion: Decimal
    precio: Decimal
    cuit_bodega: str


class VinoListado(BaseModel):
    items: list[VinoResumen]
    page: int
    limit: int
    total: int


class Composicion(BaseModel):
    id_cepa: int
    nombre: str
    porcentaje: Decimal


class Maridaje(BaseModel):
    id_maridaje: int
    nombre: str
    temp_servicio_sugerida_c: Decimal


class VinoDetalle(VinoResumen):
    bodega: str
    composicion: list[Composicion]
    maridajes: list[Maridaje]
    stock_deposito: int
    stock_salas: int
    stock_total: int


class VinoCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    tipo: str
    anada: int = Field(ge=1900, le=2100)
    volumen_ml: int = Field(gt=0)
    graduacion: Decimal = Field(ge=5, le=20)
    precio: Decimal = Field(ge=0)
    cuit_bodega: str
    composicion: list[tuple[int, Decimal]] = Field(default_factory=list)
    maridajes: list[int] = Field(default_factory=list)


class VinoUpdate(VinoCreate):
    pass