#!/usr/bin/env python3
"""
Real implementation for Railway deployment with database and authentication
"""
import os
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
import uvicorn

# Database imports
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index, select, func, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func as sql_func

# Authentication imports
import jwt
import httpx
import base64
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

import logging
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Print debug info
print(f"[STARTUP] Python {sys.version}", flush=True)
print(f"[STARTUP] PORT env: {os.getenv('PORT', 'NOT SET')}", flush=True)

# Configuration
class Settings:
    DATABASE_URL = os.getenv('DATABASE_URL', '')
    PRIVY_APP_ID = os.getenv('PRIVY_APP_ID', 'cmg74h4sm0035le0c1k99b1gz')
    PRIVY_APP_SECRET = os.getenv('PRIVY_APP_SECRET', '')
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'production')

settings = Settings()

# Database setup
class Base(DeclarativeBase):
    pass

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    wallet_address = Column(String(255), nullable=True, index=True)
    total_blocks_used = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=sql_func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=sql_func.now(), onupdate=sql_func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    blocks_usage = relationship("BlocksUsage", back_populates="user", cascade="all, delete-orphan")

class BlocksUsage(Base):
    __tablename__ = "blocks_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    blocks_used = Column(Integer, default=1, nullable=False)
    domain = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=sql_func.now(), nullable=False)
    
    user = relationship("User", back_populates="blocks_usage")

# Database engine setup
if settings.DATABASE_URL and not settings.DATABASE_URL.startswith("sqlite"):
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    engine = create_async_engine(
        db_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=3,
        max_overflow=5,
        pool_recycle=1800,
        pool_timeout=60,
        connect_args={
            "command_timeout": 30,
            "server_settings": {
                "application_name": "nogoon_backend",
                "tcp_keepalives_idle": "600",
                "tcp_keepalives_interval": "30",
                "tcp_keepalives_count": "3"
            }
        }
    )
    logger.info("Using PostgreSQL database")
else:
    engine = create_async_engine("sqlite+aiosqlite:///./nogoon.db", echo=False)
    logger.info("Using SQLite database")

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            logger.error(f"Database error: {e}")
            await session.rollback()
            raise

