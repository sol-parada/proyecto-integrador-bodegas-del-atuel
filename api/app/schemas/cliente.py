from datetime import date

from pydantic import BaseModel, Field


class PermisoCreate(BaseModel):
    cod_permiso: str = Field(min_length=1, max_length=50)
    fecha_emision: date
    fecha_vencimiento: date


class ClienteBase(BaseModel):
    nombre_razon_social: str = Field(min_length=1, max_length=150)
    tipo_doc: str = Field(min_length=1, max_length=20)
    nro_doc: str = Field(min_length=1, max_length=30)
    direccion: str = Field(min_length=1, max_length=200)
    localidad: str = Field(min_length=1, max_length=100)
    tipo_cliente: str

    # Datos propios del subtipo. El descuento no se recibe: lo asigna la
    # base segun el tipo de cliente (RN-06).
    zona_cobertura: str | None = Field(default=None, max_length=150)
    nro_habilitacion: str | None = Field(default=None, max_length=50)
    pais_destino_principal: str | None = Field(default=None, max_length=100)
    permisos: list[PermisoCreate] = Field(default_factory=list)


class ClienteCreate(ClienteBase):
    fecha_alta: date | None = None


class ClienteUpdate(ClienteBase):
    pass


class Cliente(ClienteBase):
    id_cliente: int
    fecha_alta: date
    descuento: float
    es_socio: bool
    es_distribuidor: bool
    es_exportador: bool
    permisos: list[PermisoCreate] = Field(default_factory=list)
