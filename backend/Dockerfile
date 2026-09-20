FROM python:3.12-slim

WORKDIR /srv/app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
RUN mkdir -p uploads

EXPOSE 8000

# ENVIRONMENT=prod etc. must be provided at runtime (env_file / -e).
# Migrations run before the server starts; AUTO_CREATE_TABLES stays off
# in any image built from this Dockerfile.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
