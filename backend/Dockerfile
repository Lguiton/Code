FROM python:3.12-slim

WORKDIR /srv/app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
RUN mkdir -p uploads

EXPOSE 8000

# ENVIRONMENT=prod etc. must be provided at runtime (env_file / -e).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
