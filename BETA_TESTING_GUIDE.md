# 🧪 Beta Testing Guide - Share Extension with Community

**While Under Chrome Web Store Review**

There are several ways to let your community test the extension without requiring them to build from source.

---

## ✅ Option 1: Load Unpacked Extension (Easiest for Users)

### For You (One-Time Setup):

**Create a release package:**

```bash
# Your extension is already built in dist/
# Create a shareable ZIP of the dist folder
cd /Users/alexalaniz/Documents/GitHub/content-blocking-extension
zip -r nogoon-beta-v0.4.3.zip dist/*
```

**Share the file:**
- Upload to GitHub Releases
- Share via Google Drive/Dropbox
- Host on your website

### For Users (Simple Instructions):

```
1. Download nogoon-beta-v0.4.3.zip
2. Unzip the file to a folder
3. Open Chrome and go to: chrome://extensions/
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the unzipped folder
7. Extension is installed! 🎉
```

**Pros:**
- ✅ Very simple for users
- ✅ No account needed
- ✅ Works immediately

**Cons:**
- ⚠️ Developer mode warning appears
- ⚠️ Extension could be disabled by Chrome periodically
- ⚠️ Users must keep the folder (can't delete after install)

---

## ✅ Option 2: Submit as "Unlisted" First (Recommended)

### How It Works:

When submitting to Chrome Web Store, choose **"Unlisted"** instead of "Public":

1. Submit extension to Chrome Web Store
2. Choose **Visibility: Unlisted**
3. Get approved faster (unlisted reviews are quicker)
4. Get a Chrome Web Store URL to share
5. Only people with the link can install
6. Once tested, change to "Public"

### Steps:

**In Chrome Web Store submission:**
- Distribution → Visibility: Select **"Unlisted"**
- Save and submit
- After approval, you'll get a URL like:
  ```
  https://chrome.google.com/webstore/detail/[YOUR_EXTENSION_ID]
  ```

**Share this URL** with your community!

**Pros:**
- ✅ Installed like a normal extension (no developer mode)
- ✅ Auto-updates work
- ✅ No warnings for users
- ✅ Can be changed to Public later
- ✅ Faster approval for unlisted

**Cons:**
- ⚠️ Still needs Chrome Web Store approval first
- ⚠️ URL is long and obscure

---

## ✅ Option 3: Create CRX File (Advanced)

### Create a Packaged Extension:

**CRX files** can be installed directly (with some limitations in Chrome).

**Steps:**

1. **Pack the extension:**
   ```bash
   # In Chrome
   1. Go to chrome://extensions/
   2. Enable Developer mode
   3. Click "Pack extension"
   4. Extension root: /path/to/dist
   5. Leave private key blank (first time)
   6. Click "Pack Extension"
   ```

   This creates:
   - `dist.crx` - The packaged extension
   - `dist.pem` - Private key (KEEP THIS SECRET!)

2. **Distribute the .crx file:**
   - Upload to GitHub Releases
   - Share via your website

3. **Users install by:**
   ```
   Method 1 (Drag-and-drop):
   - Download the .crx file
   - Open chrome://extensions/
   - Drag the .crx file onto the page
   
   Method 2 (Manual):
   - Open chrome://extensions/
   - Enable Developer mode
   - Drag .crx file to extensions page
   ```

**Pros:**
- ✅ Single file download
- ✅ Easier than unpacked
- ✅ Signed with your key

**Cons:**
- ⚠️ Chrome may block installation (security warning)
- ⚠️ Requires developer mode
- ⚠️ More steps for users

---

## ✅ Option 4: GitHub Releases (Best for Community)

### Create a GitHub Release:

**Steps:**

1. **Create a release on GitHub:**

```bash
# Tag your code
git tag -a v0.4.3-beta -m "Beta release for community testing"
git push origin v0.4.3-beta

# Then on GitHub:
1. Go to: https://github.com/Alex-Alaniz/content-blocking-extension/releases
2. Click "Create a new release"
3. Choose tag: v0.4.3-beta
4. Title: "NoGoon v0.4.3 - Beta Release"
5. Upload: dist-zip/extension-20251003-030923.zip
6. Mark as "Pre-release"
7. Publish release
```

2. **Create installation instructions:**

Add this to your release description:

```markdown
## 🧪 Beta Testing Instructions

Thanks for testing NoGoon!

### Installation (5 minutes):

1. Download `extension-20251003-030923.zip` below
2. Unzip to a folder (remember the location)
3. Open Chrome: `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the unzipped folder
7. Extension is installed! 🎉

### Note:
- You'll see a "Developer mode" banner (this is normal for pre-release)
- The extension works exactly like the final version
- Your testing helps us improve before public launch!

### What to Test:
- ✅ Content blocking functionality
- ✅ Privy authentication
- ✅ Wallet creation and management
- ✅ Statistics tracking
- ✅ Performance on different websites

### Found a Bug?
Open an issue: https://github.com/Alex-Alaniz/content-blocking-extension/issues

**Thank you for being an early tester! 🙏**
```

**Pros:**
- ✅ Professional distribution
- ✅ Version control
- ✅ Community-friendly
- ✅ Track downloads
- ✅ Easy to share (just link to release)

**Cons:**
- ⚠️ Still requires developer mode
- ⚠️ Users must keep folder

---

## ✅ Option 5: Microsoft Edge Add-ons (Parallel Deployment)

### Publish to Edge Add-ons Store:

Edge uses the same Chromium engine and reviews are **much faster**!

**Steps:**

1. **Go to**: https://partner.microsoft.com/dashboard/microsoftedge/overview

2. **Create account** (free, no fee)

3. **Upload same ZIP file**

4. **Review time**: Usually 1-3 days (faster than Chrome!)

5. **Share Edge store link** with community

6. **Works on Chrome too**: Edge extensions can be installed in Chrome

**Pros:**
- ✅ Faster approval (1-3 days typically)
- ✅ No $5 fee (it's free)
- ✅ Works in Edge AND Chrome
- ✅ Full store listing
- ✅ Auto-updates

**Cons:**
- ⚠️ Need separate account
- ⚠️ Another store to manage

---

## 🎯 Recommended Strategy

### **For Immediate Beta Testing:**

**Use Option 4 (GitHub Releases)** - Here's why:
- Professional and organized
- Easy to share (just one URL)
- Version controlled
- Free and immediate
- Community expects this

### **For Public Launch:**

**Use Option 2 (Unlisted on Chrome Web Store)** then switch to Public:
- Submit as "Unlisted"
- Get approved
- Test with beta users via Chrome Web Store link
- Change to "Public" when ready
- Broader audience reach

---

## 📦 Quick Action: Create GitHub Release Now

Let me help you create one right now:

### Step 1: Prepare the Release Package

```bash
# Create a clean package without node_modules
cd /Users/alexalaniz/Documents/GitHub/content-blocking-extension

# The dist folder is already built and ready
# Create a release-ready ZIP
zip -r nogoon-beta-v0.4.3-unpacked.zip dist/

# Also include the pre-packaged version
cp dist-zip/extension-20251003-030923.zip nogoon-beta-v0.4.3-webstore.zip
```

### Step 2: Create Git Tag

```bash
git tag -a v0.4.3-beta -m "Beta release for community testing - Performance optimized"
git push origin v0.4.3-beta
```

### Step 3: Create GitHub Release

Go to: https://github.com/Alex-Alaniz/content-blocking-extension/releases/new

**Fill in:**
- **Tag**: v0.4.3-beta (select the tag you just created)
- **Title**: `NoGoon v0.4.3 Beta - Performance Optimized`
- **Description**:
```markdown
# 🧪 NoGoon Beta Release v0.4.3

**AI-powered content blocker with Web3 wallets**

## 🆕 What's New

✅ **Performance Optimizations**
- 70-80% fewer images processed
- Max 3 concurrent AI inferences
- Batch processing for smooth page loads
- No more page freezing or slowdowns

✅ **Fixed Issues**
- Block counter now updates correctly
- Extension no longer slows down other tabs
- Removed excessive logging
- Better memory management

✅ **Features**
- AI-powered NSFW content blocking
- Built-in Ethereum & Solana wallets (Privy)
- Usage statistics and analytics
- 100% free forever - powered by $NoGoon token

## 🧪 How to Install (Beta)

### Option 1: Unpacked Extension (Recommended)
1. Download `nogoon-beta-v0.4.3-unpacked.zip`
2. Unzip to a folder on your computer
3. Open Chrome: `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the unzipped `dist` folder
7. Extension is installed! 🎉

### Option 2: Pre-packaged (Same as Chrome Web Store)
1. Download `nogoon-beta-v0.4.3-webstore.zip`
2. Unzip
3. Follow same steps as Option 1

**Note**: You'll see a "Developer mode extensions" warning - this is normal for beta releases.

## ✅ What to Test

Please test these features:
- [ ] Content blocking on various websites
- [ ] Privy authentication (email/social login)
- [ ] Wallet creation (Ethereum & Solana)
- [ ] Export wallet private keys
- [ ] View statistics
- [ ] Toggle protection on/off
- [ ] Performance (no slowdowns?)
- [ ] Block counter increments

## 🐛 Found a Bug?

Open an issue: https://github.com/Alex-Alaniz/content-blocking-extension/issues

Include:
- What you were doing
- What happened vs. what you expected
- Browser console errors (F12 → Console)
- Chrome version

## 🚀 Coming Soon

- ✅ Chrome Web Store listing (under review)
- ✅ $NoGoon token launch
- ✅ Additional features based on your feedback

## 📞 Feedback Welcome!

This is a beta release - we want to hear from you!
- Open issues on GitHub
- Join our community
- Help us improve before public launch

**Thank you for being an early tester! 🙏**

---

**Backend**: Already deployed and running on Railway  
**Status**: Ready for testing  
**Chrome Web Store**: Submission pending
```

**Upload these files:**
- `nogoon-beta-v0.4.3-unpacked.zip`
- `nogoon-beta-v0.4.3-webstore.zip`
- Optional: Add screenshots

**Check**: ☑️ "This is a pre-release"

**Publish!**

---

## 📣 Promote Your Beta

Share your GitHub Release link:

**Twitter/X:**
```
🚀 NoGoon v0.4.3 Beta is here!

Block NSFW content with AI + Built-in ETH/SOL wallets

Beta test before public launch:
[GitHub Release URL]

100% free forever 💎 Powered by $NoGoon

#Web3 #AI #ContentFilter #NoGoon
```

**Discord/Telegram:**
```
🎉 **NoGoon Beta v0.4.3 is Live!**

AI-powered content blocker with embedded Web3 wallets.

**Beta Test Now:**
👉 [GitHub Release URL]

**What's New:**
✅ 70% faster performance
✅ Ethereum & Solana wallets
✅ Real-time NSFW detection
✅ Free forever

Help us test before Chrome Web Store launch! 🚀
```

**Reddit** (r/chrome_extensions, r/webdev):
```
Title: [Beta] NoGoon - AI Content Blocker with Web3 Wallets

Looking for beta testers for NoGoon, an AI-powered content blocking extension.

Features:
- NSFW detection using TensorFlow.js
- Built-in Ethereum & Solana wallets
- Privacy-first (local processing)
- Free forever

GitHub: [link]
Beta Release: [link]

Feedback welcome!
```

---

## 🎯 Recommended Approach

**Do ALL of these:**

1. **Immediate (Today):**
   - Create GitHub Release with unpacked ZIP
   - Share with close community
   - Get initial feedback

2. **When Unlisted Approved (3-7 days):**
   - Share Chrome Web Store unlisted link
   - Wider beta testing
   - Collect reviews

3. **When Ready (After testing):**
   - Change to "Public" on Chrome Web Store
   - Official launch
   - Full marketing push

---

## 📋 Quick Checklist

- [ ] Create GitHub Release (see steps above)
- [ ] Upload beta ZIP files
- [ ] Write clear installation instructions
- [ ] Mark as pre-release
- [ ] Share release URL with community
- [ ] Collect feedback and issues
- [ ] Fix any bugs found
- [ ] Continue Chrome Web Store review process

---

**Want me to help you create the GitHub release package?** Let me know!

