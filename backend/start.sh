#!/bin/bash

echo "Starting NoGoon Backend..."
echo "Port: ${PORT:-8000}"
echo "Environment: ${ENVIRONMENT:-development}"
echo "Python version: $(python3 --version)"
echo "Current directory: $(pwd)"
echo "Files in directory: $(ls -la | wc -l) files"

# Minimal environment check
echo "Checking environment variables..."
if [ -n "$DATABASE_URL" ]; then
    echo "✓ DATABASE_URL is set"
else
    echo "⚠ DATABASE_URL not set (will use SQLite)"
fi

if [ -n "$PRIVY_APP_ID" ]; then
    echo "✓ PRIVY_APP_ID is set"
else
    echo "⚠ PRIVY_APP_ID not set"
fi

echo "Starting uvicorn server..."
echo "Host: 0.0.0.0"
echo "Port: ${PORT:-8000}"
echo "Log level: info"

# Start the server
exec uvicorn main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --log-level info \
    --access-log \
    --no-use-colors