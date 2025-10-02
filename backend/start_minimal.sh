#!/bin/bash

echo "Starting Minimal Health Check Server..."
echo "Port: ${PORT:-8000}"
echo "Environment: ${ENVIRONMENT:-development}"

echo "Starting minimal uvicorn server..."
echo "Host: :: (IPv6 - Railway v2 requirement)"
echo "Port: ${PORT:-8000}"
echo "Log level: info"

# Start the minimal server with IPv6 support for Railway v2
exec uvicorn minimal_server:app \
    --host :: \
    --port ${PORT:-8000} \
    --log-level info \
    --access-log \
    --no-use-colors
