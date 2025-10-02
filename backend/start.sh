#!/bin/bash

echo "Starting NoGoon Backend..."
echo "Port: ${PORT:-8000}"
echo "Environment: ${ENVIRONMENT:-development}"

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
echo "Host: :: (IPv6 - Railway v2 requirement)"
echo "Port: ${PORT:-8000}"
echo "Log level: info"

# Start the server with IPv6 support for Railway v2
exec uvicorn main:app \
    --host :: \
    --port ${PORT:-8000} \
    --log-level info \
    --access-log \
    --no-use-colors