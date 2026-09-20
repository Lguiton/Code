#!/bin/bash
set -e
echo "🚀 Booting FastAPI Backend..."
cd "$(dirname "$0")/backend"

# Load backend/.env if present (copy from .env.example first)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ ! -d venv ]; then
  echo "⚠️  No venv found. Create it with: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
