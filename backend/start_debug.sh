#!/bin/bash

echo "=== DEBUG STARTUP SCRIPT ==="
echo "Starting debug server..."
echo "Port: ${PORT:-8000}"
echo "Environment: ${ENVIRONMENT:-development}"
echo "Working directory: $(pwd)"
echo "Python version: $(python3 --version)"

echo ""
echo "=== TESTING PYTHON SCRIPT ==="
python3 debug_startup.py