# Privy Authentication
class PrivyAuthenticator:
    def __init__(self):
        self.app_id = settings.PRIVY_APP_ID
        self.jwks_url = f"https://auth.privy.io/api/v1/apps/{self.app_id}/jwks.json"
        self._verification_key = None
    
    async def get_verification_key(self) -> str:
        if self._verification_key:
            return self._verification_key
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.jwks_url)
                response.raise_for_status()
                jwks_data = response.json()
                
                if "keys" not in jwks_data or not jwks_data["keys"]:
                    raise ValueError("No keys found in JWKS response")
                
                key_data = jwks_data["keys"][0]
                x = base64.urlsafe_b64decode(key_data["x"] + "==")
                y = base64.urlsafe_b64decode(key_data["y"] + "==")
                
                public_numbers = ec.EllipticCurvePublicNumbers(
                    int.from_bytes(x, 'big'),
                    int.from_bytes(y, 'big'),
                    ec.SECP256R1()
                )
                public_key = public_numbers.public_key()
                pem_key = public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                )
                
                self._verification_key = pem_key.decode('utf-8')
                logger.info("Privy verification key fetched successfully")
                return self._verification_key
                
        except Exception as e:
            logger.error(f"Error fetching Privy verification key: {e}")
            raise HTTPException(status_code=500, detail="Authentication service unavailable")
    
    async def verify_token(self, token: str) -> Dict[str, Any]:
        try:
            verification_key = await self.get_verification_key()
            payload = jwt.decode(
                token,
                verification_key,
                algorithms=["ES256"],
                audience=self.app_id,
                issuer="privy.io"
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")

privy_auth = PrivyAuthenticator()

# Pydantic models
class UsageStats(BaseModel):
    total_blocks_used: int
    blocks_used_today: int
    blocks_used_this_week: int
    blocks_used_this_month: int
    most_blocked_domains: List[Dict[str, Any]]

class AnalyticsResponse(BaseModel):
    status: str = "success"
    stats: UsageStats

class BlockEvent(BaseModel):
    domain: str
    count: int = 1

class BlockEventsRequest(BaseModel):
    events: List[BlockEvent]

class AuthRequest(BaseModel):
    access_token: str

class AuthResponse(BaseModel):
    status: str = "success"
    user_id: str
    total_blocks_used: int
    message: str = "Authentication successful"

# Authentication dependency
async def get_current_user(authorization: str = Header(...), db: AsyncSession = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    user_data = await privy_auth.verify_token(token)
    user_id = user_data.get("sub")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    # Get or create user
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        # Create new user
        user = User(
            user_id=user_id,
            email=user_data.get("email"),
            wallet_address=user_data.get("wallet", {}).get("address") if user_data.get("wallet") else None,
            last_login=datetime.utcnow()
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update last login
        user.last_login = datetime.utcnow()
        await db.commit()
    
    return user

# FastAPI app
app = FastAPI(title="NoGoon Backend API")

@app.get("/")
async def root():
    return {
        "message": "NoGoon Backend API", 
        "version": "1.0.0",
        "port": os.getenv('PORT', 'NOT SET')
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/admin/migrate-database")
async def migrate_database():
    """Migrate database schema to current version"""
    if not settings.DATABASE_URL:
        raise HTTPException(status_code=500, detail="No database configured")
    
    try:
        async with engine.begin() as conn:
            logger.info("Starting database migration...")
            
            # Check existing tables
            result = await conn.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' ORDER BY table_name;
            """))
            existing_tables = [row[0] for row in result.fetchall()]
            
            # Drop old tables
            old_tables = ['payments', 'subscriptions', 'payment_methods']
            for table in old_tables:
                if table in existing_tables:
                    await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
            
            # Recreate users table if it has old columns
            if 'users' in existing_tables:
                result = await conn.execute(text("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'users' AND table_schema = 'public';
                """))
                user_columns = [row[0] for row in result.fetchall()]
                old_columns = ['is_premium', 'subscription_status', 'preferred_payment_method']
                
                if any(col in user_columns for col in old_columns):
                    await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
            
            # Drop and recreate blocks_usage
            await conn.execute(text("DROP TABLE IF EXISTS blocks_usage CASCADE;"))
            
            # Create users table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL UNIQUE,
                    email VARCHAR(255),
                    wallet_address VARCHAR(255),
                    total_blocks_used INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    last_login TIMESTAMP WITH TIME ZONE
                );
            """))
            
            # Create blocks_usage table
            await conn.execute(text("""
                CREATE TABLE blocks_usage (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    blocks_used INTEGER NOT NULL DEFAULT 1,
                    domain VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """))
            
            # Create indexes
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_blocks_usage_user_id ON blocks_usage(user_id);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_usage_user_date ON blocks_usage(user_id, created_at);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_usage_domain ON blocks_usage(domain);"))
            
            return {
                "status": "success",
                "message": "Database migration completed successfully",
                "tables_created": ["users", "blocks_usage"]
            }
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

@app.get("/admin/check-schema")
async def check_schema():
    """Check current database schema"""
    if not settings.DATABASE_URL:
        raise HTTPException(status_code=500, detail="No database configured")
    
    try:
        async with engine.begin() as conn:
            # List tables
            result = await conn.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' ORDER BY table_name;
            """))
            tables = [row[0] for row in result.fetchall()]
            
            # Check users table columns
            users_columns = []
            if 'users' in tables:
                result = await conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                """))
                users_columns = [f"{row[0]} ({row[1]})" for row in result.fetchall()]
            
            # Check blocks_usage table columns
            blocks_columns = []
            if 'blocks_usage' in tables:
                result = await conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'blocks_usage' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                """))
                blocks_columns = [f"{row[0]} ({row[1]})" for row in result.fetchall()]
            
            # Count records
            user_count = 0
            blocks_count = 0
            if 'users' in tables:
                result = await conn.execute(text("SELECT COUNT(*) FROM users;"))
                user_count = result.scalar()
            if 'blocks_usage' in tables:
                result = await conn.execute(text("SELECT COUNT(*) FROM blocks_usage;"))
                blocks_count = result.scalar()
            
            return {
                "status": "success",
                "tables": tables,
                "users_table": {
                    "exists": 'users' in tables,
                    "columns": users_columns,
                    "record_count": user_count
                },
                "blocks_usage_table": {
                    "exists": 'blocks_usage' in tables,
                    "columns": blocks_columns,
                    "record_count": blocks_count
                }
            }
            
    except Exception as e:
        logger.error(f"Schema check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Schema check failed: {str(e)}")

