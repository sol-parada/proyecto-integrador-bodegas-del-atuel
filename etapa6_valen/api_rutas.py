
"""
Etapa 6 - Tareas 3 y 4
Rutas FastAPI para operaciones transaccionales.

Modulo independiente de la API de Sol.
La conexion se inyecta al integrar ambas partes.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from psycopg2 import Error as PostgreSQLError
from psycopg2.extras import RealDictCursor

from etapa6_valen.comprobantes import crear_comprobante
from etapa6_valen.ingresos import (
    crear_ingreso,
    agregar_renglon_ingreso,
    terminar_ingreso,
    procesar_ingreso,
)
from etapa6_valen.transferencias import (
    crear_transferencia,
    agregar_renglon_transferencia,
    terminar_transferencia,
    procesar_transferencia,
)
from etapa6_valen.errores import (
    convertir_error_postgresql,
    convertir_error_validacion,
)


class Renglon(BaseModel):
    cod_vino: int = Field(gt=0)
    cantidad: int = Field(gt=0)


class NuevoComprobante(BaseModel):
    id_cliente: int = Field(gt=0)
    id_sala: int = Field(gt=0)
    renglones: list[Renglon] = Field(min_length=1)


class NuevoIngreso(BaseModel):
    codigo_transportista: int = Field(gt=0)
    cuit_bodega: str = Field(min_length=1)
    renglones: list[Renglon] = Field(min_length=1)


class NuevaTransferencia(BaseModel):
    id_sala: int = Field(gt=0)
    renglones: list[Renglon] = Field(min_length=1)


def ejecutar_operacion(funcion, *argumentos):
    """
    Traduce errores de las operaciones a respuestas HTTP.
    """
    try:
        return funcion(*argumentos)
    except PostgreSQLError as error:
        raise convertir_error_postgresql(error) from None
    except ValueError as error:
        raise convertir_error_validacion(error) from None


def crear_router(obtener_conexion):
    """
    Recibe una dependencia FastAPI que proporciona
    una conexion psycopg2.

    La dependencia externa es responsable de obtener
    y devolver conexiones al pool.
    """

    router = APIRouter(tags=["Operaciones transaccionales"])

    @router.post("/comprobantes", status_code=201)
    def registrar_comprobante(
        datos: NuevoComprobante,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            crear_comprobante,
            conexion,
            datos.id_cliente,
            datos.id_sala,
            [r.model_dump() for r in datos.renglones],
        )

    @router.get("/comprobantes/{numero}")
    def consultar_comprobante(
        numero: int,
        conexion=Depends(obtener_conexion),
    ):
        if numero <= 0:
            raise HTTPException(422, "Numero de comprobante invalido.")

        def consultar():
            with conexion.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT numero_comprobante, fecha, id_cliente,
                           id_sala, subtotal, descuento, total
                    FROM public.comprobante
                    WHERE numero_comprobante = %s
                    """,
                    (numero,),
                )
                cabecera = cursor.fetchone()

                if cabecera is None:
                    raise HTTPException(
                        404, "El comprobante no existe."
                    )

                resultado = dict(cabecera)

                cursor.execute(
                    """
                    SELECT cod_vino, cantidad, precio_unitario,
                           descuento, subtotal
                    FROM public.renglon_comprobante
                    WHERE numero_comprobante = %s
                    ORDER BY cod_vino
                    """,
                    (numero,),
                )

                resultado["renglones"] = [
                    dict(fila) for fila in cursor.fetchall()
                ]
                return resultado

        return ejecutar_operacion(consultar)

    @router.post("/ingresos", status_code=201)
    def registrar_ingreso(
        datos: NuevoIngreso,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            crear_ingreso,
            conexion,
            datos.codigo_transportista,
            datos.cuit_bodega,
            [r.model_dump() for r in datos.renglones],
        )

    @router.post("/ingresos/{codigo}/renglones", status_code=201)
    def registrar_renglon_ingreso(
        codigo: int,
        renglon: Renglon,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            agregar_renglon_ingreso,
            conexion,
            codigo,
            renglon.cod_vino,
            renglon.cantidad,
        )

    @router.post("/ingresos/{codigo}/terminar")
    def finalizar_ingreso(
        codigo: int,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            terminar_ingreso,
            conexion,
            codigo,
        )

    @router.post("/ingresos/{codigo}/procesar")
    def ejecutar_ingreso(
        codigo: int,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            procesar_ingreso,
            conexion,
            codigo,
        )

    @router.post("/transferencias", status_code=201)
    def registrar_transferencia(
        datos: NuevaTransferencia,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            crear_transferencia,
            conexion,
            datos.id_sala,
            [r.model_dump() for r in datos.renglones],
        )

    @router.post(
        "/transferencias/{numero}/renglones",
        status_code=201,
    )
    def registrar_renglon_transferencia(
        numero: int,
        renglon: Renglon,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            agregar_renglon_transferencia,
            conexion,
            numero,
            renglon.cod_vino,
            renglon.cantidad,
        )

    @router.post("/transferencias/{numero}/terminar")
    def finalizar_transferencia(
        numero: int,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            terminar_transferencia,
            conexion,
            numero,
        )

    @router.post("/transferencias/{numero}/procesar")
    def ejecutar_transferencia(
        numero: int,
        conexion=Depends(obtener_conexion),
    ):
        return ejecutar_operacion(
            procesar_transferencia,
            conexion,
            numero,
        )

    return router
