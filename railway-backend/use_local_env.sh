#!/bin/bash
# Script to use local environment configuration

echo "Switching to local development environment..."

# Backup current .env if it exists
if [ -f .env ]; then
    cp .env .env.production
    echo "✅ Backed up production .env to .env.production"
fi

# Use local environment
cp .env.local .env
echo "✅ Now using .env.local configuration (SQLite database)"

# Initialize SQLite database if needed
echo "Checking local database..."
python init_db.py check || python init_db.py init

echo "✅ Local environment ready! Run ./start_dev.sh to start the server"