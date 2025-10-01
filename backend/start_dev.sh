#!/bin/bash

# Quick start script for local development

set -e

echo "🚀 Starting NoGoon Backend (Development Mode)"
echo "=============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Run ./setup_local.sh first"
    exit 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Run ./setup_local.sh first"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check database connection
echo "Checking database connection..."
python init_db.py check || {
    echo "⚠️  Database connection failed. Server will start anyway."
    echo "   You can test endpoints, but database operations will fail."
}

# Start the server
echo ""
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "   - API docs: http://localhost:8000/docs"
echo "   - Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python main.py

