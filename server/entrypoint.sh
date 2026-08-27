#!/bin/sh
set -e

echo "================================================="
echo "  CDC DA NANG - ASSET MANAGEMENT SYSTEM (QLTS)  "
echo "================================================="

# Check and validate DATABASE_URL
case "$DATABASE_URL" in
  postgresql://*|postgres://*)
    echo "[Database] Valid PostgreSQL connection detected."
    ;;
  *)
    echo "[WARNING] DATABASE_URL is not set or not a valid PostgreSQL URL."
    echo "[WARNING] Current value: '$DATABASE_URL'"
    echo "[WARNING] Please set DATABASE_URL in Coolify Environment Variables to:"
    echo "          postgresql://<username>:<password>@<host>:5432/<dbname>?schema=public"
    echo "[INFO] Using default fallback connection..."
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qlts?schema=public"
    ;;
esac

# Auto-push database schema to PostgreSQL
echo "[Database] Syncing schema with PostgreSQL (prisma db push)..."
if npx prisma db push --skip-generate --accept-data-loss; then
  echo "[Database] Schema sync successful!"
else
  echo "[WARNING] Prisma schema sync encountered an issue. Starting server anyway..."
fi

echo "[Server] Starting QLTS Express server..."
exec node dist/src/index.js
