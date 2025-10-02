#!/bin/bash

echo "🚀 NoGoon Database Migration via Railway CLI"
echo "============================================="

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if we're logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

echo "📡 Connecting to Railway project..."

# Run the migration script on Railway
echo "🔧 Running database schema migration..."
railway run python3 fix_database_schema.py

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Database migration completed successfully!"
    echo ""
    echo "✅ The database now has:"
    echo "   - users table (simplified, no subscriptions)"
    echo "   - blocks_usage table (for stats tracking)"
    echo "   - sync_logs table (for debugging)"
    echo ""
    echo "🚀 Your API should now work with real data!"
else
    echo ""
    echo "❌ Migration failed. Please check the output above for errors."
    exit 1
fi