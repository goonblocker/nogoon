#!/bin/bash

echo "Starting Minimal Health Check Server..."
echo "Port: ${PORT:-8000}"
echo "Environment: ${ENVIRONMENT:-development}"

echo "Starting minimal uvicorn server..."
echo "Host: 0.0.0.0"
echo "Port: ${PORT:-8000}"
echo "Log level: info"

# Start the minimal server
exec uvicorn minimal_server:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --log-level info \
    --access-log \
    --no-use-colors
