#!/usr/bin/env python3
"""
Initialize production database tables
This runs on Railway where it can access the database
"""
import asyncio
import logging
from app.database import engine, Base
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def main():
    """Initialize database tables"""
    logger.info("🚀 Initializing production database...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    if not settings.DATABASE_URL:
        logger.error("❌ No DATABASE_URL found")
        return False
    
    try:
        async with engine.begin() as conn:
            logger.info("Creating database tables...")
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
                
        logger.info("🎉 Database initialization complete!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(main())
    if success:
        print("SUCCESS: Database initialized")
    else:
        print("FAILED: Database initialization failed")
        exit(1)