#!/usr/bin/env python3
"""
Initialize Railway PostgreSQL database
This script ensures the database is properly set up on Railway
"""
import asyncio
import os
import sys
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set environment variables for Railway
os.environ['ENVIRONMENT'] = 'production'

# Import after setting environment
from app.database import engine, Base
from app.config import settings

async def init_railway_database():
    """Initialize Railway PostgreSQL database"""
    logger.info("🚀 Initializing Railway PostgreSQL database...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Database URL: {settings.DATABASE_URL[:30]}...")
    
    if not settings.DATABASE_URL:
        logger.error("❌ No DATABASE_URL found in environment variables")
        return False
    
    try:
        # Test connection first
        logger.info("Testing database connection...")
        async with engine.connect() as conn:
            result = await conn.execute("SELECT 1")
            logger.info("✅ Database connection successful!")
        
        # Create all tables
        logger.info("Creating database tables...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ All tables created successfully!")
            
            # List created tables
            result = await conn.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            tables = result.fetchall()
            
            logger.info(f"📋 Tables in database ({len(tables)} total):")
            for table in tables:
                logger.info(f"  ✓ {table[0]}")
        
        # Test a simple insert/select to ensure everything works
        logger.info("Testing database operations...")
        from app.models import User
        from sqlalchemy import select
        from datetime import datetime
        
        async with engine.begin() as conn:
            # Test insert
            test_user = User(
                user_id="test_user_railway",
                email="test@railway.com",
                is_premium=False,
                free_blocks_remaining=10,
                last_free_blocks_reset_date=datetime.utcnow(),
                last_login=datetime.utcnow()
            )
            conn.add(test_user)
            await conn.commit()
            
            # Test select
            result = await conn.execute(select(User).where(User.user_id == "test_user_railway"))
            user = result.scalar_one_or_none()
            if user:
                logger.info("✅ Database operations test successful!")
                # Clean up test user
                await conn.delete(user)
                await conn.commit()
            else:
                logger.warning("⚠️  Test user not found after insert")
        
        logger.info("🎉 Railway database initialization complete!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(init_railway_database())
    if success:
        print("SUCCESS: Railway database initialized")
        sys.exit(0)
    else:
        print("FAILED: Railway database initialization failed")
        sys.exit(1)
