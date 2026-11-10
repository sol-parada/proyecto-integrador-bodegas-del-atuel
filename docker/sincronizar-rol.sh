#!/bin/bash
# =============================================================================
# BODEGAS DEL ATUEL - Sincronización del rol de la API
#
# Se ejecuta al arrancar, una vez que la base está sana. Sincroniza la
# contraseña del rol app_api con la variable de entorno API_DB_PASSWORD.
#
# Motivo: si la contraseña del rol queda desincronizada con el .env, la API
# entra en loop de reinicio con "password authentication failed" y el
# proyecto no levanta. Este paso lo evita siempre.
#
# Es idempotente: se puede ejecutar cuantas veces se quiera.
# =============================================================================

set -euo pipefail

DB_NAME="${POSTGRES_DB:-bodegas_atuel}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"
API_USER="${API_DB_USER:-app_api}"
API_PASSWORD="${API_DB_PASSWORD:-}"

if [ -z "$API_PASSWORD" ]; then
    echo "==> API_DB_PASSWORD no esta definida. Se omite la sincronizacion del rol."
    exit 0
fi

# psql necesita la contrasena del propietario para conectarse.
# Se pasa en cada llamada porque algunas versiones de psql ignoran el
# PGPASSWORD exportado si la conexion usa un host de red.
export PGPASSWORD="$DB_PASSWORD"

# Espera a que PostgreSQL acepte conexiones.
for intento in $(seq 1 30); do
    if pg_isready -h db -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Si el rol no existe todavia (base recien creada sin esquema), se crea.
existe="$(psql -h db -U "$DB_USER" -d "$DB_NAME" -tAc \
    "SELECT COUNT(*) FROM pg_roles WHERE rolname='${API_USER}'")"

if [ "$existe" = "0" ]; then
    echo "==> Creando el rol ${API_USER}."
    psql -h db -U "$DB_USER" -d "$DB_NAME" \
        -c "CREATE ROLE \"${API_USER}\" LOGIN PASSWORD '${API_PASSWORD}'" > /dev/null
else
    # Sincroniza la contrasena con la del entorno.
    psql -h db -U "$DB_USER" -d "$DB_NAME" \
        -c "ALTER ROLE \"${API_USER}\" WITH LOGIN PASSWORD '${API_PASSWORD}'" > /dev/null
fi

echo "==> Rol ${API_USER} sincronizado."
