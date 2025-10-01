# 🚂 Railway Backend Deployment Fix Guide

## Problem Summary

Railway is incorrectly deploying the backend code to the PostgreSQL service instead of creating a separate backend API service. This happens because Railway auto-detects the nixpacks.toml and railway.toml files at the repository root.

## Solution: Create Separate Backend Service

### Step 1: Remove Root-Level Deployment Configs (IMPORTANT!)

First, we need to remove the deployment configuration files from the repository root to prevent Railway from auto-deploying to the wrong service:

```bash
# Remove these files from the repository root
rm nixpacks.toml
rm railway.toml
git add nixpacks.toml railway.toml
git commit -m "Remove root deployment configs to fix Railway deployment"
git push
```

### Step 2: Create Backend Service in Railway

1. Go to your Railway project: https://railway.app/project/2dba516d-304f-4e59-afa1-91178a8ec57f
2. Click the **"+ New"** button
3. Select **"GitHub Repo"**
4. Choose your repository: `jonathanpv/content-blocking-extension`
5. **IMPORTANT**: Set the following in the service settings:
   - **Service Name**: `backend-api` (or similar)
   - **Root Directory**: `/backend`
   - **Watch Paths**: `backend/**` (under Advanced settings)

### Step 3: Configure Environment Variables

In the new backend service, add these environment variables:

```bash
# Core Settings
ENVIRONMENT=production
PORT=8000

# Database (Railway will auto-inject these from Postgres service)
# DATABASE_URL will be automatically provided when you reference the Postgres service

# Privy Authentication
PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
PRIVY_APP_SECRET=4iU5owbvwJ4TdhUCQhE63iguj261qWwh6AK1QJEJ6K8qs49TWCaeWJYzEtifD4W7JoxAQac9ADkPwBwz2yu43J8p
PRIVY_VERIFICATION_KEY=auto_fetched_from_privy_api

# Security
SECRET_KEY=<generate with: openssl rand -hex 32>
ALLOWED_ORIGINS=["chrome-extension://YOUR_EXTENSION_ID","https://your-frontend-domain.com"]
ALLOWED_HOSTS=["*"]

# Subscription Settings
SUBSCRIPTION_PRICE_USD=4.99
TOKEN_PAYMENT_DISCOUNT=0.5
FREE_BLOCKS_PER_DAY=10

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Optional Web3
ETHEREUM_RPC_URL=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Step 4: Link Database Service

1. In your backend service settings, go to the **Variables** tab
2. Click **"Add Variable Reference"**
3. Select your PostgreSQL service
4. Choose `DATABASE_URL` and `DATABASE_PUBLIC_URL`
5. This will automatically inject the database connection strings

### Step 5: Deploy and Verify

1. Railway should automatically deploy after configuration
2. Check the deployment logs for any errors
3. Once deployed, test the health endpoint:

```bash
# Get your backend URL from Railway dashboard
curl https://your-backend-api.railway.app/health
```

### Step 6: Initialize Database

After successful deployment:

```bash
# Initialize database tables
curl -X POST https://your-backend-api.railway.app/api/v1/admin/init-database

# Verify tables were created
curl https://your-backend-api.railway.app/api/v1/admin/check-tables
```

## Alternative: Using Railway CLI

If you prefer using the CLI:

```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
cd /Users/alexalaniz/Documents/GitHub/content-blocking-extension
railway link 2dba516d-304f-4e59-afa1-91178a8ec57f

# Create new service
railway service create backend-api

# Set root directory for the service
railway variables set ROOT_DIRECTORY=/backend --service backend-api

# Deploy
railway up --service backend-api
```

## Local Development Setup

For local development without Railway:

```bash
cd backend

# Use local environment (SQLite)
./use_local_env.sh

# Start development server
./start_dev.sh
```

## Troubleshooting

### Issue: "Could not find root directory: backend"
- **Solution**: Ensure you've removed nixpacks.toml and railway.toml from the repository root
- Set the root directory to `/backend` (with leading slash) in Railway service settings

### Issue: Database connection fails
- **Solution**: Ensure you've added the database variable references in the backend service
- Check that DATABASE_URL is properly injected from the Postgres service

### Issue: Local development can't connect to Railway database
- **Solution**: Use the provided `use_local_env.sh` script to switch to SQLite for local development
- Only use Railway database in production

## Current Architecture

```
Railway Project
├── PostgreSQL Service (existing)
│   └── Database: railway
└── Backend API Service (new)
    └── Root: /backend
    └── Auto-connects to PostgreSQL via DATABASE_URL
```

## Next Steps

1. Remove root deployment configs and push to GitHub
2. Create backend service in Railway dashboard
3. Configure environment variables
4. Link database service
5. Deploy and initialize database
6. Update Chrome extension with production API URL