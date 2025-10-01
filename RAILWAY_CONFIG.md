# Railway Deployment Configuration

## Problem Solved

This configuration resolves the issue where Railway was detecting multiple services due to the presence of multiple `package.json` files in the monorepo structure. Railway was trying to deploy every package as a separate service instead of only deploying the backend.

## Configuration Files Added/Modified

### 1. `/railway.json` (Root Configuration)
- **Purpose**: Main Railway configuration that explicitly defines how to deploy only the backend service
- **Key Features**:
  - Uses NIXPACKS builder
  - Watches only `backend/**` files for changes
  - Configures proper start command with `cd backend`
  - Sets up health check endpoint
  - Configures restart policy

### 2. `/nixpacks.toml` (Build Configuration)
- **Purpose**: Explicit build configuration for Python/FastAPI application
- **Key Features**:
  - Specifies Python 3.11 as the runtime
  - Installs dependencies from `backend/requirements.txt`
  - Runs database initialization check
  - Sets proper start command
  - Forces Python provider (ignores Node.js detection)

### 3. `/.railwayignore` (Deployment Exclusions)
- **Purpose**: Prevents Railway from detecting Node.js packages and other irrelevant files
- **Key Features**:
  - Ignores all Node.js related files (`package.json`, `node_modules`, etc.)
  - Excludes frontend directories (`chrome-extension/`, `packages/`, `pages/`)
  - Only includes the `backend/` directory and essential config files
  - Prevents multiple service detection

## Files Removed

- `railway.toml` (was causing conflicts with `railway.json`)
- `backend/railway.json` (moved configuration to root level)
- `backend/nixpacks.toml` (moved configuration to root level)

## How This Fixes the Issue

1. **Single Service Detection**: Railway now sees this as a single Python service instead of multiple Node.js services
2. **Explicit Backend Focus**: All build and deploy commands are explicitly scoped to the `backend/` directory
3. **Proper File Watching**: Only watches `backend/**` files for deployment triggers
4. **Clean Build Process**: Uses standardized Python build process without Node.js interference

## Deployment Steps

1. **Push Changes**: Commit and push the new configuration files
2. **Railway Auto-Deploy**: Railway will automatically detect the new configuration and deploy only the backend
3. **Verify Single Service**: Check Railway dashboard to confirm only one service is created
4. **Set Environment Variables**: Add required environment variables in Railway dashboard
5. **Initialize Database**: Use the admin endpoints to set up database tables

## Environment Variables Required

```bash
ENVIRONMENT=production
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
SECRET_KEY=your_secret_key
ALLOWED_ORIGINS=["chrome-extension://your_extension_id"]
```

Railway will automatically provide `DATABASE_URL` from the connected PostgreSQL service.

## Testing the Deployment

After deployment, test the service:

```bash
# Health check
curl https://your-backend-url.railway.app/health

# Initialize database
curl -X POST https://your-backend-url.railway.app/api/v1/admin/init-database

# Check database tables
curl https://your-backend-url.railway.app/api/v1/admin/check-tables
```

## Notes

- The configuration is designed to work with Railway's auto-detection while being explicit about deployment requirements
- All Node.js related files are ignored to prevent confusion
- The backend directory contains all the Python/FastAPI application code
- Railway will use the PostgreSQL service that's already configured in your project