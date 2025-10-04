#!/bin/bash
# Create Beta Release for GitHub

echo "🚀 Creating NoGoon Beta Release"
echo "================================"
echo ""

VERSION="0.4.3-beta"

# Check if packages exist
if [ ! -f "nogoon-beta-v0.4.3-unpacked.zip" ] || [ ! -f "nogoon-beta-v0.4.3-webstore.zip" ]; then
    echo "❌ Beta packages not found!"
    echo "Creating packages..."
    
    # Create unpacked version
    zip -r nogoon-beta-v0.4.3-unpacked.zip dist/ -x "*.DS_Store"
    
    # Create webstore version
    cp dist-zip/extension-20251003-030923.zip nogoon-beta-v0.4.3-webstore.zip
    
    echo "✅ Packages created"
fi

# Show file sizes
echo "📦 Release Packages:"
ls -lh nogoon-beta-v0.4.3-*.zip
echo ""

# Create git tag
echo "🏷️  Creating git tag: v$VERSION"
git tag -a "v$VERSION" -m "Beta release v$VERSION - Performance optimized, ready for community testing"

# Push tag
echo "⬆️  Pushing tag to GitHub..."
git push origin "v$VERSION"

echo ""
echo "✅ Git tag created and pushed!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Go to GitHub Releases:"
echo "   https://github.com/Alex-Alaniz/content-blocking-extension/releases/new"
echo ""
echo "2. Select tag: v$VERSION"
echo ""
echo "3. Set title: NoGoon v0.4.3 Beta - Performance Optimized"
echo ""
echo "4. Copy description from: BETA_TESTING_GUIDE.md"
echo ""
echo "5. Upload these files:"
echo "   - nogoon-beta-v0.4.3-unpacked.zip (for Load Unpacked)"
echo "   - nogoon-beta-v0.4.3-webstore.zip (Chrome Web Store format)"
echo "   - INSTALL_INSTRUCTIONS.md (installation guide)"
echo ""
echo "6. Check ☑️ 'This is a pre-release'"
echo ""
echo "7. Click 'Publish release'"
echo ""
echo "🎉 Your beta release will be live!"
echo ""
echo "Share this URL with your community:"
echo "https://github.com/Alex-Alaniz/content-blocking-extension/releases/tag/v$VERSION"
echo ""

