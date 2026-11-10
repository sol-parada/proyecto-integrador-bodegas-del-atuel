from datetime import date

from pydantic import BaseModel, Field


class ClienteBase(BaseModel):
    nombre_razon_social: str = Field(min_length=1, max_length=150)
    tipo_doc: str = Field(min_length=1, max_length=20)
    nro_doc: str = Field(min_length=1, max_length=30)
    direccion: str = Field(min_length=1, max_length=200)
    localidad: str = Field(min_length=1, max_length=100)
    tipo_cliente: str


class ClienteCreate(ClienteBase):
    fecha_alta: date | None = None


class ClienteUpdate(ClienteBase):
    pass


class Cliente(ClienteBase):
    id_cliente: int
    fecha_alta: date
