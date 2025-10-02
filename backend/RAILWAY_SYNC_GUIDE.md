# Railway Service Sync Guide

## 🚀 Quick Setup

Since both your PostgreSQL service and backend are in the same Railway project, here's how to sync them:

### 1. Link to Your Project

```bash
cd backend
railway link
# Select your project from the list
# Choose environment (usually 'production')
```

### 2. Verify Services Are Connected

```bash
# Check project status
railway status

# List all services in the project
railway list

# Check environment variables
railway variables
```

### 3. Sync Database

```bash
# Test database connection
railway run psql $DATABASE_URL -c "SELECT 1;"

# Initialize database tables
railway run python init_railway_db.py

# Or use the interactive database script
railway run python init_db.py init
```

### 4. Deploy Backend

```bash
# Deploy the backend service
railway up

# Check deployment status
railway logs
```

### 5. Verify Everything Works

```bash
# Get service URL
railway domain

# Test health endpoint
curl https://your-service-url.railway.app/health
```

## 🔧 Manual Commands

### Database Operations

```bash
# Connect to database
railway run psql $DATABASE_URL

# Run database initialization
railway run python init_railway_db.py

# Check database tables
railway run psql $DATABASE_URL -c "\dt"
```

### Backend Operations

```bash
# Deploy backend
railway up

# View logs
railway logs

# Check service status
railway status
```

### Environment Variables

```bash
# View all variables
railway variables

# Set a variable
railway variables --set "KEY=value"

# View variables for specific service
railway variables --service backend
```

## 🏥 Health Check

After syncing, test these endpoints:

1. **Health Check**: `https://your-service-url.railway.app/health`
   - Should show `"database": "connected"`
   - Should show table count and connection details

2. **API Test**: `https://your-service-url.railway.app/api/v1/auth/login`
   - Should return proper error (not 500)

3. **Stats API**: `https://your-service-url.railway.app/api/v1/users/stats`
   - Should work with proper authentication

## 🚨 Troubleshooting

### Database Connection Issues

```bash
# Check if database URL is correct
railway variables | grep DATABASE_URL

# Test connection manually
railway run psql $DATABASE_URL -c "SELECT version();"

# Check if tables exist
railway run psql $DATABASE_URL -c "\dt"
```

### Backend Issues

```bash
# Check logs for errors
railway logs --tail 50

# Restart service
railway up --detach

# Check service status
railway status
```

### Environment Variables

```bash
# Make sure all required variables are set
railway variables | grep -E "(DATABASE_URL|PRIVY_APP_ID|SECRET_KEY)"

# Set missing variables
railway variables --set "PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz"
railway variables --set "SECRET_KEY=your-secret-key"
```

## 📋 Required Environment Variables

Make sure these are set in your Railway project:

```bash
DATABASE_URL=postgresql://postgres:password@host:port/database
PRIVY_APP_ID=cmg74h4sm0035le0c1k99b1gz
PRIVY_APP_SECRET=your-privy-secret
SECRET_KEY=your-secret-key
ENVIRONMENT=production
```

## 🎯 Expected Results

After successful sync:

1. ✅ Database connection established
2. ✅ All tables created
3. ✅ Backend deployed and running
4. ✅ Health check shows "connected"
5. ✅ API endpoints working
6. ✅ Chrome extension can authenticate

## 🆘 Need Help?

If you're still having issues:

1. Run the interactive sync script: `./railway_sync.sh`
2. Check Railway dashboard for service status
3. Review logs: `railway logs`
4. Test database connection manually
5. Verify environment variables are set correctly
