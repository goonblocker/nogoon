#!/bin/bash

echo "🚀 Railway Deployment Fix Script"
echo "================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

echo "📋 Pre-deployment checks..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "⚠️  Not logged in to Railway. Please login:"
    railway login
fi

echo "🔗 Linking to Railway project..."
railway link

echo ""
echo "📦 Deploying to Railway..."
railway up

echo ""
echo "⏳ Waiting for deployment to complete..."
sleep 30

echo ""
echo "🏥 Testing health endpoint..."
SERVICE_URL=$(railway domain 2>/dev/null || echo "https://content-blocking-extension-production.up.railway.app")
echo "Service URL: $SERVICE_URL"

# Test health endpoint
echo "Testing /health endpoint..."
curl -s "$SERVICE_URL/health" | jq . 2>/dev/null || echo "❌ Health check failed"

echo ""
echo "🗄️  Initializing database..."
echo "Calling /init-database endpoint..."
curl -X POST "$SERVICE_URL/init-database" -H "Content-Type: application/json" | jq . 2>/dev/null || echo "❌ Database initialization failed"

echo ""
echo "✅ Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""
echo "Next steps:"
echo "1. Test the health endpoint: curl $SERVICE_URL/health"
echo "2. Initialize database: curl -X POST $SERVICE_URL/init-database"
echo "3. Check logs: railway logs"
echo ""
