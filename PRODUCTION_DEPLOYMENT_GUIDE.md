# 🚀 Production Deployment Guide - NoGoon Extension

**Last Updated:** October 3, 2025  
**Status:** Ready for Production Deployment

## ⚡ Quick Deployment Overview

This guide covers deploying:
1. **Backend API** to Railway (FastAPI + PostgreSQL)
2. **Chrome Extension** to Chrome Web Store

---

## Part 1: Backend Deployment to Railway

### Prerequisites
- Railway account (https://railway.app)
- GitHub repository connected
- PostgreSQL service already provisioned (appears to be done)

### Option A: Deploy via Railway Dashboard (Recommended)

#### Step 1: Access Your Railway Project

Go to your Railway dashboard and access your project (if you already have one).

#### Step 2: Create Backend Service

1. Click **"+ New"** in your Railway project
2. Select **"GitHub Repo"**
3. Choose repository: `Alex-Alaniz/content-blocking-extension`
4. Configure the service:
   - **Service Name**: `backend-api`
   - **Root Directory**: `backend`
   - **Watch Paths**: `backend/**`

#### Step 3: Configure Environment Variables

In the Railway dashboard, add these environment variables to your backend service:

```bash
# Core Settings
ENVIRONMENT=production
PORT=8000

# Privy Authentication (KEEP THESE SECURE!)
PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
PRIVY_APP_SECRET=4iU5owbvwJ4TdhUCQhE63iguj261qWwh6AK1QJEJ6K8qs49TWCaeWJYzEtifD4W7JoxAQac9ADkPwBwz2yu43J8p
PRIVY_VERIFICATION_KEY=auto_fetched_from_privy_api

# Security - GENERATE A NEW SECRET KEY!
SECRET_KEY=<RUN: openssl rand -hex 32>

# CORS - Update after getting Chrome Extension ID
ALLOWED_ORIGINS=["chrome-extension://YOUR_EXTENSION_ID_HERE"]
ALLOWED_HOSTS=["*"]

# Subscription Pricing
SUBSCRIPTION_PRICE_USD=20.0
TOKEN_PAYMENT_DISCOUNT=0.5
FREE_BLOCKS_PER_DAY=10

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Optional Web3 RPC URLs
ETHEREUM_RPC_URL=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**IMPORTANT:** Generate a secure SECRET_KEY:
```bash
openssl rand -hex 32
```

#### Step 4: Link PostgreSQL Database

1. In the backend service settings → **Variables** tab
2. Click **"Add Variable Reference"**
3. Select your PostgreSQL service
4. Add references to:
   - `DATABASE_URL`
   - `DATABASE_PUBLIC_URL`

Railway will automatically inject these from your Postgres service.

#### Step 5: Deploy

1. Railway should automatically deploy when you save the configuration
2. Wait for deployment to complete (check the **Deployments** tab)
3. Once deployed, note your backend URL (e.g., `https://backend-api-production.up.railway.app`)

#### Step 6: Generate Domain (if needed)

1. Go to **Settings** tab
2. Click **"Generate Domain"**
3. Copy the generated URL (you'll need this for the extension)

#### Step 7: Initialize Database

Once deployed, initialize the database tables:

```bash
# Get your backend URL from Railway
BACKEND_URL="https://your-backend-url.railway.app"

# Initialize database
curl -X POST "$BACKEND_URL/api/v1/admin/init-database"

# Verify tables were created
curl "$BACKEND_URL/api/v1/admin/check-tables"

# Test health endpoint
curl "$BACKEND_URL/health"
```

Expected response from `/health`:
```json
{
  "status": "healthy",
  "environment": "production",
  "version": "1.0.0",
  "database": "configured"
}
```

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project (if you have an existing one)
railway link

# Deploy from backend directory
cd backend
railway up

# Set environment variables
railway variables set ENVIRONMENT=production
railway variables set PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
railway variables set SECRET_KEY=$(openssl rand -hex 32)
# ... (add all other variables)

# Get your deployment URL
railway domain
```

---

## Part 2: Chrome Extension Build & Deployment

### Step 1: Get Your Backend Production URL

After deploying to Railway, you should have a URL like:
```
https://backend-api-production.up.railway.app
```

### Step 2: Create Production Environment File

Create `.env.production` in the project root:

```bash
# Privy Configuration
VITE_PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz

# Backend API URL (Your Railway URL)
VITE_BACKEND_URL=https://YOUR-RAILWAY-URL.railway.app

# Environment
NODE_ENV=production
```

### Step 3: Build the Extension for Production

```bash
# From project root
cd /Users/alexalaniz/Documents/GitHub/content-blocking-extension

# Clean previous builds
pnpm clean:bundle

# Set production environment and build
export VITE_BACKEND_URL=https://YOUR-RAILWAY-URL.railway.app
export VITE_PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz

# Build for Chrome
pnpm build

# Create ZIP package for Chrome Web Store
pnpm zip
```

This creates:
- Built extension in `dist/` directory
- ZIP package in `dist-zip/` directory (ready for Chrome Web Store)

### Step 4: Get Your Extension ID

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. **Copy the Extension ID** (format: `kjmbccjnkgcpboiiomckhdogdhociajd`)

### Step 5: Update Backend CORS Settings

Update the Railway environment variable `ALLOWED_ORIGINS` with your Extension ID:

```bash
ALLOWED_ORIGINS=["chrome-extension://YOUR_ACTUAL_EXTENSION_ID"]
```

In Railway dashboard:
1. Go to backend service → **Variables**
2. Update `ALLOWED_ORIGINS` variable
3. Save (this will trigger a redeployment)

### Step 6: Rebuild Extension with Correct Backend URL

Now that you have the final backend URL, rebuild the extension:

```bash
# Update .env.production with final Railway URL
echo "VITE_BACKEND_URL=https://YOUR-RAILWAY-URL.railway.app" >> .env.production

# Rebuild
pnpm clean:bundle && pnpm build && pnpm zip
```

### Step 7: Test the Extension Locally

1. Load the unpacked extension from `dist/` in Chrome
2. Open the extension popup
3. Test authentication with Privy
4. Check browser console for any errors
5. Verify backend communication:
   - Open DevTools → Network tab
   - Filter by your Railway URL
   - Sign in and verify API calls succeed

---

## Part 3: Publish to Chrome Web Store

### Prerequisites

- Google Developer account ($5 one-time fee)
- Extension ZIP file from `dist-zip/` directory
- Required assets:
  - 128x128 icon (already in `public/icon-128-1.png`)
  - Screenshots (5 recommended)
  - Privacy policy (if collecting user data)
  - Detailed description

### Step 1: Create Chrome Web Store Developer Account

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the $5 one-time registration fee
3. Agree to the terms

### Step 2: Prepare Store Listing Assets

Create the following before submitting:

**Required:**
- Small promotional tile: 440x280 PNG
- Detailed description (up to 16,000 characters)
- Summary (up to 132 characters)

**Recommended:**
- Screenshots: 1280x800 or 640x400 PNG (5 images)
- Large promotional tile: 920x680 PNG
- Marquee promotional tile: 1400x560 PNG

### Step 3: Submit Extension

1. Go to [Chrome Web Store Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New Item"**
3. Upload your ZIP file from `dist-zip/NoGoon-0.4.3-chrome.zip`
4. Fill in the store listing:
   - **Name**: NoGoon - Content Blocker
   - **Summary**: Block unwanted content and earn rewards with $NoGoon tokens
   - **Description**: (Detailed description of features)
   - **Category**: Productivity
   - **Language**: English
5. Upload promotional images and screenshots
6. Set privacy settings:
   - Privacy policy URL (required if collecting data)
   - Data usage disclosure
7. Choose visibility: **Public** or **Unlisted**
8. Click **"Submit for Review"**

### Step 4: Review Process

- Initial review: 1-3 business days
- Additional reviews: 1-2 days if changes requested
- Check email for review updates

### Step 5: Post-Approval

Once approved:
1. Extension will be live on Chrome Web Store
2. Share the store URL with users
3. Monitor reviews and ratings
4. Set up Google Analytics (optional)

---

## Part 4: Post-Deployment Checklist

### Backend Verification

- [ ] Health endpoint responding: `curl https://your-backend.railway.app/health`
- [ ] Database initialized: `curl https://your-backend.railway.app/api/v1/admin/check-tables`
- [ ] CORS configured with extension ID
- [ ] Environment variables set correctly
- [ ] Railway logs showing no errors

### Extension Verification

- [ ] Extension loads without errors
- [ ] Privy authentication works
- [ ] Backend API calls successful
- [ ] Content blocking functionality works
- [ ] Wallet integration works (Ethereum & Solana)
- [ ] No console errors in DevTools

### Security Checklist

- [ ] SECRET_KEY is strong and unique (32+ characters)
- [ ] PRIVY_APP_SECRET is not exposed in frontend
- [ ] ALLOWED_ORIGINS only includes extension ID (no wildcards)
- [ ] Rate limiting is enabled
- [ ] Database RLS policies are active
- [ ] HTTPS enabled on Railway (automatic)

### Monitoring Setup (Recommended)

1. **Railway Logs**: Monitor in Railway dashboard
2. **Error Tracking**: Consider adding Sentry
   ```bash
   # In Railway variables
   SENTRY_DSN=your_sentry_dsn_here
   ```
3. **Analytics**: Track extension usage with Google Analytics
4. **Uptime Monitoring**: Use UptimeRobot or similar for health endpoint

---

## Part 5: Updating After Initial Deployment

### Backend Updates

```bash
# Make changes to backend code
cd backend

# Commit and push
git add .
git commit -m "Update backend"
git push origin main

# Railway will auto-deploy from GitHub
# Monitor deployment in Railway dashboard
```

### Extension Updates

```bash
# Update version in package.json
# Example: "version": "0.4.4"

# Rebuild
pnpm clean:bundle && pnpm build && pnpm zip

# Upload new ZIP to Chrome Web Store
# New version will go through review process
```

---

## Part 6: Troubleshooting

### Backend Issues

**Issue: Database connection fails**
```bash
# Check DATABASE_URL is set
railway variables | grep DATABASE_URL

# Verify database is running
railway logs --service postgres
```

**Issue: CORS errors**
```bash
# Check allowed origins
railway variables | grep ALLOWED_ORIGINS

# Update if needed
railway variables set ALLOWED_ORIGINS='["chrome-extension://your-id"]'
```

**Issue: Privy authentication fails**
```bash
# Verify Privy credentials
railway variables | grep PRIVY

# Check Privy dashboard for app status
```

### Extension Issues

**Issue: "Failed to fetch" errors**
- Check backend URL in `.env.production`
- Verify backend is deployed and responding
- Check CORS settings in backend

**Issue: Extension won't load**
- Check `manifest.json` is valid
- Review `chrome://extensions` error messages
- Check browser console for errors

**Issue: Authentication not working**
- Verify PRIVY_APP_ID matches backend
- Check Privy dashboard for configuration
- Clear extension storage and retry

---

## Part 7: Production Maintenance

### Daily
- Monitor Railway logs for errors
- Check backend `/health` endpoint

### Weekly
- Review user feedback and ratings
- Check Railway usage and costs
- Monitor database size

### Monthly
- Update dependencies (security patches)
- Review and optimize database queries
- Archive old data if needed
- Test disaster recovery process

---

## Quick Reference Commands

```bash
# Backend health check
curl https://your-backend.railway.app/health

# Initialize database (first time only)
curl -X POST https://your-backend.railway.app/api/v1/admin/init-database

# Check database tables
curl https://your-backend.railway.app/api/v1/admin/check-tables

# Build extension
pnpm clean:bundle && pnpm build && pnpm zip

# Railway logs
railway logs --tail 100

# Railway restart service
railway restart

# Generate new secret key
openssl rand -hex 32
```

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions
- **Privy Docs**: https://docs.privy.io
- **FastAPI Docs**: https://fastapi.tiangolo.com

---

## Deployment Status

- [x] Code committed and pushed to GitHub
- [ ] Backend deployed to Railway
- [ ] Database initialized
- [ ] Extension built for production
- [ ] Extension tested locally
- [ ] Extension submitted to Chrome Web Store
- [ ] Chrome Web Store listing complete
- [ ] Extension approved and published

---

**Need Help?** 
- Check Railway logs: `railway logs`
- Check extension console: Open DevTools in extension popup
- Review API docs: `https://your-backend.railway.app/docs` (dev only)

