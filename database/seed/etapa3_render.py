import csv
from pathlib import Path
from dotenv import load_dotenv
import sys
import random
from decimal import Decimal
from datetime import datetime, date, timedelta
from faker import Faker
import psycopg2
from psycopg2.extras import execute_values
import os

# CONFIGURACION GENERAL DE ETAPA 3

MODO_PRUEBA = True

TOTAL_COMPROBANTES = 100 if MODO_PRUEBA else 150_000
TOTAL_RENGLONES = 350 if MODO_PRUEBA else 500_000

# 1. Configuración de reproducibilidad (Semilla y fecha fija según H3)
SEED = 42
fake = Faker('es_AR')
Faker.seed(SEED)
random.seed(SEED)

FECHA_REFERENCIA_FIJA = date(2025, 1, 15)
ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"


def leer_csv(nombre_archivo):
    ruta = DATA_DIR / nombre_archivo

    if not ruta.is_file():
        raise FileNotFoundError(
            f"No se encontró el catálogo: {ruta}"
        )

    with ruta.open("r", encoding="utf-8-sig", newline="") as archivo:
        return list(csv.DictReader(archivo))

def reiniciar_generadores():
    random.seed(SEED)
    Faker.seed(SEED)
    fake.seed_instance(SEED)
    fake.unique.clear()

# 2. Configuración de conexión a PostgreSQL
# Las credenciales se obtienen de variables de entsorno.

load_dotenv(ROOT_DIR / ".env")

