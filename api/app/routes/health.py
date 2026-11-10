from fastapi import APIRouter, HTTPException

from app.pool import get_connection, release_connection

router = APIRouter(tags=["salud"])


@router.get("/salud")
def health_check() -> dict[str, str]:
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()

        return {"estado": "ok", "base_de_datos": "conectada"}
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="La base de datos no está disponible",
        ) from error
    finally:
        release_connection(connection)