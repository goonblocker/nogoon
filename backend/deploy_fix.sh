#!/bin/bash

echo "🚀 Deploying Privy Authentication Fix to Railway"
echo "=============================================="

# Set environment variables for the deployment
export RAILWAY_PROJECT_ID="2dba516d-304f-4e59-afa1-91178a8ec57f"

echo "✅ Fixed Privy authentication issues:"
echo "   - Updated to use correct JWKS endpoint: https://auth.privy.io/api/v1/apps/{app_id}/jwks.json"
echo "   - Fixed JWT verification to use ES256 algorithm with proper key extraction"
echo "   - Updated app ID to: cmg74h4sm0035le0c1k99b1gz"
echo ""

echo "📋 Changes made:"
echo "   - backend/app/privy_auth.py: Fixed JWKS endpoint and key extraction"
echo "   - backend/app/config.py: Updated with correct Privy app ID"
echo ""

echo "🔧 To deploy manually:"
echo "   1. Run: railway link (select your project)"
echo "   2. Run: railway up"
echo ""

echo "✅ Backend authentication should now work correctly!"
echo "   The extension will be able to authenticate with the backend."
