#!/bin/bash
echo "🎨 Booting Next.js Kitchen UI on http://127.0.0.1:3004 ..."
cd "$(dirname "$0")/frontend"

if [ ! -f .env.local ]; then
  echo "⚠️  No frontend/.env.local found. Copy from .env.example and set NEXT_PUBLIC_API_URL / NEXT_PUBLIC_TENANT_ID."
fi

npm run dev
