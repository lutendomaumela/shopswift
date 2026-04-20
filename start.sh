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

# Fix: check for env.py specifically, not just the folder
# The folder exists (created in Dockerfile) but may be empty
if [ ! -f "migrations/env.py" ]; then
  echo "   Initialising migrations folder..."
  flask db init
fi

# Generate migration script from current models
flask db migrate -m "auto" 2>/dev/null || echo "   No new migrations needed."

# Apply migrations to the database
flask db upgrade

echo "🌱 Seeding database..."
python seed_products.py 2>/dev/null || echo "   Already seeded, skipping."

echo "🚀 Starting API server..."
gunicorn --bind 0.0.0.0:5000 --workers 2 --reload "src.app:create_app()"