@app.post("/api/v1/auth/login", response_model=AuthResponse)
async def login(request: AuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user with Privy token"""
    try:
        # Verify the Privy token
        user_data = await privy_auth.verify_token(request.access_token)
        user_id = user_data.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        # Get or create user
        result = await db.execute(select(User).where(User.user_id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user
            user = User(
                user_id=user_id,
                email=user_data.get("email"),
                wallet_address=user_data.get("wallet", {}).get("address") if user_data.get("wallet") else None,
                total_blocks_used=0,
                last_login=datetime.utcnow()
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Update last login
            user.last_login = datetime.utcnow()
            await db.commit()
        
        return AuthResponse(
            user_id=user.user_id,
            total_blocks_used=user.total_blocks_used
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@app.post("/api/v1/auth/verify", response_model=AuthResponse)
async def verify_token(request: AuthRequest, db: AsyncSession = Depends(get_db)):
    """Verify Privy token (alias for login)"""
    return await login(request, db)

@app.get("/api/v1/users/stats", response_model=AnalyticsResponse)
async def get_user_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get real user usage statistics"""
    try:
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)
        
        # Get blocks used today
        result = await db.execute(
            select(func.coalesce(func.sum(BlocksUsage.blocks_used), 0))
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.created_at >= today_start
            )
        )
        blocks_today = result.scalar() or 0
        
        # Get blocks used this week
        result = await db.execute(
            select(func.coalesce(func.sum(BlocksUsage.blocks_used), 0))
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.created_at >= week_start
            )
        )
        blocks_week = result.scalar() or 0
        
        # Get blocks used this month
        result = await db.execute(
            select(func.coalesce(func.sum(BlocksUsage.blocks_used), 0))
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.created_at >= month_start
            )
        )
        blocks_month = result.scalar() or 0
        
        # Get most blocked domains
        result = await db.execute(
            select(
                BlocksUsage.domain,
                func.count(BlocksUsage.id).label('count')
            )
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.domain.isnot(None)
            )
            .group_by(BlocksUsage.domain)
            .order_by(func.count(BlocksUsage.id).desc())
            .limit(10)
        )
        domains = [
            {"domain": row[0], "blocks": row[1]}
            for row in result.all()
        ]
        
        stats = UsageStats(
            total_blocks_used=user.total_blocks_used,
            blocks_used_today=int(blocks_today),
            blocks_used_this_week=int(blocks_week),
            blocks_used_this_month=int(blocks_month),
            most_blocked_domains=domains
        )
        
        return AnalyticsResponse(stats=stats)
        
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

@app.post("/api/v1/users/block-events")
async def sync_block_events(
    request: BlockEventsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sync block events from extension to database"""
    try:
        total_blocks = 0
        domains_processed = set()
        
        # Process each block event
        for event in request.events:
            # Create block usage record
            block_usage = BlocksUsage(
                user_id=user.user_id,
                domain=event.domain,
                blocks_used=event.count
            )
            db.add(block_usage)
            total_blocks += event.count
            domains_processed.add(event.domain)
        
        # Update user's total blocks
        user.total_blocks_used += total_blocks
        
        await db.commit()
        logger.info(f"Synced {len(request.events)} block events for user {user.user_id}, total blocks: {total_blocks}")
        
        return {
            "status": "success",
            "message": "Block events synced successfully",
            "events_processed": len(request.events),
            "total_blocks_added": total_blocks,
            "domains_processed": list(domains_processed)
        }
        
    except Exception as e:
        logger.error(f"Error syncing block events: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to sync block events")

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    print(f"[STARTUP] Starting real server on port {port}", flush=True)
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )