"""
Database initialization script for Railway PostgreSQL
Run this script to create tables and set up Row Level Security
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine, Base
from app.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_database():
    """Initialize database with tables and RLS policies"""
    logger.info(f"Initializing database for environment: {settings.ENVIRONMENT}")
    logger.info(f"Database URL: {settings.DATABASE_URL[:30]}...")  # Only show first 30 chars for security
    
    try:
        # Create all tables
        async with engine.begin() as conn:
            logger.info("Creating database tables...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Database tables created successfully")
        
        # For PostgreSQL production, set up RLS policies
        if settings.ENVIRONMENT == "production" and "postgresql" in settings.DATABASE_URL:
            logger.info("Setting up Row Level Security policies...")
            try:
                from app.database import init_rls_policies
                await init_rls_policies()
                logger.info("✅ RLS policies initialized successfully")
            except Exception as e:
                logger.warning(f"⚠️  RLS setup skipped (may already exist): {e}")
        
        logger.info("✅ Database initialization complete!")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise
    finally:
        await engine.dispose()


async def reset_database():
    """Drop all tables and recreate - USE WITH CAUTION"""
    logger.warning("⚠️  DROPPING ALL TABLES - This will delete all data!")
    
    response = input("Are you sure you want to drop all tables? Type 'yes' to confirm: ")
    if response.lower() != 'yes':
        logger.info("Operation cancelled")
        return
    
    try:
        async with engine.begin() as conn:
            logger.info("Dropping all tables...")
            await conn.run_sync(Base.metadata.drop_all)
            logger.info("✅ All tables dropped")
            
            logger.info("Recreating tables...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Tables recreated")
        
        logger.info("✅ Database reset complete!")
        
    except Exception as e:
        logger.error(f"❌ Database reset failed: {e}")
        raise
    finally:
        await engine.dispose()


async def check_connection():
    """Test database connection"""
    logger.info("Testing database connection...")
    
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful!")
            return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False
    finally:
        await engine.dispose()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Database initialization script")
    parser.add_argument(
        "command",
        choices=["init", "reset", "check"],
        help="Command to run: init (create tables), reset (drop and recreate), check (test connection)"
    )
    
    args = parser.parse_args()
    
    if args.command == "init":
        asyncio.run(init_database())
    elif args.command == "reset":
        asyncio.run(reset_database())
    elif args.command == "check":
        asyncio.run(check_connection())

