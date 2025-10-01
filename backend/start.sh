#!/bin/bash

echo "Starting NoGoon Backend..."
echo "Port: ${PORT:-8000}"
echo "Environment variables:"
env | grep -E "(PORT|DATABASE|PRIVY|SECRET)" || echo "No relevant env vars found"

echo "Testing import..."
python -c "import main; print('Import successful')" || echo "Import failed"

echo "Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info