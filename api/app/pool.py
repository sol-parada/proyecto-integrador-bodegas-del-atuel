from psycopg2.pool import ThreadedConnectionPool

from app.config import settings


_pool: ThreadedConnectionPool | None = None


def initialize_pool() -> None:
    global _pool

    if _pool is None:
        _pool = ThreadedConnectionPool(
            minconn=settings.pool_min,
            maxconn=settings.pool_max,
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
    """
    Devuelve la conexion al pool.

    Se descarta cualquier transaccion pendiente: si queda una abierta, la
    conexion vuelve al pool en estado 'idle in transaction' y bloquea a
    otros usuarios hasta que se libere.
    """

    try:
        if not connection.closed:
            connection.rollback()
    except Exception:
        connection.close()
        return

    if _pool is None:
        connection.close()
        return

    _pool.putconn(connection)