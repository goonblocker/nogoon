"""
NoGoon Chrome Extension Backend Server
FastAPI server with Privy authentication, PostgreSQL database, and payment processing
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from contextlib import asynccontextmanager
import logging
import asyncio

from app.config import settings
from app.database import engine, Base, init_rls_policies
from app.routes import auth, users, payments, sync, admin
from app.middleware import log_requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting NoGoon Backend Server...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Add startup delay for Railway database
    if settings.DATABASE_URL and "railway" in settings.DATABASE_URL:
        logger.info("Waiting for Railway database to be ready...")
        await asyncio.sleep(5)  # Wait 5 seconds for Railway database

    # Create database tables (only if DATABASE_URL is provided)
    if settings.DATABASE_URL:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                logger.info("Database tables created/verified")
                
                # Run schema migration to simplify the database
                try:
                    import sys
                    import os
                    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
                    from init_simplified_db import init_simplified_schema
                    await init_simplified_schema()
                    logger.info("Schema migration completed successfully")
                except Exception as e:
                    logger.warning(f"Schema migration failed (non-critical): {e}")
                    # Continue anyway - the app can work with existing schema
                
                # Initialize RLS policies (safe to run repeatedly)
                try:
                    await init_rls_policies()
                    logger.info("RLS policies initialized/verified")
                except Exception as rls_error:
                    logger.warning(f"RLS policy initialization skipped/failed: {rls_error}")
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"Database initialization failed (attempt {attempt + 1}), retrying in 3s: {e}")
                    await asyncio.sleep(3)
                else:
                    logger.warning(f"Database initialization failed after {max_retries} attempts: {e}")
    else:
        logger.info("No DATABASE_URL provided, skipping database initialization")
    
    yield
    
    # Shutdown
    logger.info("Shutting down NoGoon Backend Server...")
    if settings.DATABASE_URL:
        try:
            await engine.dispose()
        except Exception as e:
            logger.warning(f"Database cleanup failed: {e}")

# Initialize FastAPI app
app = FastAPI(
    title="NoGoon Backend API",
    description="Backend server for NoGoon Chrome Extension with Privy auth and payment processing",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware - restrict to extension origin only
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# Custom middleware
app.middleware("http")(log_requests)

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint with database connectivity test"""
    try:
        # Test database connection
        db_status = "unknown"
        db_details = {}
        
        if settings.DATABASE_URL:
            try:
                from sqlalchemy import text
                # Test basic connection
                async with engine.connect() as conn:
                    result = await conn.execute(text("SELECT 1 as test"))
                    row = result.fetchone()
                    if row and row[0] == 1:
                        db_status = "connected"
                        db_details["test_query"] = "success"
                    
                    # Test table existence
                    try:
                        result = await conn.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
                        table_count = result.scalar()
                        db_details["table_count"] = table_count
                    except Exception as table_error:
                        db_details["table_error"] = str(table_error)[:50]
                        
            except Exception as db_error:
                db_status = f"error: {str(db_error)[:100]}"
                db_details["error_type"] = type(db_error).__name__
        else:
            db_status = "no_database_url"
        
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0",
            "database": db_status,
            "database_details": db_details,
            "privy_app_id": settings.PRIVY_APP_ID,
            "database_url_preview": settings.DATABASE_URL[:30] + "..." if settings.DATABASE_URL else "none"
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "error": str(e),
            "version": "1.0.0",
            "database": "unknown"
        }

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(sync.router, prefix="/api/v1/sync", tags=["Sync"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "NoGoon Backend API",
        "version": "1.0.0",
        "docs": "/docs" if settings.ENVIRONMENT == "development" else "disabled"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level="info"
    )

