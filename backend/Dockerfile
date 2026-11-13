FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Tesseract (OCR de imágenes de facturas) + datos del idioma español, que es el que usa el código ("spa").
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-spa \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Primero solo las dependencias: mientras requirements.txt no cambie, esta capa queda en caché.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Sin root. Las carpetas donde se guardan las facturas subidas se montan como volúmenes (docker-compose.yml).
RUN useradd --system --create-home app \
    && mkdir -p facturas facturas_pdf \
    && chown -R app:app /app
USER app

EXPOSE 8000

# Aplica las migraciones y arranca la API.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn main:app --host 0.0.0.0 --port 8000"]
