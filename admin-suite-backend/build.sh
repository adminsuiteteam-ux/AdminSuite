#!/usr/bin/env bash
# Exit on critical errors (pip install and collectstatic)
set -o errexit

echo "==> [1/4] Installing dependencies..."
pip install -r requirements.txt

echo "==> [2/4] Downloading mobile APK build (non-fatal)..."
python download_apk_build.py || echo "Warning: APK download skipped or failed, continuing deployment..."

echo "==> [3/4] Collecting static files..."
python manage.py collectstatic --no-input

echo "==> [4/4] Running database migrations..."
if python manage.py migrate; then
    echo "==> Migrations applied successfully."
    echo "==> Ensuring admin account..."
    python manage.py ensure_admin || echo "Warning: ensure_admin encountered an issue."
else
    echo "=========================================================================="
    echo "CRITICAL ERROR: Database migration failed!"
    echo "Please verify DATABASE_URL in your Render Dashboard -> Environment."
    echo "=========================================================================="
    exit 1
fi

echo "==> Build finished successfully!"
