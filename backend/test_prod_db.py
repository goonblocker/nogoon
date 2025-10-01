#!/usr/bin/env python3
"""
Test production database and initialize tables if needed
"""
import asyncio
import os
import sys
from pathlib import Path

# Set production environment variables - try the original URL you provided
os.environ['DATABASE_URL'] = "postgresql://postgres:zeviEjJTqWxqWUAczOUYoJvvTDHPAwZo@maglev.proxy.rlwy.net:24427/railway"
os.environ['ENVIRONMENT'] = "production"
os.environ['PRIVY_APP_ID'] = "cmg74h4sm0035le0c1k99b1gz"
os.environ['PRIVY_APP_SECRET'] = "dummy_secret"
os.environ['SECRET_KEY'] = "8241765fd6789a58c58e739192e4fcf3add2d5ab9e96a9093a52b25544d78901"

# Import after setting environment
from app.database import engine, Base
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_and_init_database():
    """Test connection and initialize database tables"""
    try:
        logger.info("Testing production database connection...")
        logger.info(f"Environment: {settings.ENVIRONMENT}")
        logger.info(f"Database URL: {settings.DATABASE_URL[:30]}...")
        
        # Test connection and create tables
        async with engine.begin() as conn:
            logger.info("✅ Connected to production database!")
            
            # Create all tables
            logger.info("Creating database tables...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Database tables created/verified successfully!")
            
            # Check what tables were created
            result = await conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
            tables = result.fetchall()
            
            logger.info(f"Tables in database ({len(tables)} found):")
            for table in tables:
                logger.info(f"  - {table[0]}")
        
        logger.info("✅ Production database setup complete!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(test_and_init_database())
    sys.exit(0 if success else 1)