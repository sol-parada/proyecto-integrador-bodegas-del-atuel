from collections.abc import Iterator
from typing import Any

from app.pool import get_connection, release_connection


def get_db_connection() -> Iterator[Any]:
    connection = get_connection()
    try:
        yield connection
    finally:
        try:
            if not connection.closed:
                connection.rollback()
        finally:
            release_connection(connection)
