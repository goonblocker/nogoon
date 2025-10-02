#!/bin/bash

echo "🚀 Quick Railway Setup for NoGoon Backend"
echo "=========================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Show available projects
echo "📋 Available Railway Projects:"
echo "------------------------------"
railway list
echo ""

# Instructions for manual linking
echo "🔗 To link to your project manually:"
echo "1. Run: railway link"
echo "2. Select your project from the list"
echo "3. Choose the environment (usually 'production')"
echo ""

# Check if already linked
echo "🔍 Checking current status..."
if railway status &>/dev/null; then
    echo "✅ Project is already linked!"
    echo ""
    
    # Show current project info
    echo "Current project:"
    railway status
    echo ""
    
    # Show environment variables
    echo "Environment variables:"
    railway variables --json | jq -r 'to_entries[] | "\(.key): \(.value)"' 2>/dev/null || echo "Could not retrieve variables"
    echo ""
    
    # Test database connection
    echo "Testing database connection..."
    if railway run psql $DATABASE_URL -c "SELECT 1;" &>/dev/null; then
        echo "✅ Database connection successful"
        
        # Initialize database
        echo "Initializing database tables..."
        if railway run python init_railway_db.py; then
            echo "✅ Database tables initialized successfully"
        else
            echo "❌ Database initialization failed"
        fi
    else
        echo "❌ Database connection failed"
    fi
    echo ""
    
    # Deploy backend
    echo "Deploying backend..."
    if railway up; then
        echo "✅ Backend deployed successfully"
    else
        echo "❌ Backend deployment failed"
    fi
    echo ""
    
    # Health check
    echo "Checking health..."
    SERVICE_URL=$(railway domain 2>/dev/null || echo "https://content-blocking-extension-production.up.railway.app")
    echo "Service URL: $SERVICE_URL"
    curl -s "$SERVICE_URL/health" | jq . 2>/dev/null || echo "❌ Health check failed"
    
else
    echo "❌ No project linked"
    echo ""
    echo "Please run the following commands:"
    echo "1. railway link"
    echo "2. Select your project from the list"
    echo "3. Run this script again"
fi

echo ""
echo "🎉 Setup complete!"
