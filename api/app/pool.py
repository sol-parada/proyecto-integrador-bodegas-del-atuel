from psycopg2.pool import ThreadedConnectionPool

from app.config import settings


_pool: ThreadedConnectionPool | None = None


def initialize_pool() -> None:
    global _pool

    if _pool is None:
        _pool = ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dbname=settings.db_name,
            user=settings.db_user,
            password=settings.db_password,
            host=settings.db_host,
            port=settings.db_port,
        )


def close_pool() -> None:
    global _pool

    if _pool is not None:
        _pool.closeall()
        _pool = None


def get_connection():
    if _pool is None:
        raise RuntimeError("El pool de conexiones no fue inicializado")

    return _pool.getconn()


def release_connection(connection) -> None:
    if _pool is None:
        connection.close()
        return

    _pool.putconn(connection)