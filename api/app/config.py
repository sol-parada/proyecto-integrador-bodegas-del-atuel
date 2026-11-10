import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    db_name: str = os.getenv("POSTGRES_DB", "bodegas_atuel")
    db_user: str = os.getenv("POSTGRES_USER", "postgres")
    db_password: str = os.getenv("POSTGRES_PASSWORD", "")
    db_host: str = os.getenv("DB_HOST", "127.0.0.1")
    db_port: int = int(os.getenv("POSTGRES_PORT", "5432"))


settings = Settings()