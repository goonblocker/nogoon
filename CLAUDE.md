# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NoGoon is a Chrome/Firefox browser extension for content blocking with a Python FastAPI backend. It uses NSFWJS for content detection and Privy for Web3 authentication.

## Essential Commands

### Frontend Development
```bash
# Install dependencies (requires pnpm 9.15.1)
pnpm install

# Development with HMR
pnpm dev              # Chrome development
pnpm dev:firefox      # Firefox development

# Production builds
pnpm build            # Chrome production build
pnpm build:firefox    # Firefox production build
pnpm zip              # Build and zip for Chrome store
pnpm zip:firefox      # Build and zip for Firefox store

# Code quality
pnpm lint             # Run ESLint with auto-fix
pnpm type-check       # TypeScript type checking
pnpm prettier         # Format code

# Testing
pnpm e2e              # Run E2E tests (requires built extension)
```

### Backend Development
```bash
cd backend

# Quick setup and start
./setup_local.sh      # Initial setup (creates venv, installs deps, configures .env)
./start_dev.sh        # Start development server

# Manual setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python init_db.py init
python main.py
```

## Architecture Overview

### Extension Architecture
The extension follows Chrome Extension Manifest V3 patterns with clear separation:

1. **Background Service Worker** (`chrome-extension/src/background/index.ts`):
   - Loads and manages NSFWJS TensorFlow model
   - Handles image classification requests from content scripts
   - Manages extension lifecycle and permissions

2. **Content Script** (`pages/content/src/ContentScript.tsx`):
   - Monitors DOM for images
   - Sends images to background for classification
   - Displays block overlays with troll messages (15% chance)
   - Tracks block counts and enforces free tier limits

3. **UI Components** (React + TypeScript):
   - Popup: Main extension interface
   - Side Panel: Extended UI for Chrome 114+
   - Options: Settings and preferences
   - Shared components in `packages/ui/`

### Backend Architecture
FastAPI server with async PostgreSQL:

1. **Authentication Flow**:
   - User authenticates via Privy in extension → receives JWT
   - Extension sends JWT to backend → backend validates with Privy
   - Backend creates/updates user record with Privy DID

2. **API Structure** (`backend/app/routes/`):
   - `/auth`: Privy token validation and user creation
   - `/users`: User profile and stats
   - `/blocks`: Block tracking and sync
   - `/admin`: Admin dashboard (protected)

3. **Database Models**:
   - Users table with Privy DID as unique identifier
   - Block history tracking
   - Subscription/payment ready (not yet implemented)

### Key Data Flows

1. **User Authentication**:
   ```
   Extension → Privy Login → JWT Token → Backend Validation → User Created/Updated
   ```

2. **Content Blocking**:
   ```
   Image Detected → Background Worker → NSFWJS Classification → Block/Allow Decision → UI Update
   ```

3. **Block Sync**:
   ```
   Local Storage → Batch Blocks → Backend API → PostgreSQL → Stats Updated
   ```

### Security Considerations

- Never expose database credentials to frontend
- All backend requests require valid Privy JWT
- CORS restricted to extension origins
- Extension ID validation for production
- Row-level security ready for multi-tenant use

### Development Tips

1. **Monorepo Structure**: Uses Turborepo with pnpm workspaces. Changes to shared packages automatically reflect across all consumers.

2. **Hot Module Reload**: Extension supports HMR in development. Changes to React components update without reloading.

3. **Environment Variables**:
   - Frontend: Copy `.env.example` to `.env`
   - Backend: Use `setup_local.sh` or manually configure `.env`

4. **Testing**: E2E tests require built extension. Run `pnpm build` before `pnpm e2e`.

5. **Deployment**:
   - Frontend: Build and upload to Chrome/Firefox stores
   - Backend: Deploy to Railway (see RAILWAY_FIX.md for current deployment workaround)

### Common Development Tasks

1. **Adding New API Endpoint**:
   - Create route in `backend/app/routes/`
   - Update API client in `packages/shared/lib/api/client.ts`
   - Add TypeScript types in `packages/shared/types/`

2. **Modifying Content Detection**:
   - Update `chrome-extension/src/background/index.ts` for model logic
   - Modify `pages/content/src/ContentScript.tsx` for UI behavior

3. **Adding New Extension Page**:
   - Create new directory under `pages/`
   - Add entry to `chrome-extension/manifest.ts`
   - Update `vite.config.ts` for build configuration