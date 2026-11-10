#!/bin/bash
# =============================================================================
# BODEGAS DEL ATUEL - Ejecución de las pruebas SQL de la etapa 2
#
# Ejecuta los scripts de prueba sobre la base indicada y resume el resultado.
# Todos los scripts terminan con ROLLBACK: no dejan datos de prueba.
#
#   docker compose exec -T db bash /pruebas/ejecutar_pruebas.sh
# =============================================================================

set -uo pipefail

DB_NAME="${POSTGRES_DB:-bodegas_atuel}"
DB_USER="${POSTGRES_USER:-postgres}"
PGPASSWORD="${POSTGRES_PASSWORD:-}"
export PGPASSWORD

# Los scripts SQL con los fixtures viven en database/tests.
DIR="${DIR_PRUEBAS:-/pruebas}"

fallos=0

ejecutar() {
    local nombre="$1"
    shift

    echo ""
    echo "============================================================"
    echo "  $nombre"
    echo "============================================================"

    local salida
    salida="$(psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -f "$@" 2>&1)"
    local codigo=$?

    echo "$salida" | grep -E "NOTICE:|ERROR:" | sed 's/^/  /'

    if [ $codigo -ne 0 ]; then
        echo "  RESULTADO: FALLO"
        fallos=$((fallos + 1))
    else
        echo "  RESULTADO: OK"
    fi
}

# Los fixtures de datos se ejecutan juntos dentro de una sola transaccion:
# consultas_fixture.sql necesita los datos que prepara pruebas_etapa2.sql.
# El ROLLBACK final va aca para que ninguno quede en la base.
echo "============================================================"
echo "  FIXTURES DE DATOS DE PRUEBA"
echo "============================================================"

{
    echo "BEGIN;"
    cat "$DIR/pruebas_etapa2.sql"
    cat "$DIR/consultas_fixture.sql"
    echo "ROLLBACK;"
} | psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" 2>&1 | grep -E "NOTICE:|ERROR:" | sed 's/^/  /'

if [ "${PIPESTATUS[1]}" -ne 0 ]; then
    echo "  RESULTADO: FALLO"
    fallos=$((fallos + 1))
else
    echo "  RESULTADO: OK"
fi

ejecutar "REGLAS DE NEGOCIO RN-01 a RN-15" "$DIR/reglas_negocio_etapa2.sql"
ejecutar "SUITE DE PRUEBAS DE ETAPA 2" "$DIR/pruebas_etapa2.sql"

echo ""
echo "============================================================"
if [ $fallos -eq 0 ]; then
    echo "  TODAS LAS PRUEBAS SQL PASARON"
else
    echo "  $fallos PRUEBA(S) CON FALLOS"
fi
echo "============================================================"

exit $fallos
