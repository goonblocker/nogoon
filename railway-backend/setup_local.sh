#!/bin/bash

# NoGoon Backend Local Development Setup Script
# This script helps you set up the backend for local development

set -e  # Exit on error

echo "🚀 NoGoon Backend - Local Development Setup"
echo "=============================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✅ Python version: $PYTHON_VERSION"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI is not installed."
    echo "Install it with: npm install -g @railway/cli"
    echo "Then run: railway login"
    echo ""
    read -p "Do you want to continue without Railway CLI? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    
    # Check if we can get Railway variables
    if command -v railway &> /dev/null; then
        echo "Attempting to fetch Railway database credentials..."
        
        # Get Railway variables
        RAILWAY_VARS=$(railway variables 2>/dev/null || echo "")
        
        if [ ! -z "$RAILWAY_VARS" ]; then
            echo "✅ Railway variables fetched successfully"
            
            # Extract database URL
            DATABASE_URL=$(railway variables | grep "DATABASE_PUBLIC_URL" | cut -d'=' -f2- | tr -d '"' || echo "")
            
            if [ ! -z "$DATABASE_URL" ]; then
                echo "✅ Database URL found"
                
                # Create .env file
                cat > .env << EOF
# Environment Configuration
ENVIRONMENT=development
PORT=8000

# Railway PostgreSQL Database Configuration
DATABASE_URL=${DATABASE_URL}
DATABASE_PUBLIC_URL=${DATABASE_URL}

# Privy Authentication Configuration
# Get these from https://dashboard.privy.io/
PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here
PRIVY_VERIFICATION_KEY=auto_fetched_from_privy_api

# Security Configuration
SECRET_KEY=$(openssl rand -hex 32)

# CORS - Chrome extension and localhost
ALLOWED_ORIGINS=["chrome-extension://kjmbccjnkgcpboiiomckhdogdhociajd","http://localhost:3000","http://localhost:8000"]
ALLOWED_HOSTS=["*"]

# Subscription Pricing
SUBSCRIPTION_PRICE_USD=4.99
TOKEN_PAYMENT_DISCOUNT=0.5
FREE_BLOCKS_PER_DAY=10

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Blockchain/Web3 Configuration (Optional)
ETHEREUM_RPC_URL=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
EOF
                echo "✅ .env file created with Railway credentials"
            else
                echo "⚠️  Could not extract DATABASE_URL from Railway"
                cp .env.example .env 2>/dev/null || echo "⚠️  .env.example not found"
            fi
        else
            echo "⚠️  No Railway variables found. Using .env.example template"
            cp .env.example .env 2>/dev/null || echo "⚠️  .env.example not found"
        fi
    else
        echo "⚠️  Railway CLI not available. Using .env.example template"
        cp .env.example .env 2>/dev/null || echo "⚠️  .env.example not found"
    fi
    
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your Privy credentials:"
    echo "   - PRIVY_APP_ID (from https://dashboard.privy.io/)"
    echo "   - PRIVY_APP_SECRET (from https://dashboard.privy.io/)"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create virtual environment
echo ""
echo "🔨 Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo ""
echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Dependencies installed"

# Initialize database
echo ""
echo "🗄️  Initializing database..."
read -p "Do you want to initialize the database now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python init_db.py check
    if [ $? -eq 0 ]; then
        echo ""
        python init_db.py init
        echo "✅ Database initialized"
    else
        echo "❌ Database connection failed. Please check your DATABASE_URL in .env"
        echo "   Make sure you have the correct Railway proxy port number."
    fi
fi

echo ""
echo "=============================================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Privy credentials"
echo "2. Verify database connection: python init_db.py check"
echo "3. Initialize database: python init_db.py init"
echo "4. Start the server: source venv/bin/activate && python main.py"
echo ""
echo "Or use the quick start script: ./start_dev.sh"
echo "=============================================="

