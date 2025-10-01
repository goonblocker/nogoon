# 🚂 Railway Deployment Fix

## Problem

Railway is deploying the backend code to the **Postgres service** instead of creating a separate **Backend API service**.

## Solution: Create Backend Service

### Option 1: Using Railway Dashboard (Recommended)

1. Go to https://railway.app/project/2dba516d-304f-4e59-afa1-91178a8ec57f
2. Click **"+ New"** button
3. Select **"GitHub Repo"**
4. Choose your repository: `jonathanpv/content-blocking-extension`
5. Set the **Root Directory**: `backend`
6. Railway will auto-detect Python and deploy

### Option 2: Using Railway CLI

```bash
cd /Users/alexalaniz/Documents/GitHub/content-blocking-extension

# Create new service
railway service create backend-api

# Link to the new service
railway link --service backend-api

# Deploy
railway up
```

## Configure Environment Variables

Once the backend service is created, add these variables in Railway Dashboard:

```bash
ENVIRONMENT=production
PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
PRIVY_APP_SECRET=4iU5owbvwJ4TdhUCQhE63iguj261qWwh6AK1QJEJ6K8qs49TWCaeWJYzEtifD4W7JoxAQac9ADkPwBwz2yu43J8p
SECRET_KEY=<generate_new_with_openssl_rand_hex_32>
ALLOWED_ORIGINS=["chrome-extension://YOUR_EXTENSION_ID"]
```

## Connect to PostgreSQL

Railway will automatically provide `DATABASE_URL` from the Postgres service. The backend will use it automatically.

## Initialize Database

After deployment succeeds:

```bash
# Get the backend URL
curl https://your-backend-url.railway.app/health

# Initialize tables
curl -X POST https://your-backend-url.railway.app/api/v1/admin/init-database

# Check tables
curl https://your-backend-url.railway.app/api/v1/admin/check-tables
```

## Current Status

- ✅ PostgreSQL: Running and healthy
- ❌ Backend API: Needs separate service (currently deploying to Postgres service)

##Next Steps

1. Create backend service in Railway Dashboard
2. Set environment variables
3. Deploy
4. Initialize database via admin endpoint
5. Test with extension


