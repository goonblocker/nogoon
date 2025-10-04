# 📦 NoGoon Beta Installation Instructions

**Version:** 0.4.3 Beta  
**For:** Community Beta Testers

---

## ⚡ Quick Install (5 Minutes)

### Step 1: Download

Download the beta package:
- **GitHub Release**: [Get latest release](https://github.com/Alex-Alaniz/content-blocking-extension/releases)
- **File to download**: `nogoon-beta-v0.4.3-unpacked.zip`

### Step 2: Unzip

- **Mac**: Double-click the ZIP file
- **Windows**: Right-click → Extract All
- **Linux**: `unzip nogoon-beta-v0.4.3-unpacked.zip`

**Important**: Remember where you unzipped it!

### Step 3: Install in Chrome

1. Open Chrome browser
2. Type in address bar: `chrome://extensions/`
3. **Enable "Developer mode"** (toggle switch in top-right corner)
4. Click **"Load unpacked"** button
5. Navigate to the unzipped folder → Select the **`dist`** folder
6. Click **"Select"** or **"Open"**

### Step 4: You're Done! 🎉

The NoGoon extension should now appear in your extensions list and in your browser toolbar.

---

## ⚠️ Important Notes

### About the "Developer Mode" Warning

You'll see a banner saying "Disable developer mode extensions". This is normal for beta releases!

- ✅ This is safe - it's just because you loaded it manually
- ✅ This will go away once the extension is on Chrome Web Store
- ✅ You can ignore this warning while beta testing

### Keep the Folder

**Don't delete the unzipped folder!**
- Chrome loads the extension from this folder
- If you delete it, the extension will stop working
- Move it somewhere safe (like `~/Applications/NoGoon-Beta/`)

### Extension May Get Disabled

Chrome sometimes disables developer mode extensions:
- If this happens, just re-enable it in `chrome://extensions/`
- Or wait for the Chrome Web Store version (no disabling)

---

## 🧪 What to Test

Please test these features and report any issues:

### Core Functionality
- [ ] Extension loads without errors
- [ ] Icon appears in browser toolbar
- [ ] Clicking icon opens the popup

### Authentication
- [ ] Sign in with Privy (email or social)
- [ ] Wallet gets created automatically
- [ ] Can view wallet addresses
- [ ] Can export wallet private keys

### Content Blocking
- [ ] Visit sites with images
- [ ] NSFW content gets detected and blocked
- [ ] Can click to reveal blocked images
- [ ] Block counter increments

### Performance
- [ ] Pages load smoothly (no freezing)
- [ ] Other tabs remain responsive
- [ ] No excessive lag or slowdown

### Statistics
- [ ] Can view blocking statistics
- [ ] "Today's Blocks" counter updates
- [ ] Total blocks displayed correctly

---

## 🐛 Found a Bug?

### Please Report:

**Where**: https://github.com/Alex-Alaniz/content-blocking-extension/issues

**Include**:
1. What you were doing
2. What happened
3. What you expected to happen
4. Browser console errors:
   - Press `F12` to open DevTools
   - Go to "Console" tab
   - Copy any red error messages
5. Your Chrome version
6. Your operating system

---

## ❓ Troubleshooting

### Extension Won't Load

**Problem**: Chrome rejects the extension

**Solution**:
1. Make sure you enabled "Developer mode"
2. Select the `dist` folder (not the ZIP file)
3. Try restarting Chrome
4. Check Chrome version (need v88+)

### Extension Icon Not Showing

**Problem**: Can't find the extension

**Solution**:
1. Look for puzzle piece icon in toolbar
2. Pin the extension: Click puzzle piece → Pin NoGoon
3. Or go to `chrome://extensions/` and verify it's enabled

### "This Extension May Soon No Longer Be Supported"

**Problem**: Chrome warning about developer mode

**Solution**:
- This is normal for beta releases
- Ignore the warning
- Wait for Chrome Web Store version

### Content Not Being Blocked

**Problem**: NSFW images not blocked

**Solution**:
1. Check extension is enabled: `chrome://extensions/`
2. Check protection is active in extension popup
3. Open browser console (`F12`) for errors
4. Report as bug if persists

---

## 💬 Feedback Welcome!

This is a beta release - we want to hear from you!

**Good feedback includes**:
- Features you love ❤️
- Features you wish existed 💡
- Bugs you encountered 🐛
- Performance issues 🐌
- UX/UI suggestions 🎨

**Where to share**:
- GitHub Issues: For bugs and feature requests
- Discord/Telegram: For general discussion
- Email: For private feedback

---

## 🔄 Updating to Newer Beta

When a new beta is released:

1. Download new ZIP
2. Unzip to same location (replace files)
3. Go to `chrome://extensions/`
4. Click reload button (circular arrow) on NoGoon
5. Updated!

Or:

1. Remove old extension
2. Install new one following steps above

---

## 🎊 Thank You for Beta Testing!

Your testing helps us:
- Find and fix bugs before public launch
- Improve performance
- Enhance user experience
- Build a better product

**Early testers will receive $NoGoon token airdrops!** 💎

---

## 📞 Need Help?

- **GitHub Issues**: https://github.com/Alex-Alaniz/content-blocking-extension/issues
- **Documentation**: See repository README
- **Community**: [Your Discord/Telegram link]

---

**Enjoy NoGoon and stay productive! 🚀**

