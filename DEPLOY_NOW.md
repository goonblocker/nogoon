# 🚀 Deploy NoGoon to Production NOW

Quick start guide to deploy your extension to production in the next 30-60 minutes.

## 📋 What You Need

- [ ] Railway account (free to start)
- [ ] Chrome browser
- [ ] GitHub repository (already set up ✓)
- [ ] Terminal access
- [ ] 30-60 minutes of time

---

## 🎯 Deployment Path: Choose One

### Option A: Railway Dashboard (Easiest - No CLI needed)
**Time: ~30 minutes**

Perfect if you prefer GUI and want a visual deployment process.

[👉 Follow Option A Instructions](#option-a-railway-dashboard-deployment)

### Option B: Railway CLI (Faster for developers)
**Time: ~20 minutes**

Perfect if you're comfortable with command line.

[👉 Follow Option B Instructions](#option-b-railway-cli-deployment)

---

## Option A: Railway Dashboard Deployment

### Step 1: Deploy Backend (15 minutes)

1. **Go to Railway**: https://railway.app
2. **Sign in** with GitHub
3. **Create New Project** or use existing
4. **Add PostgreSQL**:
   - Click "+ New"
   - Select "Database"
   - Choose "PostgreSQL"
5. **Add Backend Service**:
   - Click "+ New"
   - Select "GitHub Repo"
   - Choose `Alex-Alaniz/content-blocking-extension`
   - Configure:
     - Root Directory: `backend`
     - Service Name: `backend-api`

6. **Set Environment Variables**:
   
   Click on your backend service → Variables tab → Raw Editor, paste:
   
   ```
   ENVIRONMENT=production
   PORT=8000
   PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
   PRIVY_APP_SECRET=4iU5owbvwJ4TdhUCQhE63iguj261qWwh6AK1QJEJ6K8qs49TWCaeWJYzEtifD4W7JoxAQac9ADkPwBwz2yu43J8p
   SECRET_KEY=GENERATE_ME_BELOW
   ALLOWED_ORIGINS=["chrome-extension://WILL_UPDATE_LATER"]
   ALLOWED_HOSTS=["*"]
   SUBSCRIPTION_PRICE_USD=20.0
   TOKEN_PAYMENT_DISCOUNT=0.5
   FREE_BLOCKS_PER_DAY=10
   RATE_LIMIT_PER_MINUTE=60
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   ```

7. **Generate SECRET_KEY**:
   
   In terminal:
   ```bash
   openssl rand -hex 32
   ```
   
   Copy the output and replace `GENERATE_ME_BELOW` in Railway

8. **Link Database**:
   - In Variables tab, click "Add Variable Reference"
   - Select your PostgreSQL service
   - Add `DATABASE_URL` and `DATABASE_PUBLIC_URL`

9. **Generate Domain**:
   - Go to Settings tab
   - Click "Generate Domain"
   - **Copy this URL** - you'll need it! 📝

10. **Wait for Deployment** (2-3 minutes)
    - Check Deployments tab
    - Wait for green checkmark

11. **Initialize Database**:
    
    In terminal, replace URL with your Railway domain:
    ```bash
    curl -X POST https://YOUR-RAILWAY-URL.railway.app/api/v1/admin/init-database
    curl https://YOUR-RAILWAY-URL.railway.app/health
    ```

✅ **Backend deployed!**

### Step 2: Build & Test Extension (15 minutes)

1. **Run deployment script**:
   
   ```bash
   cd /Users/alexalaniz/Documents/GitHub/content-blocking-extension
   ./deploy-production.sh
   ```
   
   When prompted, enter your Railway URL

2. **Load extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder
   - **Copy the Extension ID** 📝

3. **Update Railway CORS**:
   - Go back to Railway dashboard
   - Backend service → Variables
   - Update `ALLOWED_ORIGINS`:
     ```
     ["chrome-extension://YOUR_EXTENSION_ID"]
     ```
   - Save (will trigger redeploy)

4. **Test the extension**:
   - Click extension icon in Chrome
   - Sign in with Privy
   - Verify it works!

✅ **Extension working locally!**

### Step 3: Publish to Chrome Web Store (Optional, 30+ minutes)

1. **Create Developer Account**:
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay $5 one-time fee

2. **Prepare Assets**:
   - Screenshots (recommended: 5 images, 1280x800)
   - Description
   - Privacy policy (if collecting user data)

3. **Upload Extension**:
   - Click "New Item"
   - Upload `dist-zip/NoGoon-0.4.3-chrome.zip`
   - Fill in store listing
   - Submit for review

4. **Wait for Approval** (1-3 business days)

---

## Option B: Railway CLI Deployment

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login and Setup

```bash
# Login to Railway
railway login

# Create new project (or link existing)
railway init

# Add PostgreSQL
railway add
# Choose "PostgreSQL" from the menu
```

### Step 3: Deploy Backend

```bash
cd backend

# Generate secret key
SECRET_KEY=$(openssl rand -hex 32)

# Set environment variables
railway variables set ENVIRONMENT=production
railway variables set PORT=8000
railway variables set PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
railway variables set PRIVY_APP_SECRET=4iU5owbvwJ4TdhUCQhE63iguj261qWwh6AK1QJEJ6K8qs49TWCaeWJYzEtifD4W7JoxAQac9ADkPwBwz2yu43J8p
railway variables set SECRET_KEY=$SECRET_KEY
railway variables set ALLOWED_ORIGINS='["chrome-extension://TEMP"]'
railway variables set ALLOWED_HOSTS='["*"]'
railway variables set SUBSCRIPTION_PRICE_USD=20.0
railway variables set TOKEN_PAYMENT_DISCOUNT=0.5
railway variables set FREE_BLOCKS_PER_DAY=10
railway variables set RATE_LIMIT_PER_MINUTE=60
railway variables set SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Deploy
railway up

# Get your domain
railway domain
# Copy this URL! 📝
```

### Step 4: Initialize Database

```bash
# Set your Railway URL
BACKEND_URL=$(railway domain)

# Initialize
curl -X POST https://$BACKEND_URL/api/v1/admin/init-database
curl https://$BACKEND_URL/health
```

### Step 5: Build Extension

```bash
cd ..
./deploy-production.sh
# Enter your Railway URL when prompted
```

### Step 6: Get Extension ID and Update CORS

```bash
# Load in Chrome and get Extension ID
# Then update Railway:
railway variables set ALLOWED_ORIGINS='["chrome-extension://YOUR_EXTENSION_ID"]'
```

---

## ✅ Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Database tables created
- [ ] Extension loads without errors
- [ ] Privy authentication works
- [ ] Backend API calls successful
- [ ] No console errors in DevTools
- [ ] Content blocking works

---

## 🆘 Quick Troubleshooting

### Backend not responding
```bash
# Check Railway logs
railway logs --tail 100

# Restart service
railway restart
```

### Extension CORS errors
```bash
# Update CORS in Railway
railway variables set ALLOWED_ORIGINS='["chrome-extension://YOUR_ID"]'
```

### Database issues
```bash
# Reinitialize database
curl -X POST https://YOUR-RAILWAY-URL.railway.app/api/v1/admin/init-database
```

### Extension won't load
```bash
# Rebuild
cd /Users/alexalaniz/Documents/GitHub/content-blocking-extension
pnpm clean:bundle && pnpm build
```

---

## 📚 Full Documentation

For detailed instructions, see:
- **[PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)** - Comprehensive guide
- **[backend/RAILWAY_DEPLOYMENT_CHECKLIST.md](./backend/RAILWAY_DEPLOYMENT_CHECKLIST.md)** - Backend deployment checklist

---

## 🎯 Current Status

Update this as you progress:

- [ ] Railway account created
- [ ] Backend deployed to Railway
- [ ] Database initialized
- [ ] Extension built for production
- [ ] Extension tested locally
- [ ] CORS configured correctly
- [ ] Ready for Chrome Web Store submission

---

## 🚀 Ready to Deploy?

### Quick Start (Dashboard Method):
1. Go to https://railway.app
2. Create project + Add PostgreSQL
3. Add GitHub repo as service (root: `backend`)
4. Set environment variables (copy from above)
5. Generate domain
6. Run `./deploy-production.sh` with Railway URL

### Quick Start (CLI Method):
```bash
# Install CLI
npm install -g @railway/cli

# Deploy
cd backend
railway login
railway init
railway add  # Choose PostgreSQL
# (Set environment variables as shown above)
railway up
railway domain

# Build extension
cd ..
./deploy-production.sh
```

---

**Questions?** Check the [troubleshooting section](#-quick-troubleshooting) or see full docs.

**Ready to go LIVE?** Follow the steps above! 🚀

