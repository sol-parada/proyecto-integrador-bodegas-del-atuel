
"""Comparación de inserción individual y carga por lotes."""

import time

import psycopg2
from psycopg2.extras import execute_values

from etapa3 import DB_CONFIG


CANTIDAD_REGISTROS = 10_000
TAMANO_LOTE = 1_000


def ejecutar_benchmark():
    datos = [
        (i, f"Registro de prueba {i}")
        for i in range(CANTIDAD_REGISTROS)
    ]

    with psycopg2.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            # Tabla temporal: no modifica las tablas del proyecto.
            cur.execute("""
                CREATE TEMP TABLE benchmark_etapa3 (
                    id INTEGER PRIMARY KEY,
                    descripcion TEXT NOT NULL
                ) ON COMMIT DROP
            """)

            # Prueba 1: una inserción por sentencia.
            inicio = time.perf_counter()

            for registro in datos:
                cur.execute(
                    """
                    INSERT INTO benchmark_etapa3
                    (id, descripcion)
                    VALUES (%s, %s)
                    """,
                    registro
                )

            tiempo_individual = time.perf_counter() - inicio

            cur.execute("SELECT COUNT(*) FROM benchmark_etapa3")
            assert cur.fetchone()[0] == CANTIDAD_REGISTROS

            cur.execute("TRUNCATE benchmark_etapa3")

            # Prueba 2: inserciones por lotes.
            inicio = time.perf_counter()

            execute_values(
                cur,
                """
                INSERT INTO benchmark_etapa3
                (id, descripcion)
                VALUES %s
                """,
                datos,
                page_size=TAMANO_LOTE
            )

            tiempo_lotes = time.perf_counter() - inicio

            cur.execute("SELECT COUNT(*) FROM benchmark_etapa3")
            assert cur.fetchone()[0] == CANTIDAD_REGISTROS

            print("\n--- RESULTADOS DEL BENCHMARK ---")
            print(f"Registros: {CANTIDAD_REGISTROS:,}")
            print(f"Tamaño de lote: {TAMANO_LOTE:,}")
            print(f"Inserción individual: {tiempo_individual:.4f} s")
            print(f"Inserción por lotes: {tiempo_lotes:.4f} s")

            if tiempo_lotes > 0:
                mejora = tiempo_individual / tiempo_lotes
                print(f"Factor de aceleración: {mejora:.2f}x")

            print("Ambas pruebas insertaron la misma cantidad.")

        # La tabla temporal se elimina al finalizar la transacción.


if __name__ == "__main__":
    ejecutar_benchmark()
