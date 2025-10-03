#!/bin/bash
# Production Deployment Script for NoGoon Extension
# This script helps deploy the extension to production

set -e  # Exit on error

echo "🚀 NoGoon Production Deployment"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Function to display step
step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

# Function to display success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to display warning
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to display error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Get backend URL
step "Step 1: Configure Backend URL"
echo ""
read -p "Enter your Railway backend URL (e.g., https://your-app.railway.app): " BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    error "Backend URL is required!"
    exit 1
fi

# Validate URL format
if [[ ! $BACKEND_URL =~ ^https?:// ]]; then
    error "Invalid URL format. Must start with http:// or https://"
    exit 1
fi

success "Backend URL: $BACKEND_URL"

# Create production environment file
step "Step 2: Creating Production Environment File"
cat > .env.production << EOF
# Production Environment Configuration
# Generated: $(date)

# Privy Configuration
VITE_PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz

# Backend API URL
VITE_BACKEND_URL=$BACKEND_URL

# Environment
NODE_ENV=production
EOF

success "Created .env.production"

# Clean previous builds
step "Step 3: Cleaning Previous Builds"
pnpm clean:bundle
success "Build directory cleaned"

# Install dependencies (if needed)
step "Step 4: Checking Dependencies"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
    success "Dependencies installed"
else
    success "Dependencies already installed"
fi

# Build extension
step "Step 5: Building Extension for Production"
export VITE_BACKEND_URL=$BACKEND_URL
export VITE_PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
export NODE_ENV=production

pnpm build
success "Extension built successfully"

# Create ZIP package
step "Step 6: Creating ZIP Package for Chrome Web Store"
pnpm zip
success "ZIP package created"

# Display extension info
step "Step 7: Build Complete! 📦"
echo ""
echo "Extension Version: $(node -p "require('./package.json').version")"
echo "Build Output: ./dist/"
echo "ZIP Package: ./dist-zip/"
echo ""

# Instructions for testing
warning "Next Steps:"
echo ""
echo "1. Test the extension locally:"
echo "   - Open Chrome and go to chrome://extensions/"
echo "   - Enable 'Developer mode'"
echo "   - Click 'Load unpacked'"
echo "   - Select the 'dist' folder"
echo "   - Copy the Extension ID"
echo ""
echo "2. Update Railway CORS settings:"
echo "   - Go to Railway dashboard"
echo "   - Update ALLOWED_ORIGINS with your Extension ID"
echo "   - Example: [\"chrome-extension://YOUR_EXTENSION_ID\"]"
echo ""
echo "3. Test the extension:"
echo "   - Click the extension icon"
echo "   - Sign in with Privy"
echo "   - Verify backend communication works"
echo ""
echo "4. Upload to Chrome Web Store:"
echo "   - Go to https://chrome.google.com/webstore/devconsole"
echo "   - Upload ZIP from dist-zip/ folder"
echo "   - Fill in store listing details"
echo "   - Submit for review"
echo ""

# Check backend health
step "Step 8: Testing Backend Connection"
echo ""
echo "Testing backend health endpoint..."

if command -v curl &> /dev/null; then
    HEALTH_URL="$BACKEND_URL/health"
    echo "Checking: $HEALTH_URL"
    
    if curl -s -f "$HEALTH_URL" > /dev/null; then
        success "Backend is responding! ✓"
        echo ""
        echo "Backend Status:"
        curl -s "$HEALTH_URL" | python3 -m json.tool 2>/dev/null || curl -s "$HEALTH_URL"
    else
        warning "Backend not responding. Make sure it's deployed to Railway first."
    fi
else
    warning "curl not found. Skipping backend health check."
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Production Build Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📂 Build artifacts:"
echo "   - Extension: ./dist/"
echo "   - ZIP file: ./dist-zip/NoGoon-$(node -p "require('./package.json').version")-chrome.zip"
echo ""
echo "📚 For detailed deployment instructions, see:"
echo "   ./PRODUCTION_DEPLOYMENT_GUIDE.md"
echo ""

