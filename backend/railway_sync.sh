#!/bin/bash

echo "🚀 Railway Service Sync Script"
echo "=============================="
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

# Function to show current status
show_status() {
    echo "📊 Current Railway Status:"
    echo "------------------------"
    
    # Show linked project
    echo "Linked project:"
    railway status 2>/dev/null || echo "  No project linked"
    echo ""
    
    # Show services
    echo "Available services:"
    railway list 2>/dev/null || echo "  Could not list services"
    echo ""
}

# Function to sync database
sync_database() {
    echo "🗄️  Syncing Database..."
    echo "----------------------"
    
    # Check if we can access the database
    echo "Testing database connection..."
    railway run psql $DATABASE_URL -c "SELECT 1;" 2>/dev/null && echo "✅ Database connection successful" || echo "❌ Database connection failed"
    echo ""
    
    # Initialize database tables
    echo "Initializing database tables..."
    railway run python init_railway_db.py 2>/dev/null && echo "✅ Database tables initialized" || echo "❌ Database initialization failed"
    echo ""
}

# Function to check environment variables
check_env() {
    echo "🔧 Environment Variables:"
    echo "-------------------------"
    
    # Show current variables
    railway variables --json 2>/dev/null | jq -r 'to_entries[] | "\(.key): \(.value)"' 2>/dev/null || echo "Could not retrieve variables"
    echo ""
}

# Function to deploy backend
deploy_backend() {
    echo "🚀 Deploying Backend..."
    echo "----------------------"
    
    # Deploy the backend
    railway up 2>/dev/null && echo "✅ Backend deployed successfully" || echo "❌ Backend deployment failed"
    echo ""
}

# Function to check health
check_health() {
    echo "🏥 Health Check:"
    echo "----------------"
    
    # Get the service URL
    SERVICE_URL=$(railway domain 2>/dev/null || echo "https://content-blocking-extension-production.up.railway.app")
    
    echo "Service URL: $SERVICE_URL"
    echo ""
    
    # Test health endpoint
    echo "Testing health endpoint..."
    curl -s "$SERVICE_URL/health" | jq . 2>/dev/null || echo "❌ Health check failed"
    echo ""
}

# Main menu
while true; do
    echo "What would you like to do?"
    echo "1. Show current status"
    echo "2. Check environment variables"
    echo "3. Sync database"
    echo "4. Deploy backend"
    echo "5. Check health"
    echo "6. Link to project (interactive)"
    echo "7. Exit"
    echo ""
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1)
            show_status
            ;;
        2)
            check_env
            ;;
        3)
            sync_database
            ;;
        4)
            deploy_backend
            ;;
        5)
            check_health
            ;;
        6)
            echo "Linking to Railway project (interactive)..."
            railway link
            ;;
        7)
            echo "Goodbye! 👋"
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    echo ""
done
