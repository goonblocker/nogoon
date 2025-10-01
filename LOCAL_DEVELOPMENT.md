# Local Development Setup Guide

This guide will help you set up the NoGoon extension and backend for local development and testing.

## Prerequisites

- **Node.js** 18+ and **pnpm**
- **Python** 3.11+
- **Railway CLI** (optional but recommended)
- **Chrome** or Chromium-based browser
- **Privy Account** (free at https://dashboard.privy.io)

## Part 1: Backend Setup

### Step 1: Get Railway Database Credentials

Your PostgreSQL database is already deployed on Railway. You need to get the connection details:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
cd backend
railway link

# View your database credentials
railway variables
```

Look for these variables:
- `DATABASE_PUBLIC_URL` - Use this for local development
- `RAILWAY_TCP_PROXY_PORT` - The port number for your database proxy

### Step 2: Get Privy Credentials

1. Go to https://dashboard.privy.io/
2. Sign in and select your app
3. Get your credentials:
   - **App ID**: Found in app settings (e.g., `cmg74h4sm0035le0c1k99b1gz`)
   - **App Secret**: Found in app settings > API Keys (⚠️ Keep this secret!)

### Step 3: Run Backend Setup Script

```bash
cd backend

# Make scripts executable
chmod +x setup_local.sh start_dev.sh

# Run setup (this will create .env and install dependencies)
./setup_local.sh
```

The script will:
- Create a Python virtual environment
- Install all dependencies
- Create `.env` file with Railway database credentials
- Test database connection
- Initialize database tables

### Step 4: Configure Environment Variables

Edit `backend/.env` and add your Privy credentials:

```env
# Update these with your actual Privy credentials
PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
PRIVY_APP_SECRET=your_actual_secret_here
```

### Step 5: Initialize Database

```bash
cd backend
source venv/bin/activate

# Check database connection
python init_db.py check

# Initialize database tables
python init_db.py init
```

This creates the following tables:
- `users` - User accounts with Privy ID, wallets, subscription status
- `blocks_usage` - Track individual content blocks for analytics
- `payments` - Payment transactions for premium subscriptions
- `sync_logs` - Sync operation logs

### Step 6: Start Backend Server

```bash
# Option 1: Use the quick start script
./start_dev.sh

# Option 2: Manual start
source venv/bin/activate
python main.py
```

The server will start at `http://localhost:8000`

Test it:
```bash
curl http://localhost:8000/health
# Should return: {"status":"healthy","environment":"development","version":"1.0.0"}
```

View API docs at: http://localhost:8000/docs

## Part 2: Extension Setup

### Step 1: Install Dependencies

```bash
# From project root
pnpm install
```

### Step 2: Configure Extension Environment

Create a `.env` file in the project root:

```env
# Privy App ID (same as backend)
VITE_PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz

# Backend URL (local development)
VITE_BACKEND_URL=http://localhost:8000
```

### Step 3: Build the Extension

```bash
pnpm build
```

This creates the extension in `dist/chrome-extension/`

### Step 4: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/chrome-extension/` folder
5. Note your **Extension ID** (looks like `kjmbccjnkgcpboiiomckhdogdhociajd`)

### Step 5: Update CORS Settings

Update `backend/.env` with your extension ID:

```env
ALLOWED_ORIGINS=["chrome-extension://YOUR_ACTUAL_EXTENSION_ID","http://localhost:3000","http://localhost:8000"]
```

Restart the backend server after updating.

## Part 3: Testing the Integration

### Test 1: Authentication Flow

1. Click the extension icon in Chrome
2. Click "Sign In with Privy"
3. Complete Privy authentication (email or social login)
4. Check backend logs - you should see:
   ```
   User <user_id> logged in
   ```
5. Check Chrome DevTools > Console - you should see:
   ```
   [Popup] Backend sync successful
   ```

### Test 2: Free Blocks

1. After logging in, you should see "Free Blocks Remaining: 10/10"
2. Visit a test website
3. Trigger content blocking (if implemented)
4. Check backend logs for sync operations
5. Free blocks should decrement

### Test 3: Backend API Endpoints

```bash
# Get your access token from extension
# Open DevTools > Application > Local Storage > chrome-extension://...
# Look for Privy auth token

# Test auth verification
curl -X POST http://localhost:8000/api/v1/auth/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test sync endpoint
curl -X GET http://localhost:8000/api/v1/sync/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Test user stats
curl -X GET http://localhost:8000/api/v1/users/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test 4: Database Inspection

```bash
# Connect to Railway PostgreSQL
railway run psql $DATABASE_URL

# View users
SELECT user_id, email, is_premium, free_blocks_remaining FROM users;

# View blocks usage
SELECT user_id, blocks_used, domain, created_at FROM blocks_usage ORDER BY created_at DESC LIMIT 10;

# Exit
\q
```

## Part 4: Development Workflow

### Hot Reload (Extension)

```bash
# Watch mode - rebuilds on file changes
pnpm dev
```

After rebuilding, click the refresh icon in `chrome://extensions/`

### Backend Development

The backend uses `uvicorn` with auto-reload in development mode. Just save your Python files and the server will restart automatically.

### Viewing Logs

**Backend Logs:**
- Printed to terminal where you ran `python main.py`
- Includes all API requests, database operations, and errors

**Extension Logs:**
- Open extension popup
- Right-click > Inspect
- Check Console tab for logs

## Part 5: Common Issues & Solutions

### Issue: "Database connection failed"

**Solution:**
1. Check `.env` has correct `DATABASE_URL`
2. Verify Railway database is running: `railway status`
3. Check proxy port number matches Railway dashboard
4. Test connection: `python init_db.py check`

### Issue: "CORS error in browser"

**Solution:**
1. Update `backend/.env` with correct extension ID
2. Make sure `ALLOWED_ORIGINS` includes your extension ID
3. Restart backend server
4. Hard refresh extension (remove and re-add)

### Issue: "Privy verification failed"

**Solution:**
1. Verify `PRIVY_APP_ID` matches in both frontend and backend
2. Check `PRIVY_APP_SECRET` is correct in backend `.env`
3. Ensure you're using App Secret (not App ID) in backend
4. Check Privy dashboard for any app issues

### Issue: "Backend not available" warning in extension

**Solution:**
1. Make sure backend server is running: `./start_dev.sh`
2. Check `VITE_BACKEND_URL` in root `.env` is `http://localhost:8000`
3. Test health endpoint: `curl http://localhost:8000/health`
4. Check browser console for detailed error

### Issue: "Module not found" errors

**Solution:**
```bash
# Reinstall dependencies
pnpm install

# Rebuild extension
pnpm build

# For backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

## Part 6: Database Management

### Reset Database (Careful! Deletes all data)

```bash
cd backend
source venv/bin/activate
python init_db.py reset
```

### Create Backup

```bash
# Backup database
railway run pg_dump $DATABASE_URL > backup.sql

# Restore backup
railway run psql $DATABASE_URL < backup.sql
```

### Add Test Data

```python
# Create test_data.py in backend/
import asyncio
from app.database import AsyncSessionLocal
from app.models import User
from datetime import datetime

async def create_test_user():
    async with AsyncSessionLocal() as session:
        user = User(
            user_id="test-user-123",
            email="test@example.com",
            is_premium=True,
            free_blocks_remaining=10,
            last_free_blocks_reset_date=datetime.utcnow()
        )
        session.add(user)
        await session.commit()
        print("Test user created")

asyncio.run(create_test_user())
```

## Part 7: Next Steps

### Deploy to Railway

```bash
cd backend
railway up
railway domain  # Get your production URL
```

### Update Extension for Production

1. Update `.env`:
   ```env
   VITE_BACKEND_URL=https://your-app.railway.app
   ```
2. Rebuild: `pnpm build`
3. Update backend CORS with production extension ID

### Enable Payments

1. Integrate Stripe or crypto payment processor
2. Update `backend/app/routes/payments.py`
3. Add webhook handlers
4. Test payment flow

## Support

- **Backend Issues**: Check `backend/DEPLOYMENT.md`
- **Privy Issues**: https://docs.privy.io/
- **Railway Issues**: https://docs.railway.app/
- **Extension Development**: https://developer.chrome.com/docs/extensions/

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Keep `PRIVY_APP_SECRET` secret
- [ ] Use different Privy apps for dev/prod
- [ ] Don't expose database credentials in extension
- [ ] Always use HTTPS in production
- [ ] Enable Row Level Security in production database
- [ ] Set up proper CORS restrictions
- [ ] Use rate limiting in production

---

**Happy Development! 🚀**

