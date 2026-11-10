import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    """
    Configuracion de la API.

    La API se conecta con un rol de lectura/escritura de privilegios
    minimos (app_api), nunca con el propietario de la base. La password
    viaja por variable de entorno: en el repositorio solo queda el
    .env.example con valores de ejemplo.
    """

    db_name: str = os.getenv("POSTGRES_DB", "bodegas_atuel")
    db_user: str = os.getenv("API_DB_USER", "app_api")
    db_password: str = os.getenv("API_DB_PASSWORD", "")
    db_host: str = os.getenv("DB_HOST", "127.0.0.1")
    db_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    pool_min: int = int(os.getenv("API_POOL_MIN", "1"))
    pool_max: int = int(os.getenv("API_POOL_MAX", "10"))


settings = Settings()
