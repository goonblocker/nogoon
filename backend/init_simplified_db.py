#!/usr/bin/env python3
"""
Initialize simplified database schema
This script will be run on Railway to update the database schema
"""
import asyncio
import asyncpg
import os
import logging
from sqlalchemy import text
from app.database import get_db_engine
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_simplified_schema():
    """Initialize the simplified database schema"""
    if not settings.DATABASE_URL:
        logger.error("DATABASE_URL not set, cannot initialize database")
        return
    
    # Parse DATABASE_URL to get connection details
    # postgresql://user:password@host:port/database
    url_parts = settings.DATABASE_URL.replace("postgresql://", "").split("/")
    db_name = url_parts[1]
    auth_parts = url_parts[0].split("@")
    user_pass = auth_parts[0].split(":")
    user = user_pass[0]
    password = user_pass[1]
    host_port = auth_parts[1].split(":")
    host = host_port[0]
    port = int(host_port[1]) if len(host_port) > 1 else 5432
    
    # Connect to database
    conn = await asyncpg.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name
    )
    
    try:
        logger.info("Starting database schema simplification...")
        
        # 1. Drop subscription/payment related columns from users table
        logger.info("Removing subscription columns from users table...")
        await conn.execute("""
            ALTER TABLE users 
            DROP COLUMN IF EXISTS is_premium,
            DROP COLUMN IF EXISTS subscription_status,
            DROP COLUMN IF EXISTS subscription_start_date,
            DROP COLUMN IF EXISTS subscription_end_date,
            DROP COLUMN IF EXISTS free_blocks_remaining,
            DROP COLUMN IF EXISTS last_free_blocks_reset_date,
            DROP COLUMN IF EXISTS preferred_payment_method;
        """)
        
        # 2. Drop payment table
        logger.info("Dropping payments table...")
        await conn.execute("DROP TABLE IF EXISTS payments CASCADE;")
        
        # 3. Simplify blocks_usage table
        logger.info("Simplifying blocks_usage table...")
        await conn.execute("""
            ALTER TABLE blocks_usage 
            DROP COLUMN IF EXISTS is_premium_block;
        """)
        
        # 4. Update indexes for better performance
        logger.info("Updating indexes...")
        await conn.execute("""
            -- Drop old indexes
            DROP INDEX IF EXISTS idx_user_subscription;
            DROP INDEX IF EXISTS idx_payment_user_status;
            DROP INDEX IF EXISTS idx_payment_date;
            
            -- Create new optimized indexes
            CREATE INDEX IF NOT EXISTS idx_user_blocks ON users (user_id, total_blocks_used);
            CREATE INDEX IF NOT EXISTS idx_usage_domain ON blocks_usage (domain);
            CREATE INDEX IF NOT EXISTS idx_usage_user_domain ON blocks_usage (user_id, domain);
        """)
        
        # 5. Update any existing data to ensure consistency
        logger.info("Updating existing data...")
        await conn.execute("""
            -- Ensure total_blocks_used is accurate
            UPDATE users 
            SET total_blocks_used = COALESCE((
                SELECT SUM(blocks_used) 
                FROM blocks_usage 
                WHERE blocks_usage.user_id = users.user_id
            ), 0);
        """)
        
        # 6. Add constraints
        logger.info("Adding constraints...")
        await conn.execute("""
            ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_total_blocks_non_negative 
            CHECK (total_blocks_used >= 0);
        """)
        
        logger.info("Database schema simplification completed successfully!")
        
    except Exception as e:
        logger.error(f"Schema simplification failed: {e}")
        raise
    finally:
        await conn.close()

async def main():
    """Main function"""
    await init_simplified_schema()

if __name__ == "__main__":
    asyncio.run(main())
