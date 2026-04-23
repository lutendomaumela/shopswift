#!/bin/sh
# start.sh — Robust startup script for the API container

echo "⏳ Waiting for PostgreSQL to be ready..."

until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(os.getenv('DATABASE_URL'))
    print('✅ PostgreSQL is ready!')
except Exception as e:
    print(f'   Not ready yet: {e}')
    sys.exit(1)
" ; do
  echo "   Retrying in 2 seconds..."
  sleep 2
done

echo "📦 Running database migrations..."

if [ ! -f "migrations/env.py" ]; then
  echo "   Initialising migrations folder..."
  flask db init
fi

flask db migrate -m "auto" 2>/dev/null || echo "   No new migrations needed."
flask db upgrade

# ── Seeding ───────────────────────────────────────────────────────────────
# REMOVED: 2>/dev/null — we want to SEE errors, not hide them
# REMOVED: || echo "Already seeded" — the script handles this itself now
# The seed script uses get_or_create so it is safe to run every startup
echo "🌱 Seeding database..."
python seed_products.py

echo "🚀 Starting API server..."
gunicorn --bind 0.0.0.0:5000 --workers 2 --reload "src.app:create_app()"