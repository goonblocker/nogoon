# Railway Backend Deployment Checklist

Use this checklist to deploy the NoGoon backend to Railway production.

## Pre-Deployment Checklist

- [ ] Railway account created
- [ ] GitHub repository connected to Railway
- [ ] PostgreSQL service provisioned in Railway
- [ ] Privy App ID and Secret available
- [ ] Code committed and pushed to GitHub

## Deployment Steps

### 1. Create Backend Service in Railway

- [ ] Go to Railway dashboard (https://railway.app)
- [ ] Click **"+ New"** in your project
- [ ] Select **"GitHub Repo"**
- [ ] Choose repository: `Alex-Alaniz/content-blocking-extension`
- [ ] Set **Root Directory**: `backend`
- [ ] Set **Watch Paths**: `backend/**`

### 2. Configure Environment Variables

Copy and paste these into Railway's Variables section:

```bash
# Core Settings
ENVIRONMENT=production
PORT=8000

# Privy Authentication
PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
PRIVY_APP_SECRET=4iU5owbvwJ4TdhUCQhE63iguj261qWwh6AK1QJEJ6K8qs49TWCaeWJYzEtifD4W7JoxAQac9ADkPwBwz2yu43J8p
PRIVY_VERIFICATION_KEY=auto_fetched_from_privy_api

# Security - GENERATE A NEW ONE!
SECRET_KEY=PASTE_YOUR_SECRET_KEY_HERE

# CORS - Update with your extension ID
ALLOWED_ORIGINS=["chrome-extension://YOUR_EXTENSION_ID"]
ALLOWED_HOSTS=["*"]

# Subscription Settings
SUBSCRIPTION_PRICE_USD=20.0
TOKEN_PAYMENT_DISCOUNT=0.5
FREE_BLOCKS_PER_DAY=10

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Optional Web3
ETHEREUM_RPC_URL=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Generate SECRET_KEY:**
```bash
openssl rand -hex 32
```

### 3. Link PostgreSQL Database

- [ ] In backend service → **Variables** tab
- [ ] Click **"Add Variable Reference"**
- [ ] Select PostgreSQL service
- [ ] Add reference to `DATABASE_URL`
- [ ] Add reference to `DATABASE_PUBLIC_URL`

### 4. Deploy Backend

- [ ] Save configuration
- [ ] Wait for deployment to complete
- [ ] Check **Deployments** tab for status
- [ ] Verify no errors in logs

### 5. Generate Domain

- [ ] Go to **Settings** tab
- [ ] Click **"Generate Domain"**
- [ ] Copy the domain URL (e.g., `https://backend-api-production.up.railway.app`)

### 6. Initialize Database

Test your backend and initialize the database:

```bash
# Set your backend URL
BACKEND_URL="https://your-backend-url.railway.app"

# Test health endpoint
curl $BACKEND_URL/health

# Expected output:
# {
#   "status": "healthy",
#   "environment": "production",
#   "version": "1.0.0"
# }

# Initialize database tables
curl -X POST $BACKEND_URL/api/v1/admin/init-database

# Expected output:
# {
#   "status": "success",
#   "message": "Database initialized"
# }

# Check tables were created
curl $BACKEND_URL/api/v1/admin/check-tables

# Expected output: List of tables (users, blocks_usage, payments, sync_logs)
```

### 7. Verify Deployment

- [ ] Health endpoint responds correctly
- [ ] Database tables created successfully
- [ ] No errors in Railway logs
- [ ] API documentation accessible (if in dev mode)

## Post-Deployment

### Update Extension Configuration

Once backend is deployed, update your extension:

1. Note your Railway backend URL
2. Update extension `.env.production`:
   ```bash
   VITE_BACKEND_URL=https://your-backend-url.railway.app
   ```
3. Rebuild extension:
   ```bash
   pnpm clean:bundle && pnpm build && pnpm zip
   ```

### Get Extension ID

1. Load unpacked extension in Chrome
2. Copy Extension ID
3. Update Railway `ALLOWED_ORIGINS`:
   ```bash
   ALLOWED_ORIGINS=["chrome-extension://YOUR_ACTUAL_EXTENSION_ID"]
   ```

### Security Check

- [ ] `SECRET_KEY` is unique and secure (32+ characters)
- [ ] `PRIVY_APP_SECRET` is not exposed in frontend
- [ ] `ALLOWED_ORIGINS` only includes extension ID (no wildcards)
- [ ] Database credentials not exposed in logs
- [ ] HTTPS enabled (automatic in Railway)

## Monitoring

### Daily Checks
- [ ] Check Railway logs for errors
- [ ] Test health endpoint
- [ ] Monitor database size

### Weekly Checks
- [ ] Review usage metrics
- [ ] Check for security updates
- [ ] Monitor costs

## Troubleshooting

### Issue: Database Connection Failed

```bash
# Check DATABASE_URL is set
railway variables | grep DATABASE_URL

# Check PostgreSQL service is running
railway logs --service postgres
```

### Issue: CORS Errors

```bash
# Verify allowed origins
railway variables | grep ALLOWED_ORIGINS

# Update with correct extension ID
railway variables set ALLOWED_ORIGINS='["chrome-extension://your-id"]'
```

### Issue: Health Check Fails

```bash
# Check service logs
railway logs --tail 100

# Check if service is running
railway status

# Restart service
railway restart
```

### Issue: Privy Authentication Fails

```bash
# Verify Privy credentials
railway variables | grep PRIVY

# Check Privy dashboard for app status
# https://dashboard.privy.io
```

## Rollback Procedure

If something goes wrong:

```bash
# Via Railway dashboard
1. Go to Deployments tab
2. Find last working deployment
3. Click "Redeploy"

# Via Railway CLI
railway rollback
```

## Update Procedure

To update backend after initial deployment:

```bash
# Make changes to code
cd backend

# Commit and push
git add .
git commit -m "Update: description of changes"
git push origin main

# Railway will auto-deploy
# Monitor in Railway dashboard
```

## Quick Reference

```bash
# Railway CLI commands
railway login                    # Login to Railway
railway link                     # Link to project
railway up                       # Deploy
railway logs --tail 100          # View logs
railway variables                # List variables
railway variables set KEY=VALUE  # Set variable
railway restart                  # Restart service
railway status                   # Check status
railway domain                   # Show domain
```

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Project Docs**: See PRODUCTION_DEPLOYMENT_GUIDE.md

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Backend URL**: _______________  
**Extension ID**: _______________  
**Notes**: _______________

