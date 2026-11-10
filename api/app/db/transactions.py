from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from app.pool import get_connection, release_connection


@contextmanager
def transaction() -> Iterator[Any]:
    connection = get_connection()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        release_connection(connection)