DB_CONFIG = {
    "dbname": os.getenv("POSTGRES_DB", "bodegas_atuel"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("POSTGRES_PORT", "5432"),
    "client_encoding": "UTF8",
}


# Porque las credenciales de PostgreSQL no deben quedar guardadas directamente en archivos que después se suben a GitHub.


def generar_carga_nivel_0(cur):
    """Inserta los datos del Nivel 0 adaptados a las tablas de Santiago"""
    print("--- Cargando Nivel 0 ---")

    # 1. Localidades (codigo_postal PK, nombre, provincia, encargado_regional)

    # 1. LOCALIDADES
    # Catálogo inicial de localidades reales de Mendoza.
    # Los códigos postales se utilizan como identificadores.

    localidades = [
        (
            fila["codigo_postal"].strip(),
            fila["nombre"].strip(),
            fila["provincia"].strip(),
            fila["encargado_regional"].strip(),
        )
        for fila in leer_csv("localidades.csv")
    ]

    if not localidades:
        raise ValueError("El catálogo localidades.csv está vacío.")

    execute_values(
        cur,
        """
        INSERT INTO localidad
        (codigo_postal, nombre, provincia, encargado_regional)
        VALUES %s
        ON CONFLICT (codigo_postal) DO NOTHING
        """,
        localidades
    )

    print("✓ Localidades cargadas")


    # 2. Cepas (nombre, tipo) -> tipo_cepa es un enum o varchar según su esquema
    cepas = [
        (
            fila["nombre"].strip(),
            fila["tipo"].strip().lower()
        )
        for fila in leer_csv("cepas.csv")
    ]

    if not cepas:
        raise ValueError("El catálogo cepas.csv está vacío.")
    execute_values(
        cur,
        """
        INSERT INTO cepa (nombre, tipo)
        VALUES %s
        ON CONFLICT (nombre) DO NOTHING
        """,
        cepas
    )

    print("✓ Cepas cargadas")

    """Cada variedad queda asociada con su tipo correcto, se respeta el ENUM tipo_cepa de PostgreSQL, no se generan clasificaciones
    aleatorias incorrectas y se evita duplicar nombres de cepas."""
    #Coordinar con RENATA los CVS definitivos.

    # 3. Bodegas
    # Datos sintéticos con CUIT de 11 dígitos.
    # El esquema valida el formato, no el dígito verificador.

    bodegas = []
    cuits_generados = set()

    while len(bodegas) < 10:
        prefijo = random.choice(["20", "23", "27", "30"])
        numero = random.randint(100000000, 999999999)
        cuit = f"{prefijo}{numero}"

        if cuit not in cuits_generados:
            cuits_generados.add(cuit)

            bodegas.append((
                cuit,
                fake.company()[:150],
                fake.street_address()[:200]
            ))

    execute_values(
        cur,
        """
        INSERT INTO bodega (cuit, razon_social, domicilio)
        VALUES %s
        ON CONFLICT (cuit) DO NOTHING
        """,
        bodegas
    )

    print("✓ Bodegas cargadas")

    """Acá se generan 10 bodegas ficticias para las pruebas, se evita repetir CUIT dentro del lote generado, se respetan las columnas cuit,
    razon_social y domicilio, se mantienen la reproducibilidad mediante la semilla 42 y evita duplicados de CUIT si ejecutás nuevamente
    esta inserción."""

    # 4. Transportistas
    # Datos sintéticos respetando las restricciones de unicidad de CUIT y correo electrónico.

    transportistas = []
    cuits_transportistas = set()
    emails_transportistas = set()

    while len(transportistas) < 15:
        prefijo = random.choice(["20", "23", "27", "30"])
        numero = random.randint(100000000, 999999999)
        cuit = f"{prefijo}{numero}"

        email = fake.unique.email()

        if (
            cuit not in cuits_transportistas
            and cuit not in cuits_generados
            and email not in emails_transportistas
        ):
            cuits_transportistas.add(cuit)
            emails_transportistas.add(email)

            transportistas.append((
                fake.company()[:150],
                cuit,
                email,
                fake.phone_number()[:30],
                fake.street_address()[:200]
            ))

    execute_values(
        cur,
        """
        INSERT INTO transportista
        (razon_social, cuit, email, telefono, domicilio)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        transportistas
    )

    print("✓ Transportistas cargados")

    """
    Evitamos:
      -repetir CUIT dentro de los transportistas generados.
      -repetir correos electrónicos, como exige tu 002_constraints.sql.
      -que los CUIT sintéticos coincidan con los generados para las bodegas.
    Respetamos las columnas y los tipos de 001_esquema.sql.
    Mantenemos el uso de Faker y la semilla fija para generar datos reproducibles.
    """



    # 5. FINCAS
    # Columnas: id_finca (IDENTITY), nombre,
    # superficie_ha, departamento y provincia.
    # Generamos datos sintéticos con superficies positivas.


    departamentos = [
    fila["nombre_departamento"].strip()
    for fila in leer_csv("departamentos.csv")
    if fila["provincia"].strip().casefold() == "mendoza"
    ]

    if not departamentos:
        raise ValueError(
            "departamentos.csv no contiene departamentos de Mendoza."
    )

    fincas = []

    for i in range(1, 51):
        nombre = f"Finca {i:03d}"
        superficie = round(random.uniform(20.0, 250.0), 2)
        departamento = random.choice(departamentos)

        fincas.append((
            nombre,
            superficie,
            departamento,
            "Mendoza"
        ))

    execute_values(
        cur,
        """
        INSERT INTO finca
        (nombre, superficie_ha, departamento, provincia)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        fincas
    )

    print("✓ Fincas cargadas")

    """
    Acá lo que hacemos es:
    Generar 50 fincas con nombres diferentes.
    Todas las superficies son positivas, cumpliendo la RN-15.
    Utilizar departamentos reales de Mendoza.
    Mantener la semilla 42 para obtener valores reproducibles.
    Un detalle importante es que finca tiene una clave primaria autogenerada, por lo que ON CONFLICT DO NOTHING no impide
    volver a insertar las mismas fincas si ejecutás nuevamente el script.
    """

    # 6. MARIDAJES
    # Catálogo de maridajes y temperaturas sugeridas.
    # Las temperaturas se expresan en grados Celsius.

    maridajes = [
        (
            fila["nombre"].strip(),
            Decimal(fila["temp_servicio_sugerida_c"].strip())
        )
        for fila in leer_csv("maridajes.csv")
    ]

    if not maridajes:
        raise ValueError("El catálogo maridajes.csv está vacío.")

    execute_values(
        cur,
        """
        INSERT INTO maridaje
        (nombre, temp_servicio_sugerida_c)
        VALUES %s
        ON CONFLICT (nombre) DO NOTHING
        """,
        maridajes
    )

    print("✓ Maridajes cargados")
    """
    Lo hacemos asi porque usamos categorías de maridaje reconocibles en lugar de nombres aleatorios, también cada maridaje tiene
    una temperatura sugerida. Respetamos las columnas de 001_esquema.sql, evitamos duplicar nombres mediante ON CONFLICT (nombre)
    DO NOTHING y los datos podrán utilizarse después en la tabla vino_maridaje.
    """

    #tenemos que incorporar los descuentos que acordaron con Santiago y preparar los datos para las ventas masivas.


    # 7. CLIENTES: Generación de 20.000 clientes sintéticos.
    # RN-06: descuento según tipo de cliente.
    # Semilla fija para reproducibilidad.

    tipos_cliente = ["socio", "distribuidor", "exportador"]

    descuentos = {
        "socio": 0.10,
        "distribuidor": 0.20,
        "exportador": 0.30
    }

    clientes = []

    for i in range(1, 20001):
        tipo = random.choice(tipos_cliente)

        clientes.append((
            fake.name()[:150],
            "DNI",
            f"{30000000 + i}",
            fake.street_address()[:200],
            random.choice([
                "General Alvear",
                "San Rafael",
                "Mendoza",
                "Godoy Cruz",
                "Tunuyán"
            ]),
            FECHA_REFERENCIA_FIJA,
            tipo,
            descuentos[tipo]
        ))

    execute_values(
        cur,
        """
        INSERT INTO cliente
        (
            nombre_razon_social,
            tipo_doc,
            nro_doc,
            direccion,
            localidad,
            fecha_alta,
            tipo_cliente,
            descuento
        )
        VALUES %s
        ON CONFLICT (nro_doc) DO NOTHING
        """,
        clientes,
        page_size=1000
    )

    print("✓ Clientes cargados")
"""
* Generamos 20.000 clientes sintéticos, como recomienda el profesor.
* Asignamos un tipo a cada cliente.
* Asociamos el descuento correspondiente: 10 %, 20 % o 30 %.
* Utilizamos una fecha fija para mantener la reproducibilidad.
* Insertamos en lotes de 1.000 registros, en lugar de hacerlo uno por uno.
* Evitamos repetir números de documento gracias a ON CONFLICT (nro_doc) DO NOTHING.

Hay dos detalles del Nivel 0 que debemos tener presentes
Primero: el código inserta explícitamente cliente.descuento. Eso es coherente con el acuerdo de Santiago,
pero la columna todavía depende de la migración que tenemos guardada en la rama de la Etapa 2 y del trigger de Sol.

Segundo: si ejecuto el programa varias veces sobre la misma base, podrías duplicar fincas, porque ON CONFLICT DO NOTHING
no evita duplicados de datos cuando no existe una restricción de unicidad aplicable. Para la carga definitiva vamos a utilizar
una estrategia reproducible sobre una base de prueba preparada.
"""



def generar_carga_nivel_1(cur):
    """Inserta los datos del Nivel 1 respetando claves foráneas y restricciones de negocio"""
    print("--- Cargando Nivel 1 ---")

    # Obtenemos claves foráneas existentes del Nivel 0 para mantener la integridad referencial
    cur.execute("SELECT codigo_postal FROM localidad;")
    codigos_postales = [row[0] for row in cur.fetchall()]

    cur.execute("SELECT id_finca FROM finca;")
    ids_fincas = [row[0] for row in cur.fetchall()]

    cur.execute("SELECT id_cepa FROM cepa;")
    ids_cepas = [row[0] for row in cur.fetchall()]

    cur.execute("SELECT cuit FROM bodega;")
    cuits_bodegas = [row[0] for row in cur.fetchall()]

    cur.execute("SELECT codigo_transportista FROM transportista;")
    codigos_transportistas = [row[0] for row in cur.fetchall()]

    cur.execute("SELECT id_cliente FROM cliente;")
    ids_clientes = [row[0] for row in cur.fetchall()]


    if (
        not codigos_postales
        or not cuits_bodegas
        or not ids_fincas
        or not ids_cepas
        or not codigos_transportistas
        or not ids_clientes
    ):
        raise ValueError(
            "Nivel 1: faltan registros del Nivel 0. "
            "No se puede continuar con la carga."
        )

        """
        raise ValueError interrumpe la ejecución y permite revertir la transacción si faltan datos esenciales.
        Así evitamos guardar una carga parcial como si hubiera terminado correctamente.
        """


    # 1. SALAS DE VENTA
    # Cada sala pertenece a una localidad existente (RN-02).

    dias = [
        "Lunes", "Martes", "Miércoles",
        "Jueves", "Viernes", "Sábado", "Domingo"
    ]

    salas = []
    direcciones_generadas = set()

    while len(salas) < 15:
        calle = fake.street_name()[:100]
        numero = str(random.randint(1, 4000))
        codigo_postal = random.choice(codigos_postales)

        direccion = (calle, numero, codigo_postal)

        if direccion not in direcciones_generadas:
            direcciones_generadas.add(direccion)

            salas.append((
                calle,
                numero,
                random.choice(dias),
                codigo_postal
            ))

    execute_values(
        cur,
        """
        INSERT INTO sala_venta
        (calle, numero, dia_cierre, codigo_postal)
        VALUES %s
        """,
        salas
    )

    print("✓ Salas de venta cargadas")

    """
    - Respeta la clave foránea entre sala_venta y localidad.
    - Genera 15 salas de venta.
    - Incluye todos los días posibles de cierre.
    - Evita repetir direcciones dentro del lote generado.
    - Mantiene la reproducibilidad mediante la semilla fija.
    Importante: el esquema actual no tiene un UNIQUE para la dirección de las salas.
    Por eso, la prevención de duplicados ocurre en Python, no en PostgreSQL. La prueba final la haremos
    sobre una base de pruebas preparada desde cero.
    """



    # 2. PARCELAS
    # Cada parcela pertenece a una finca (RN-04). La suma de superficies de las
    # parcelas no debe superar la superficie total de su finca.

    cur.execute("""
        SELECT id_finca, superficie_ha
        FROM finca
        ORDER BY id_finca
    """)
    fincas_disponibles = cur.fetchall()

    parcelas = []

    for id_finca, superficie_finca in fincas_disponibles:

        # Cada finca tendrá entre 2 y 4 parcelas.
        cantidad_parcelas = random.randint(8, 12)

        # Utilizamos el 80 % de la superficie total.

        superficie_disponible = int(
            superficie_finca * Decimal("80")
        )


        # Distribuimos las hectáreas en partes positivas.
        cortes = sorted(random.sample(
            range(1, superficie_disponible),
            cantidad_parcelas - 1
        ))

        superficies = [
            b - a
            for a, b in zip(
                [0] + cortes,
                cortes + [superficie_disponible]
            )
        ]

        for nro, superficie_centésimas in enumerate(
            superficies, start=1
        ):
            parcelas.append((
                id_finca,
                nro,
                superficie_centésimas / 100,
                random.randint(1990, 2016),
                random.choice(ids_cepas)
            ))

    execute_values(
        cur,
        """
        INSERT INTO parcela
        (
            id_finca,
            nro_parcela,
            superficie_ha,
            anio_plantacion,
            id_cepa
        )
        VALUES %s
        ON CONFLICT (id_finca, nro_parcela) DO NOTHING
        """,
        parcelas
    )

    print(f"✓ Parcelas cargadas: {len(parcelas)} generadas")

    """
    Cada parcela está asociada a una finca existente.
    Cada finca tiene entre 2 y 4 parcelas.
    Las parcelas ocupan en conjunto el 80 % de la superficie de su finca.
    Ninguna parcela tiene superficie cero o negativa.
    Cada parcela tiene una cepa válida y un año de plantación.
    Se respeta la clave primaria compuesta (id_finca, nro_parcela).
    """


    # 3. VINOS
    # Generación de vinos sintéticos.
    # Se respetan los tipos ENUM y las restricciones de precio, volumen y graduación alcohólica.

    tipos_vino = [
        "tinto",
        "blanco",
        "rosado",
        "espumante"
    ]

    nombres_vino = [
        "Malbec Reserva",
        "Cabernet Sauvignon Reserva",
        "Bonarda Clásico",
        "Syrah Roble",
        "Merlot Reserva",
        "Chardonnay Selección",
        "Torrontés Clásico",
        "Pinot Noir Reserva",
        "Cabernet Franc Roble",
        "Blend del Atuel"
    ]

    vinos = []
    combinaciones_generadas = set()

    while len(vinos) < 300:
        nombre = random.choice(nombres_vino)
        tipo = random.choice(tipos_vino)
        anada = random.randint(2018, 2024)
        volumen = random.choice([375, 750, 1500])
        graduacion = round(random.uniform(11.5, 14.5), 2)
        precio = round(random.uniform(3500, 45000), 2)
        cuit_bodega = random.choice(cuits_bodegas)

        clave = (cuit_bodega, nombre, anada, volumen)

        if clave in combinaciones_generadas:
            continue

        combinaciones_generadas.add(clave)

        vinos.append((
            nombre,
            tipo,
            anada,
            volumen,
            graduacion,
            precio,
            cuit_bodega
        ))

    execute_values(
        cur,
        """
        INSERT INTO vino
        (
            nombre,
            tipo,
            anada,
            volumen_ml,
            graduacion,
            precio,
            cuit_bodega
        )
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        vinos,
        page_size=500
    )

    print(f"✓ Vinos generados: {len(vinos)}")

    """
    Este bloque se encarga de:
    - Generar 300 vinos sintéticos.
    - Asignar sus características y precios.
    - Relacionar cada vino con una bodega existente.
    - Evitar combinaciones duplicadas.
    - Respetar las restricciones de la base de datos.
    - Insertar los registros por lotes.
    """



    # 4. SUBTIPOS DE CLIENTES


    # Obtener los clientes según su tipo registrado.
    cur.execute("""
        SELECT id_cliente, tipo_cliente
        FROM cliente
        ORDER BY id_cliente
    """)

    clientes_registrados = cur.fetchall()

    socios = []
    distribuidores = []
    exportadores = []

    for id_cliente, tipo in clientes_registrados:

        if tipo == "socio":
            socios.append((id_cliente,))

        elif tipo == "distribuidor":
            distribuidores.append((
                id_cliente,
                random.choice([
                    "General Alvear",
                    "San Rafael",
                    "Gran Mendoza",
                    "Valle de Uco",
                    "Zona Este"
                ]),
                f"HAB-{id_cliente:08d}"
            ))

        elif tipo == "exportador":
            exportadores.append((
                id_cliente,
                random.choice([
                    "Brasil",
                    "Chile",
                    "Estados Unidos",
                    "España",
                    "Francia",
                    "Alemania",
                    "México"
                ])
            ))

        else:
            raise ValueError(
                f"Tipo de cliente desconocido: {tipo}"
            )

    # Registrar socios.
    if socios:
        execute_values(
            cur,
            """
            INSERT INTO cliente_socio (id_cliente)
            VALUES %s
            ON CONFLICT (id_cliente) DO NOTHING
            """,
            socios,
            page_size=1000
        )

    # Registrar distribuidores.
    if distribuidores:
        execute_values(
            cur,
            """
            INSERT INTO cliente_distribuidor
            (id_cliente, zona_cobertura, nro_habilitacion)
            VALUES %s
            ON CONFLICT (id_cliente) DO NOTHING
            """,
            distribuidores,
            page_size=1000
        )

    # Registrar exportadores.
    if exportadores:
        execute_values(
            cur,
            """
            INSERT INTO cliente_exportador
            (id_cliente, pais_destino_principal)
            VALUES %s
            ON CONFLICT (id_cliente) DO NOTHING
            """,
            exportadores,
            page_size=1000
        )

    print(f"✓ Socios: {len(socios)}")
    print(f"✓ Distribuidores: {len(distribuidores)}")
    print(f"✓ Exportadores: {len(exportadores)}")
    print("✓ Subtipos de clientes cargados")

    """
    Este bloque se encarga de:
    - Clasificar los clientes según su tipo.
    - Registrar cada cliente en su tabla correspondiente.
    - Generar los datos adicionales de distribuidores y exportadores.
    - Evitar registros duplicados.
    - Respetar las claves foráneas.
    """



    # 5. TRANSPORTISTA_COBERTURA

    coberturas = []

    for codigo_transportista in sorted(codigos_transportistas):

        localidades_asignadas = random.sample(
            sorted(codigos_postales),
            k=min(3, len(codigos_postales))
        )

        for codigo_postal in localidades_asignadas:
            coberturas.append((
                codigo_transportista,
                codigo_postal
            ))

    if coberturas:
        execute_values(
            cur,
            """
            INSERT INTO transportista_cobertura
            (codigo_transportista, codigo_postal)
            VALUES %s
            ON CONFLICT (codigo_transportista, codigo_postal)
            DO NOTHING
            """,
            coberturas,
            page_size=1000
        )

    print(f"✓ Coberturas generadas: {len(coberturas)}")

    """
    Este bloque se encarga de:
    - Asignar 3 localidades a cada transportista.
    - Relacionar transportistas con localidades existentes.
    - Evitar coberturas duplicadas.
    - Insertar las relaciones en la base de datos.
    """

    # 6. INGRESOS DE MERCADERÍA

    CANTIDAD_INGRESOS = 2000

    print(
        f"Generando {CANTIDAD_INGRESOS} ingresos "
        "de mercadería..."
    )

    if not codigos_transportistas:
        raise ValueError(
            "No existen transportistas para generar ingresos."
        )

    if not cuits_bodegas:
        raise ValueError(
            "No existen bodegas para generar ingresos."
        )

    ingresos = []

    for _ in range(CANTIDAD_INGRESOS):

        dias_atras = random.randint(0, 200)

        fecha_ingreso = (
            FECHA_REFERENCIA_FIJA
            - timedelta(days=dias_atras)
        )

        ingresos.append((
            fecha_ingreso,
            "en_confeccion",
            random.choice(codigos_transportistas),
            random.choice(cuits_bodegas)
        ))

    execute_values(
        cur,
        """
        INSERT INTO ingreso
        (
            fecha,
            estado,
            codigo_transportista,
            cuit_bodega
        )
        VALUES %s
        """,
        ingresos,
        page_size=1000
    )

    print(
        f"✓ Ingresos generados: {len(ingresos)}"
    )

    print(
        "✓ Todos los ingresos comienzan "
        "en estado en_confeccion"
    )

    # El procedimiento almacenado de Santiago se encargará de terminar y procesar cada
    # ingreso después de generar sus renglones.



def generar_carga_nivel_2(cur):
    # NIVEL 2
    # Este nivel se encargará de:
    # *Generar empleados y lotes de uva.
    # *Registrar composiciones y maridajes de vinos.
    # *Crear permisos de exportación.
    # *Preparar los movimientos de mercadería y ventas.
    # *Respetar las relaciones y reglas de negocio.

    print("\n--- Cargando Nivel 2 ---")


    # 1. EMPLEADOS

    cur.execute("""
        SELECT id_sala
        FROM sala_venta
        ORDER BY id_sala
    """)

    ids_salas = [fila[0] for fila in cur.fetchall()]

    if not ids_salas:
        raise ValueError(
            "No existen salas de venta para asignar empleados."
        )

    empleados = []

    for i in range(300):
        cuit = f"27{500000000 + i:09d}"
        nombre = fake.name()[:150]

        fecha_ingreso = (
            FECHA_REFERENCIA_FIJA
            - timedelta(days=random.randint(30, 3650))
        )

        salario = round(random.uniform(500000, 2500000), 2)

        # Repartimos empleados entre las salas existentes.
        id_sala = ids_salas[i % len(ids_salas)]

        empleados.append((
            cuit,
            nombre,
            fecha_ingreso,
            salario,
            id_sala
        ))

    execute_values(
        cur,
        """
        INSERT INTO empleado
        (
            cuit,
            nombre,
            fecha_ingreso,
            salario,
            id_sala
        )
        VALUES %s
        ON CONFLICT (cuit) DO NOTHING
        """,
        empleados,
        page_size=1000
    )

    print(f"✓ Empleados generados: {len(empleados)}")

    """
    Este bloque se encarga de:
    - Generar 300 empleados sintéticos.
    - Asignarles CUIT, nombre, salario y fecha de ingreso.
    - Relacionar cada empleado con una sala existente.
    - Evitar empleados duplicados.
    - Insertar los registros por lotes.
    """

    # 2. LOTES DE UVA

    cur.execute("""
        SELECT id_finca, nro_parcela
        FROM parcela
        ORDER BY id_finca, nro_parcela
    """)

    parcelas_disponibles = cur.fetchall()

    cur.execute("""
        SELECT cuit
        FROM bodega
        ORDER BY cuit
    """)

    bodegas_disponibles = [
        fila[0] for fila in cur.fetchall()
    ]

    if not parcelas_disponibles or not bodegas_disponibles:
        raise ValueError(
            "Faltan parcelas o bodegas para generar lotes de uva."
        )

    lotes = []

    for id_finca, nro_parcela in parcelas_disponibles:

        # Generamos una cosecha por campaña.
        for campana in range(2017, 2025):

            fecha_cosecha = date(
                campana,
                random.randint(2, 4),
                random.randint(1, 28)
            )

            kg_cosechados = round(
                random.uniform(500, 20000),
                2
            )

            cuit_bodega_destino = random.choice(
                bodegas_disponibles
            )

            lotes.append((
                id_finca,
                nro_parcela,
                campana,
                fecha_cosecha,
                kg_cosechados,
                cuit_bodega_destino
            ))

    execute_values(
        cur,
        """
        INSERT INTO lote_uva
        (
            id_finca,
            nro_parcela,
            campana,
            fecha_cosecha,
            kg_cosechados,
            cuit_bodega_destino
        )
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        lotes,
        page_size=1000
    )

    print(f"✓ Lotes de uva generados: {len(lotes)}")

    """
    Este bloque se encarga de:
    - Generar cosechas de uva para las parcelas existentes.
    - Registrar la campaña, fecha y kilos cosechados.
    - Asignar una bodega de destino a cada lote.
    - Evitar repetir una cosecha por parcela y campaña.
    - Insertar los registros por lotes.
    """


    # 3. COMPOSICIÓN DE VINOS

    cur.execute("""
        SELECT cod_vino
        FROM vino
        ORDER BY cod_vino
    """)
    ids_vinos = [fila[0] for fila in cur.fetchall()]

    cur.execute("""
        SELECT id_cepa
        FROM cepa
        ORDER BY id_cepa
    """)
    ids_cepas_disponibles = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_vinos or not ids_cepas_disponibles:
        raise ValueError(
            "Faltan vinos o cepas para generar composiciones."
        )

    composiciones = []

    for cod_vino in ids_vinos:

        cantidad_cepas = random.randint(
            1,
            min(3, len(ids_cepas_disponibles))
        )

        cepas_elegidas = random.sample(
            ids_cepas_disponibles,
            cantidad_cepas
        )

        if cantidad_cepas == 1:
            porcentajes = [10000]
        else:
            cortes = sorted(
                random.sample(
                    range(1, 10000),
                    cantidad_cepas - 1
                )
            )

            porcentajes = [
                b - a
                for a, b in zip(
                    [0] + cortes,
                    cortes + [10000]
                )
            ]

        for id_cepa, porcentaje in zip(
            cepas_elegidas,
            porcentajes
        ):
            composiciones.append((
                cod_vino,
                id_cepa,
                Decimal(porcentaje) / Decimal(100)
            ))

    execute_values(
        cur,
        """
        INSERT INTO composicion_vino
        (
            cod_vino,
            id_cepa,
            porcentaje
        )
        VALUES %s
        ON CONFLICT (cod_vino, id_cepa)
        DO NOTHING
        """,
        composiciones,
        page_size=1000
    )

    print(
        f"✓ Composiciones generadas: {len(composiciones)}"
    )
    """
    Este bloque se encarga de:
    - Obtener los vinos y las cepas existentes.
    - Asignar entre 1 y 3 cepas a cada vino.
    - Distribuir sus porcentajes hasta sumar el 100 %.
    - Evitar repetir una cepa dentro del mismo vino.
    - Insertar las composiciones por lotes.
    """


    # 4. VINO_MARIDAJE

    cur.execute("""
        SELECT cod_vino
        FROM vino
        ORDER BY cod_vino
    """)

    ids_vinos_maridaje = [
        fila[0] for fila in cur.fetchall()
    ]

    cur.execute("""
        SELECT id_maridaje
        FROM maridaje
        ORDER BY id_maridaje
    """)

    ids_maridajes = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_vinos_maridaje or not ids_maridajes:
        raise ValueError(
            "Faltan vinos o maridajes para generar relaciones."
        )

    relaciones_maridaje = []

    for cod_vino in ids_vinos_maridaje:

        cantidad_maridajes = random.randint(
            1,
            min(3, len(ids_maridajes))
        )

        maridajes_elegidos = random.sample(
            ids_maridajes,
            cantidad_maridajes
        )

        for id_maridaje in maridajes_elegidos:
            relaciones_maridaje.append((
                cod_vino,
                id_maridaje
            ))

    execute_values(
        cur,
        """
        INSERT INTO vino_maridaje
        (
            cod_vino,
            id_maridaje
        )
        VALUES %s
        ON CONFLICT (cod_vino, id_maridaje)
        DO NOTHING
        """,
        relaciones_maridaje,
        page_size=1000
    )

    print(
        f"✓ Relaciones vino-maridaje generadas: "
        f"{len(relaciones_maridaje)}"
    )

    """
    Este bloque se encarga de:
    - Obtener los vinos y maridajes existentes.
    - Asignar entre 1 y 3 maridajes a cada vino.
    - Evitar relaciones duplicadas.
    - Respetar las claves foráneas.
    - Insertar las relaciones por lotes.
    """


    # 5. PERMISOS DE EXPORTACIÓN

    cur.execute("""
        SELECT id_cliente
        FROM cliente_exportador
        ORDER BY id_cliente
    """)

    ids_exportadores = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_exportadores:
        raise ValueError(
            "No existen clientes exportadores para generar permisos."
        )

    permisos = []

    for id_exportador in ids_exportadores:

        cantidad_permisos = random.randint(1, 5)

        for numero in range(1, cantidad_permisos + 1):

            fecha_emision = (
                FECHA_REFERENCIA_FIJA
                - timedelta(days=random.randint(30, 1000))
            )

            fecha_vencimiento = (
                fecha_emision
                + timedelta(days=random.randint(365, 730))
            )

            codigo_permiso = (
                f"EXP-{id_exportador:08d}-{numero:02d}"
            )

            permisos.append((
                codigo_permiso,
                id_exportador,
                fecha_emision,
                fecha_vencimiento
            ))

    execute_values(
        cur,
        """
        INSERT INTO permiso_exportacion
        (
            cod_permiso,
            id_cliente_exportador,
            fecha_emision,
            fecha_vencimiento
        )
        VALUES %s
        ON CONFLICT (cod_permiso) DO NOTHING
        """,
        permisos,
        page_size=1000
    )

    print(
        f"✓ Permisos de exportación generados: "
        f"{len(permisos)}"
    )

    """
    Este bloque se encarga de:
    - Obtener los clientes exportadores existentes.
    - Generar entre 1 y 5 permisos por exportador.
    - Asignar fechas de emisión y vencimiento válidas.
    - Evitar códigos de permiso duplicados.
    - Insertar los permisos por lotes.
    """


    # 6. STOCK_DEPÓSITO

    cur.execute("""
        SELECT cod_vino
        FROM vino
        ORDER BY cod_vino
    """)

    ids_vinos_stock = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_vinos_stock:
        raise ValueError(
            "No existen vinos para inicializar el stock."
        )

    stock_inicial = [
        (cod_vino, 0)
        for cod_vino in ids_vinos_stock
    ]

    execute_values(
        cur,
        """
        INSERT INTO stock_deposito
        (
            cod_vino,
            cantidad
        )
        VALUES %s
        ON CONFLICT (cod_vino) DO NOTHING
        """,
        stock_inicial,
        page_size=1000
    )

    print(
        f"✓ Registros de stock inicial generados: "
        f"{len(stock_inicial)}"
    )

    """
    Este bloque se encarga de:
    - Obtener todos los vinos existentes.
    - Crear un registro de stock para cada vino.
    - Inicializar las cantidades en cero.
    - Evitar registros duplicados.
    - Preparar el inventario para futuros ingresos.

    """

    # 7. RENGLONES DE INGRESO
    # Carga masiva de botellas al depósito central

    print("Generando renglones de ingreso...")

    cur.execute("""
        SELECT codigo_ingreso, cuit_bodega
        FROM ingreso
        WHERE estado = 'en_confeccion'
        ORDER BY codigo_ingreso
    """)

    ingresos_disponibles = cur.fetchall()

    if not ingresos_disponibles:
        raise ValueError(
            "No hay ingresos en confección para cargar."
        )

    cur.execute("""
        SELECT cod_vino, cuit_bodega
        FROM vino
        ORDER BY cod_vino
    """)

    vinos_por_bodega = {}

    for cod_vino, cuit_bodega in cur.fetchall():
        vinos_por_bodega.setdefault(
            cuit_bodega, []
        ).append(cod_vino)

    renglones_ingreso = []
    total_botellas_ingresadas = 0

    for codigo_ingreso, cuit_bodega in ingresos_disponibles:

        vinos_bodega = vinos_por_bodega.get(
            cuit_bodega, []
        )

        if not vinos_bodega:
            raise ValueError(
                f"La bodega {cuit_bodega} no tiene vinos "
                f"para el ingreso {codigo_ingreso}."
            )

        # Cada ingreso contiene entre 2 y 5 vinos,
        # o menos si la bodega tiene pocos productos.
        cantidad_vinos = random.randint(
            min(2, len(vinos_bodega)),
            min(5, len(vinos_bodega))
        )

        vinos_elegidos = random.sample(
            vinos_bodega,
            cantidad_vinos
        )

        for cod_vino in vinos_elegidos:

            # Producción embotellada por renglón.
            cantidad_botellas = random.randint(
                500, 2000
            )

            renglones_ingreso.append((
                codigo_ingreso,
                cod_vino,
                cantidad_botellas
            ))

            total_botellas_ingresadas += (
                cantidad_botellas
            )

    execute_values(
        cur,
        """
        INSERT INTO renglon_ingreso
        (
            codigo_ingreso,
            cod_vino,
            cantidad
        )
        VALUES %s
        """,
        renglones_ingreso,
        page_size=1000
    )

    print(
        f"✓ Ingresos preparados: "
        f"{len(ingresos_disponibles)}"
    )

    print(
        f"✓ Renglones de ingreso generados: "
        f"{len(renglones_ingreso)}"
    )

    print(
        f"✓ Botellas registradas en ingresos: "
        f"{total_botellas_ingresadas:,}"
    )

    print(
        "✓ Cada ingreso contiene vinos "
        "de su bodega de origen"
    )



    # 8. TRANSFERENCIAS

    CANTIDAD_TRANSFERENCIAS = 2000

    print(
        f"Generando {CANTIDAD_TRANSFERENCIAS} "
        "transferencias de mercadería..."
    )

    # Obtener las salas existentes.
    cur.execute("""
        SELECT id_sala
        FROM sala_venta
        ORDER BY id_sala
    """)

    ids_salas_transferencia = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_salas_transferencia:
        raise ValueError(
            "No existen salas para generar transferencias."
        )

    transferencias = []

    # Distribuir las solicitudes entre todas las salas.
    for i in range(CANTIDAD_TRANSFERENCIAS):

        id_sala = ids_salas_transferencia[
            i % len(ids_salas_transferencia)
        ]

        transferencias.append((id_sala,))

    # PostgreSQL establecerá la fecha actual y
    # el estado inicial 'en_confeccion'.
    execute_values(
        cur,
        """
        INSERT INTO transferencia (id_sala)
        VALUES %s
        """,
        transferencias,
        page_size=1000
    )

    print(
        f"✓ Transferencias generadas: "
        f"{len(transferencias)}"
    )

    print(
        f"✓ Salas participantes: "
        f"{len(ids_salas_transferencia)}"
    )



    # 9. STOCK_SALA

    cur.execute("""
        SELECT id_sala
        FROM sala_venta
        ORDER BY id_sala
    """)

    ids_salas_stock = [
        fila[0] for fila in cur.fetchall()
    ]

    cur.execute("""
        SELECT cod_vino
        FROM vino
        ORDER BY cod_vino
    """)

    ids_vinos_stock_sala = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_salas_stock or not ids_vinos_stock_sala:
        raise ValueError(
            "Faltan salas o vinos para inicializar el stock."
        )

    registros_stock_sala = [
        (id_sala, cod_vino, 0)
        for id_sala in ids_salas_stock
        for cod_vino in ids_vinos_stock_sala
    ]

    execute_values(
        cur,
        """
        INSERT INTO stock_sala
        (
            id_sala,
            cod_vino,
            cantidad
        )
        VALUES %s
        ON CONFLICT (id_sala, cod_vino) DO NOTHING
        """,
        registros_stock_sala,
        page_size=1000
    )

    print(
        f"✓ Registros de stock por sala generados: "
        f"{len(registros_stock_sala)}"
    )

    """
    Este bloque se encarga de:
    - Obtener las salas de venta y los vinos existentes.
    - Crear un registro de inventario por sala y vino.
    - Inicializar las cantidades en cero.
    - Evitar registros duplicados.
    - Preparar el stock para futuras transferencias.

    """


    # 10. COMPROBANTES

    CANTIDAD_COMPROBANTES = TOTAL_COMPROBANTES
    TAMANO_LOTE = 5000

    print(
        f"Generando {CANTIDAD_COMPROBANTES:,} "
        "comprobantes de venta..."
    )

    # Obtener los clientes existentes.
    cur.execute("""
        SELECT id_cliente
        FROM cliente
        ORDER BY id_cliente
    """)

    ids_clientes_comprobante = [
        fila[0] for fila in cur.fetchall()
    ]

    # Obtener las salas de venta existentes.
    cur.execute("""
        SELECT id_sala
        FROM sala_venta
        ORDER BY id_sala
    """)

    ids_salas_comprobante = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_clientes_comprobante:
        raise ValueError(
            "No existen clientes para generar comprobantes."
        )

    if not ids_salas_comprobante:
        raise ValueError(
            "No existen salas para generar comprobantes."
        )

    total_generados = 0

    # Generar e insertar los comprobantes por lotes.
    while total_generados < CANTIDAD_COMPROBANTES:

        cantidad_lote = min(
            TAMANO_LOTE,
            CANTIDAD_COMPROBANTES - total_generados
        )

        comprobantes_lote = []

        for i in range(cantidad_lote):
            # REPRODUCIBILIDAD Y REGLA RN-11
            # La semilla fija permite reproducir los datos sinteticos, sus cantidades y relaciones.
            # Las fechas de transferencias y comprobantes dependen del dia real de ejecucion.
            # Esto se debe a que la RN-11 establece CURRENT_DATE para las transferencias mediante un trigger.
            # Se mantiene date.today() en los comprobantes para conservar la coherencia temporal entre ambas operaciones.
            # No se modifican las reglas compartidas de la Etapa 2.

            fecha_venta = date.today()

            # Distribuir comprobantes entre las salas.
            indice_sala = (
                total_generados + i
            ) % len(ids_salas_comprobante)

            id_sala = ids_salas_comprobante[
                indice_sala
            ]

            id_cliente = random.choice(
                ids_clientes_comprobante
            )

            comprobantes_lote.append((
                datetime.combine(
                    fecha_venta,
                    datetime.min.time()
                ),
                id_cliente,
                id_sala
            ))

        execute_values(
            cur,
            """
            INSERT INTO comprobante
            (
                fecha,
                id_cliente,
                id_sala
            )
            VALUES %s
            """,
            comprobantes_lote,
            page_size=1000
        )

        total_generados += len(comprobantes_lote)

        print(
            f"  Comprobantes insertados: "
            f"{total_generados:,} / "
            f"{CANTIDAD_COMPROBANTES:,}"
        )

    print(
        f"✓ Comprobantes generados: "
        f"{total_generados:,}"
    )

    print(
        f"✓ Clientes disponibles: "
        f"{len(ids_clientes_comprobante):,}"
    )

    print(
        f"✓ Salas participantes: "
        f"{len(ids_salas_comprobante)}"
    )

    # RN-08:
    # Los importes no se calculan manualmente.
    # PostgreSQL inicializa subtotal, descuento y total en cero mediante sus valores DEFAULT.
    # Los triggers de ventas deberán actualizar esos importes cuando se inserten los renglones.
    # IMPORTANTE:
    # Las fechas históricas deberán coordinarse con las fechas de transferencia antes de ejecutar la carga definitiva.



    # 11. AUDITORÍA DE PRECIOS

    cur.execute("""
        SELECT COUNT(*)
        FROM auditoria_precio
    """)

    cantidad_auditorias = cur.fetchone()[0]

    print(
        f"✓ Registros de auditoría existentes: "
        f"{cantidad_auditorias}"
    )

    print("✓ Nivel 2 finalizado")

    """
    Este bloque se encarga de:
    - Consultar los registros de auditoría existentes.
    - Evitar generar auditorías ficticias.
    - Reservar la generación automática para el trigger.
    - Preparar la verificación posterior de cambios de precios.
    """


def procesar_ingresos(cur):
    """
    Cierra y procesa los ingresos de mercadería.

    Utiliza los procedimientos almacenados de Santiago
    para actualizar correctamente el stock del depósito.
    """

    print("\n--- Procesando ingresos de mercadería ---")

    cur.execute("""
        SELECT codigo_ingreso
        FROM ingreso
        WHERE estado = 'en_confeccion'
        ORDER BY codigo_ingreso
    """)

    ingresos_pendientes = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ingresos_pendientes:
        print("No hay ingresos pendientes de procesamiento.")
        return

    procesados = 0

    for codigo_ingreso in ingresos_pendientes:

        # Primero cerramos el ingreso.
        cur.execute(
            "CALL public.sp_terminar_ingreso(%s)",
            (codigo_ingreso,)
        )

        # Después incorporamos su mercadería al depósito.
        cur.execute(
            "CALL public.sp_procesar_ingreso(%s)",
            (codigo_ingreso,)
        )

        procesados += 1

    print(f"✓ Ingresos procesados: {procesados}")

    cur.execute("""
        SELECT COALESCE(SUM(cantidad), 0)
        FROM stock_deposito
    """)

    stock_total = cur.fetchone()[0]

    print(f"✓ Stock total en depósito: {stock_total} botellas")


def procesar_transferencias(cur):
    """
    Cierra y procesa las transferencias.

    Utiliza los procedimientos de Santiago para mover
    mercadería del depósito hacia las salas de venta.
    """

    print("\n--- Procesando transferencias ---")

    cur.execute("""
        SELECT numero_solicitud
        FROM transferencia
        WHERE estado = 'en_confeccion'
        ORDER BY numero_solicitud
    """)

    transferencias_pendientes = [
        fila[0] for fila in cur.fetchall()
    ]

    if not transferencias_pendientes:
        print("No hay transferencias pendientes.")
        return

    procesadas = 0

    for numero_solicitud in transferencias_pendientes:

        # Validar y cerrar la transferencia.
        cur.execute(
            "CALL public.sp_terminar_transferencia(%s)",
            (numero_solicitud,)
        )

        # Descontar stock del depósito y sumarlo a la sala.
        cur.execute(
            "CALL public.sp_procesar_transferencia(%s)",
            (numero_solicitud,)
        )

        procesadas += 1

    print(f"✓ Transferencias procesadas: {procesadas}")

    cur.execute("""
        SELECT COALESCE(SUM(cantidad), 0)
        FROM stock_sala
    """)

    stock_salas = cur.fetchone()[0]

    print(f"✓ Stock total en salas: {stock_salas} botellas")


def generar_carga_nivel_3(cur):
    # NIVEL 3
    """
    Este nivel se encargará de:
    - Generar análisis de calidad de los lotes de uva.
    - Registrar los vinos solicitados en transferencias.
    - Registrar los productos vendidos en comprobantes.
    - Respetar las relaciones con los niveles anteriores.
    """
    print("\n--- Cargando Nivel 3 ---")


    # 1. ANÁLISIS DE CALIDAD

    cur.execute("""
        SELECT nro_lote, fecha_cosecha
        FROM lote_uva
        ORDER BY nro_lote
    """)

    lotes_disponibles = cur.fetchall()

    if not lotes_disponibles:
        raise ValueError(
            "No existen lotes de uva para generar análisis."
        )

    analisis = []

    for nro_lote, fecha_cosecha in lotes_disponibles:

        cantidad_analisis = random.randint(1, 3)

        for _ in range(cantidad_analisis):

            fecha_analisis = (
                fecha_cosecha
                + timedelta(days=random.randint(0, 15))
            )

            grado_brix = Decimal(
                str(round(random.uniform(18, 26), 2))
            )

            ph = Decimal(
                str(round(random.uniform(3.0, 4.0), 2))
            )

            acidez_total = Decimal(
                str(round(random.uniform(4.0, 9.0), 2))
            )

            analisis.append((
                nro_lote,
                fecha_analisis,
                grado_brix,
                ph,
                acidez_total
            ))

    execute_values(
        cur,
        """
        INSERT INTO analisis_calidad
        (
            nro_lote,
            fecha,
            grado_brix,
            ph,
            acidez_total
        )
        VALUES %s
        """,
        analisis,
        page_size=1000
    )

    print(
        f"✓ Análisis de calidad generados: "
        f"{len(analisis)}"
    )

    """
    Este bloque se encarga de:
    - Obtener los lotes de uva existentes.
    - Generar entre 1 y 3 análisis por lote.
    - Registrar fecha, grado Brix, pH y acidez total.
    - Relacionar cada análisis con su lote.
    - Insertar los análisis por lotes.
    """

    # 2. RENGLONES DE TRANSFERENCIA
    # Distribución masiva desde el depósito hacia las salas


    print("Generando renglones de transferencia...")

    # Obtener las transferencias pendientes.
    cur.execute("""
        SELECT numero_solicitud
        FROM transferencia
        WHERE estado = 'en_confeccion'
        ORDER BY numero_solicitud
    """)

    ids_transferencias = [
        fila[0] for fila in cur.fetchall()
    ]

    if not ids_transferencias:
        raise ValueError(
            "No hay transferencias pendientes para completar."
        )

    # Consultar el stock real del depósito.
    cur.execute("""
        SELECT cod_vino, cantidad
        FROM stock_deposito
        WHERE cantidad > 0
        ORDER BY cod_vino
    """)

    stock_disponible = {
        cod_vino: int(cantidad)
        for cod_vino, cantidad in cur.fetchall()
    }

    if not stock_disponible:
        raise ValueError(
            "El depósito no tiene mercadería disponible. "
            "Primero deben procesarse los ingresos."
        )

    renglones_transferencia = []
    total_botellas_transferidas = 0

    # Distribuir mercadería evitando asignar
    # más unidades que las disponibles.
    for numero_solicitud in ids_transferencias:

        vinos_disponibles = [
            cod_vino
            for cod_vino, cantidad in stock_disponible.items()
            if cantidad > 0
        ]

        if not vinos_disponibles:
            raise ValueError(
                "Stock insuficiente para completar todas "
                "las transferencias."
            )

        # Entre 3 y 8 vinos distintos por transferencia,
        # cuando exista suficiente variedad.
        minimo_vinos = min(3, len(vinos_disponibles))
        maximo_vinos = min(8, len(vinos_disponibles))

        cantidad_vinos = random.randint(
            minimo_vinos,
            maximo_vinos
        )

        vinos_elegidos = random.sample(
            vinos_disponibles,
            cantidad_vinos
        )

        for cod_vino in vinos_elegidos:

            cantidad_maxima = min(
                1000,
                stock_disponible[cod_vino]
            )

            cantidad_minima = min(
                100,
                cantidad_maxima
            )

            cantidad_botellas = random.randint(
                cantidad_minima,
                cantidad_maxima
            )

            renglones_transferencia.append((
                numero_solicitud,
                cod_vino,
                cantidad_botellas
            ))

            # Reserva virtual: no modifica PostgreSQL.
            stock_disponible[cod_vino] -= cantidad_botellas

            total_botellas_transferidas += cantidad_botellas

    # Insertar los renglones por lotes.
    execute_values(
        cur,
        """
        INSERT INTO renglon_transferencia
        (
            numero_solicitud,
            cod_vino,
            cantidad
        )
        VALUES %s
        """,
        renglones_transferencia,
        page_size=1000
    )

    print(
        f"✓ Transferencias completadas: "
        f"{len(ids_transferencias)}"
    )

    print(
        f"✓ Renglones de transferencia: "
        f"{len(renglones_transferencia)}"
    )

    print(
        f"✓ Botellas asignadas a las salas: "
        f"{total_botellas_transferidas:,}"
    )

    # Ejecutar los procedimientos almacenados.
    # Descontarán las botellas del depósito
    # y las incorporarán al stock de cada sala.
    procesar_transferencias(cur)

    print(
        "✓ Transferencias procesadas correctamente"
    )



    # 3. RENGLONES DE COMPROBANTE - CARGA MASIVA

    OBJETIVO_COMPROBANTES = TOTAL_COMPROBANTES
    OBJETIVO_RENGLONES = TOTAL_RENGLONES

    print("Preparando la carga masiva de ventas...")

    # Consultar el stock disponible por sala y vino.
    cur.execute("""
        SELECT id_sala, cod_vino, cantidad
        FROM stock_sala
        WHERE cantidad > 0
        ORDER BY id_sala, cod_vino
    """)

    stock_restante = {}

    for id_sala, cod_vino, cantidad in cur.fetchall():
        stock_restante.setdefault(id_sala, {})
        stock_restante[id_sala][cod_vino] = int(cantidad)

    if not stock_restante:
        raise ValueError(
            "No hay stock en las salas para generar ventas."
        )

    # Consultar los comprobantes existentes.
    cur.execute("""
        SELECT numero_comprobante, id_cliente, id_sala
        FROM comprobante
        ORDER BY numero_comprobante
    """)

    comprobantes = cur.fetchall()


    if len(comprobantes) != OBJETIVO_COMPROBANTES:
        raise ValueError(
            f"Se esperaban {OBJETIVO_COMPROBANTES:,} "
            f"comprobantes y se encontraron "
            f"{len(comprobantes):,}."
        )


    # VALIDACIÓN PREVIA DEL STOCK PARA VENTAS MASIVAS

    print("\n--- Validando stock disponible por sala ---")

    demanda_por_sala = {}

    for indice, (numero_comprobante, id_cliente, id_sala) in enumerate(comprobantes):

        cantidad_vinos = 4 if indice < (TOTAL_RENGLONES - 3 * TOTAL_COMPROBANTES) else 3

        demanda_por_sala[id_sala] = (
            demanda_por_sala.get(id_sala, 0) + cantidad_vinos
        )

    for id_sala, botellas_necesarias in sorted(demanda_por_sala.items()):

        vinos_sala = stock_restante.get(id_sala, {})

        stock_total = sum(vinos_sala.values())

        variedades_disponibles = sum(
            cantidad > 0 for cantidad in vinos_sala.values()
        )

        print(
            f"Sala {id_sala}: "
            f"stock={stock_total:,}, "
            f"necesario={botellas_necesarias:,}, "
            f"variedades={variedades_disponibles}"
        )

        if stock_total < botellas_necesarias:
            raise ValueError(
                f"Stock insuficiente en sala {id_sala}. "
                f"Disponible: {stock_total:,}. "
                f"Necesario: {botellas_necesarias:,}."
            )

        if variedades_disponibles < 4:
            raise ValueError(
                f"La sala {id_sala} tiene solamente "
                f"{variedades_disponibles} vinos con stock. "
                "Se necesitan al menos 4 variedades."
            )

    print("✓ Validación inicial de stock completada")


    # Consultar precios de los vinos.
    cur.execute("""
        SELECT cod_vino, precio
        FROM vino
        ORDER BY cod_vino
    """)

    precios_vinos = {
        cod_vino: precio
        for cod_vino, precio in cur.fetchall()
    }

    # Planificación de los renglones.
    # No se modificará el stock real hasta que
    # intervengan los triggers correspondientes.
    renglones_comprobante = []

    total_botellas_asignadas = 0
    total_comprobantes_completados = 0

    for indice, (
        numero_comprobante,
        id_cliente,
        id_sala
    ) in enumerate(comprobantes):

        # 50.000 comprobantes con 4 vinos.
        # 100.000 comprobantes con 3 vinos.
        cantidad_vinos = 4 if indice < (TOTAL_RENGLONES - 3 * TOTAL_COMPROBANTES) else 3

        vinos_sala = stock_restante.get(id_sala, {})

        vinos_disponibles = [
            cod_vino
            for cod_vino, cantidad in vinos_sala.items()
            if cantidad > 0
        ]

        # No dejar comprobantes vacíos.
        if len(vinos_disponibles) < cantidad_vinos:
            raise ValueError(
                f"Stock o variedad insuficiente en "
                f"la sala {id_sala} para completar "
                f"el comprobante {numero_comprobante}. "
                f"Se necesitan {cantidad_vinos} vinos "
                f"distintos y hay "
                f"{len(vinos_disponibles)} disponibles."
            )

        vinos_elegidos = random.sample(
            vinos_disponibles,
            cantidad_vinos
        )

        for cod_vino in vinos_elegidos:

            if cod_vino not in precios_vinos:
                raise ValueError(
                    f"No se encontró el precio "
                    f"del vino {cod_vino}."
                )

            cantidad = 1
            precio_unitario = precios_vinos[cod_vino]

            # Preparar los datos básicos.
            # Los descuentos y subtotales deberán
            # calcularse mediante la lógica de la BD.
            renglones_comprobante.append((
                numero_comprobante,
                cod_vino,
                cantidad,
                precio_unitario
            ))

            # Reserva virtual de una botella.
            vinos_sala[cod_vino] -= cantidad

            total_botellas_asignadas += cantidad

        total_comprobantes_completados += 1

        if total_comprobantes_completados % 25000 == 0:
            print(
                f"  Ventas preparadas: "
                f"{total_comprobantes_completados:,} / "
                f"{OBJETIVO_COMPROBANTES:,}"
            )

    # Validaciones finales de la planificación.
    if len(renglones_comprobante) != OBJETIVO_RENGLONES:
        raise ValueError(
            f"Se esperaban {OBJETIVO_RENGLONES:,} "
            f"renglones y se prepararon "
            f"{len(renglones_comprobante):,}."
        )

    if total_comprobantes_completados != OBJETIVO_COMPROBANTES:
        raise ValueError(
            "Quedaron comprobantes sin completar."
        )

    print(
        f"✓ Comprobantes preparados: "
        f"{total_comprobantes_completados:,}"
    )

    print(
        f"✓ Renglones preparados: "
        f"{len(renglones_comprobante):,}"
    )

    print(
        f"✓ Botellas asignadas virtualmente: "
        f"{total_botellas_asignadas:,}"
    )

    # INSERCION MASIVA DE RENGLONES DE COMPROBANTE

    TAMANO_LOTE_VENTAS = 1000
    total_insertados = 0

    print("\nIniciando insercion masiva de ventas...")

    for inicio in range(0, len(renglones_comprobante), TAMANO_LOTE_VENTAS):

        lote = renglones_comprobante[
            inicio:inicio + TAMANO_LOTE_VENTAS
        ]

        execute_values(
            cur,
            """
            INSERT INTO renglon_comprobante (
                numero_comprobante,
                cod_vino,
                cantidad,
                precio_unitario
            )
            VALUES %s
            """,
            lote,
            page_size=TAMANO_LOTE_VENTAS
        )

        total_insertados += len(lote)

        if total_insertados % 25000 == 0:
            print(
                f"  Renglones insertados: "
                f"{total_insertados:,} / "
                f"{OBJETIVO_RENGLONES:,}"
            )

    if total_insertados != OBJETIVO_RENGLONES:
        raise ValueError(
            "No se alcanzó el objetivo de renglones."
        )

    print(
        f"✓ Renglones insertados: {total_insertados:,}"
    )

    # Los triggers de PostgreSQL calculan importes,
    # descuentos y actualizan los stocks.
    # No realizamos esos cálculos manualmente.

    print("✓ Insercion masiva de ventas finalizada")

    print(
        "✓ Nivel 3: planificación de ventas finalizada"
    )


def validar_carga_masiva(cur):
    """Verifica cantidades, stocks y totales de la carga."""

    print("\n--- VALIDACIÓN DE CARGA MASIVA ---")

    tablas = [
        "localidad", "sala_venta", "empleado",
        "bodega", "cepa", "finca", "parcela",
        "lote_uva", "analisis_calidad", "vino",
        "composicion_vino", "maridaje",
        "vino_maridaje", "cliente",
        "cliente_socio", "cliente_distribuidor",
        "cliente_exportador", "permiso_exportacion",
        "transportista", "transportista_cobertura",
        "stock_deposito", "ingreso",
        "renglon_ingreso", "transferencia",
        "renglon_transferencia", "stock_sala",
        "comprobante", "renglon_comprobante",
        "auditoria_precio"
    ]

    conteos = {}

    for tabla in tablas:
        cur.execute(f"SELECT COUNT(*) FROM public.{tabla}")
        cantidad = cur.fetchone()[0]
        conteos[tabla] = cantidad
        print(f"{tabla}: {cantidad:,} registros")

    # La auditoría es especial: solo tendrá registros si hubo cambios de precio.
    for tabla, cantidad in conteos.items():
        if tabla != "auditoria_precio" and cantidad == 0:
            raise ValueError(
                f"La tabla {tabla} quedó vacía."
            )



    objetivo_comprobantes = TOTAL_COMPROBANTES
    objetivo_renglones = TOTAL_RENGLONES
    modo_prueba = MODO_PRUEBA

    # Verificar cantidades esperadas.
    if conteos["comprobante"] != objetivo_comprobantes:
        raise ValueError(
            f"Se esperaban {objetivo_comprobantes} comprobantes."
        )

    if conteos["renglon_comprobante"] != objetivo_renglones:
        raise ValueError(
            f"Se esperaban {objetivo_renglones} renglones."
        )

    # RN-09 y RN-11: stocks no negativos.
    for tabla in ("stock_sala", "stock_deposito"):
        cur.execute(
            f"SELECT COUNT(*) FROM public.{tabla} "
            "WHERE cantidad < 0"
        )

        if cur.fetchone()[0] != 0:
            raise ValueError(
                f"Se detectó stock negativo en {tabla}."
            )


    # RN-08: verificar los importes almacenados.
    cur.execute("""
        SELECT COUNT(*)
        FROM public.comprobante c
        LEFT JOIN (
            SELECT
                numero_comprobante,
                SUM(cantidad * precio_unitario) AS bruto,
                SUM(descuento) AS descuento,
                SUM(subtotal) AS neto
            FROM public.renglon_comprobante
            GROUP BY numero_comprobante
        ) r USING (numero_comprobante)
        WHERE c.subtotal <> COALESCE(r.bruto, 0)
           OR c.descuento <> COALESCE(r.descuento, 0)
           OR c.total <> COALESCE(r.neto, 0)
    """)

    inconsistencias = cur.fetchone()[0]

    if inconsistencias > 0:
        raise ValueError(
            f"Hay {inconsistencias} comprobantes "
            "con importes inconsistentes."
        )



    # Validar los mínimos generales.
    tablas_mayores_10000 = sum(
        cantidad > 10000 for cantidad in conteos.values()
    )

    if modo_prueba:
        print(
            "\n✓ Modo prueba reducido: "
            "se omite únicamente el mínimo de volumen definitivo."
        )
    else:
        if tablas_mayores_10000 < 3:
            raise ValueError(
                "Menos de tres tablas superan 10.000 filas."
            )

        if max(conteos.values()) <= 100000:
            raise ValueError(
                "Ninguna tabla supera 100.000 filas."
            )


    print("\n✓ Conteos mínimos verificados")
    print("✓ Stocks no negativos")
    print("✓ Importes de comprobantes consistentes")


    # VALIDACIONES DE INTEGRIDAD REFERENCIAL
    print("\n--- Validando integridad referencial ---")

    controles = {
        "Comprobantes sin cliente": """
            SELECT COUNT(*)
            FROM comprobante c
            LEFT JOIN cliente cl
                ON c.id_cliente = cl.id_cliente
            WHERE cl.id_cliente IS NULL
        """,

        "Renglones sin comprobante": """
            SELECT COUNT(*)
            FROM renglon_comprobante r
            LEFT JOIN comprobante c
                ON r.numero_comprobante = c.numero_comprobante
            WHERE c.numero_comprobante IS NULL
        """,

        "Transferencias sin sala": """
            SELECT COUNT(*)
            FROM transferencia t
            LEFT JOIN sala_venta s
                ON t.id_sala = s.id_sala
            WHERE s.id_sala IS NULL
        """,

        "Lotes sin parcela": """
            SELECT COUNT(*)
            FROM lote_uva l
            LEFT JOIN parcela p
                ON l.id_finca = p.id_finca
               AND l.nro_parcela = p.nro_parcela
            WHERE p.id_finca IS NULL
        """,

        "Composiciones incorrectas": """
            SELECT COUNT(*)
            FROM (
                SELECT v.cod_vino
                FROM vino v
                LEFT JOIN composicion_vino c
                    ON v.cod_vino = c.cod_vino
                GROUP BY v.cod_vino
                HAVING COALESCE(SUM(c.porcentaje), 0) <> 100
            ) inconsistencias
        """
    }

    for nombre, consulta in controles.items():
        cur.execute(consulta)
        cantidad = cur.fetchone()[0]

        print(f"{nombre}: {cantidad}")

        if cantidad != 0:
            raise ValueError(
                f"Validacion fallida: {nombre}"
            )

    print("✓ Integridad referencial correcta")

    print("✓ Validación final completada")


def verificar_base_vacia(cur):
    """
    Verifica que todas las tablas del esquema public estén vacías.
    Evita ejecutar la carga sobre una base con datos previos,
    incluso cuando existan registros en tablas secundarias.
    """

    print("\n--- Verificando base de datos ---")

    cur.execute("""
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    """)

    tablas = [fila[0] for fila in cur.fetchall()]

    if not tablas:
        raise ValueError(
            "No se encontraron tablas en el esquema public. "
            "Primero deben ejecutarse las migraciones."
        )

    from psycopg2 import sql

    for tabla in tablas:
        consulta = sql.SQL(
            "SELECT EXISTS (SELECT 1 FROM {}.{})"
        ).format(
            sql.Identifier("public"),
            sql.Identifier(tabla)
        )

        cur.execute(consulta)

        if cur.fetchone()[0]:
            raise ValueError(
                f"La tabla {tabla} ya contiene datos. "
                "La carga masiva requiere una base vacía."
            )

    print(
        f"✓ Base preparada: {len(tablas)} tablas verificadas"
    )


def probar_auditoria_precio(cur):
    """Genera y comprueba un cambio de precio auditado."""

    print("\n--- Verificando auditoría de precios ---")

    cur.execute("""
        SELECT cod_vino
        FROM vino
        ORDER BY cod_vino
        LIMIT 1
    """)

    fila = cur.fetchone()

    if not fila:
        raise ValueError("No existen vinos para auditar.")

    cod_vino = fila[0]

    cur.execute("""
        UPDATE vino
        SET precio = precio + 100
        WHERE cod_vino = %s
    """, (cod_vino,))

    cur.execute("""
        SELECT COUNT(*)
        FROM auditoria_precio
        WHERE cod_vino = %s
    """, (cod_vino,))

    cantidad = cur.fetchone()[0]

    if cantidad == 0:
        raise ValueError(
            "El trigger no generó la auditoría."
        )

    print("✓ Auditoría de precios correcta")



def ejecutar_carga_masiva():
    print("\n=== INICIANDO CARGA MASIVA ===")

    try:
        reiniciar_generadores()

        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:

                # Verificar que no existan datos previos.
                verificar_base_vacia(cur)

                # Cargar catálogos y entidades iniciales.
                generar_carga_nivel_0(cur)
                generar_carga_nivel_1(cur)

                # Comprobar auditoría de precios.
                probar_auditoria_precio(cur)

                # Generar producción, movimientos y comprobantes.
                generar_carga_nivel_2(cur)

                # Abastecer el depósito central.
                procesar_ingresos(cur)

                # Completar transferencias y ventas.
                generar_carga_nivel_3(cur)

                # Verificar integridad antes de guardar.
                validar_carga_masiva(cur)

                # Confirmar los cambios.
                conn.commit()

        print("\n✓ CARGA MASIVA COMPLETADA")
        print("✓ Datos confirmados en PostgreSQL")
        print("✓ Validaciones ejecutadas correctamente")

    except Exception as e:
        print("\n❌ ERROR DURANTE LA CARGA MASIVA")
        print(f"Detalle: {e}")
        print("La operación no se completó correctamente.")
        sys.exit(1)


if __name__ == "__main__":
    ejecutar_carga_masiva()
