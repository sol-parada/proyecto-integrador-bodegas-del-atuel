# =============================================================================
# BODEGAS DEL ATUEL - API REST
# Imagen de la API (FastAPI + psycopg2) para Docker.
# =============================================================================

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

# Dependencias primero: se aprovechan las capas de Docker al recompilar.
COPY pyproject.toml ./
RUN pip install --upgrade pip \
    && pip install \
        "fastapi>=0.162.2" \
        "psycopg2-binary>=2.9.13" \
        "python-dotenv>=1.2.4" \
        "uvicorn[standard]>=0.54.0"

# Código de la API.
COPY api ./api

EXPOSE 8000

# La API espera a que PostgreSQL esté listo: compose healthcheck + depends_on.
CMD ["uvicorn", "app.main:app", "--app-dir", "/srv/api", "--host", "0.0.0.0", "--port", "8000"]
