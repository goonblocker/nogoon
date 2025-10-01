# Quick Start Guide - Get Running in 10 Minutes

Follow these steps to get your NoGoon extension and backend running locally.

## ⚡ Prerequisites Check

Run these commands to verify you have everything:

```bash
node --version    # Should be v18 or higher
python3 --version # Should be 3.11 or higher
pnpm --version    # Should be installed
railway --version # Optional but recommended
```

If missing:
- **Node.js**: https://nodejs.org/
- **pnpm**: `npm install -g pnpm`
- **Railway CLI**: `npm install -g @railway/cli`

## 🚀 Quick Setup (5 Steps)

### Step 1: Get Your Credentials (2 min)

**Railway Database:**
```bash
railway login
cd backend
railway link  # Select your project
railway variables | grep DATABASE  # Copy the DATABASE_PUBLIC_URL
```

**Privy:**
1. Go to https://dashboard.privy.io/
2. Copy your **App ID** and **App Secret**

### Step 2: Setup Backend (2 min)

```bash
cd backend

# Quick setup - creates .env and installs dependencies
./setup_local.sh

# Edit .env with your Privy credentials
nano .env  # or use your favorite editor
# Update PRIVY_APP_ID and PRIVY_APP_SECRET

# Initialize database
source venv/bin/activate
python init_db.py init
```

### Step 3: Start Backend (30 sec)

```bash
./start_dev.sh
```

Keep this terminal open. Backend runs at http://localhost:8000

### Step 4: Setup Extension (2 min)

In a new terminal:

```bash
cd ..  # Back to project root

# Install dependencies
pnpm install

# Create .env for extension
cat > .env << 'EOF'
VITE_PRIVY_APP_ID=your_privy_app_id_here
VITE_BACKEND_URL=http://localhost:8000
EOF

# Edit .env with your Privy App ID
nano .env

# Build extension
pnpm build
```

### Step 5: Load in Chrome (1 min)

1. Open Chrome: `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select: `dist/chrome-extension/`
5. **Copy your Extension ID** (looks like `kjmbccjnkgcpboiiomckhdogdhociajd`)

**Important:** Update backend CORS:

```bash
# In backend/.env, update ALLOWED_ORIGINS with your extension ID
ALLOWED_ORIGINS=["chrome-extension://YOUR_EXTENSION_ID","http://localhost:8000"]
```

Restart backend: `./start_dev.sh`

## ✅ Test It Works

1. **Click extension icon** in Chrome toolbar
2. **Click "Sign In with Privy"**
3. Complete authentication
4. You should see: "Free Blocks Remaining: 10/10"

Check backend terminal - you should see:
```
User <id> logged in
Backend sync successful
```

## 🎯 You're Done!

Your extension is now:
- ✅ Authenticated with Privy
- ✅ Connected to Railway PostgreSQL
- ✅ Syncing with backend API
- ✅ Tracking user blocks

## 🐛 Quick Troubleshooting

**Backend won't start?**
```bash
cd backend
python init_db.py check  # Test database connection
```

**Extension says "Backend unavailable"?**
```bash
curl http://localhost:8000/health  # Should return JSON
```

**CORS errors?**
- Make sure extension ID in `backend/.env` matches Chrome
- Restart backend after changing CORS settings

**Privy auth fails?**
- Verify App ID matches in both `.env` files
- Check App Secret is correct in `backend/.env`

## 📚 Next Steps

- **Full Documentation**: See `LOCAL_DEVELOPMENT.md`
- **Deploy to Production**: See `backend/DEPLOYMENT.md`
- **API Documentation**: http://localhost:8000/docs

## 🆘 Need Help?

Check the logs:
- **Backend**: Terminal where `./start_dev.sh` is running
- **Extension**: Right-click extension popup > Inspect > Console

---

**Time to build something awesome! 🎉**

