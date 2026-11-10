#!/bin/bash
# =============================================================================
# BODEGAS DEL ATUEL - Inicialización de la base
#
# Se ejecuta automáticamente la PRIMERA VEZ que PostgreSQL crea el volumen,
# a través de /docker-entrypoint-initdb.d/. Aplica las migraciones en orden
# y deja la base con el esquema completo y el rol de la API configurado.
#
# Es idempotente: si el esquema ya existe, no hace nada.
# =============================================================================

set -euo pipefail

DB_NAME="${POSTGRES_DB:-bodegas_atuel}"
DB_USER="${POSTGRES_USER:-postgres}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-/migrations}"

# Durante la inicializacion, PostgreSQL todavia acepta conexiones locales
# sin password, pero psql la pide si hay PGPASSWORD definida.
export PGPASSWORD="${POSTGRES_PASSWORD:-}"

echo "==> Aplicando migraciones en ${DB_NAME}"

for archivo in "${MIGRATIONS_DIR}"/0*.sql; do
    [ -e "$archivo" ] || continue

    nombre="$(basename "$archivo")"

    # Si el esquema ya esta completo, no se vuelve a aplicar.
    if [ "$nombre" = "001_esquema.sql" ]; then
        existe="$(psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='vino'")"

        if [ "$existe" != "0" ]; then
            echo "==> El esquema ya existe. Se omite la inicialización."
            exit 0
        fi
    fi

    echo "    - $nombre"
    psql -v ON_ERROR_STOP=1 \
         -v api_password="${API_DB_PASSWORD:-}" \
         -U "$DB_USER" -d "$DB_NAME" \
         -f "$archivo" > /dev/null
done

echo "==> Base inicializada correctamente."
