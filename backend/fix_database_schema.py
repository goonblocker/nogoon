#!/usr/bin/env python3
"""
Database schema migration script to fix Railway database
- Remove old payment/subscription tables
- Create correct simplified schema for stats tracking
"""
import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_database_schema():
    """Fix the database schema by dropping old tables and creating new ones"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        logger.error("No DATABASE_URL environment variable found")
        logger.info("Please set DATABASE_URL to your Railway PostgreSQL connection string")
        return False
    
    # Convert to asyncpg format
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Create engine
    engine = create_async_engine(database_url, echo=True)
    
    try:
        async with engine.begin() as conn:
            logger.info("🔍 Checking current database schema...")
            
            # Check existing tables
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """))
            existing_tables = [row[0] for row in result.fetchall()]
            logger.info(f"📋 Existing tables: {existing_tables}")
            
            # Drop old payment/subscription tables if they exist
            old_tables = ['payments', 'subscriptions', 'payment_methods']
            for table in old_tables:
                if table in existing_tables:
                    logger.info(f"🗑️  Dropping old table: {table}")
                    await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
            
            # Drop users table if it has old subscription columns
            if 'users' in existing_tables:
                logger.info("🔍 Checking users table schema...")
                result = await conn.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND table_schema = 'public'
                    ORDER BY column_name;
                """))
                user_columns = [row[0] for row in result.fetchall()]
                logger.info(f"📋 Users table columns: {user_columns}")
                
                # Check if it has old subscription columns
                old_columns = ['is_premium', 'subscription_status', 'subscription_start_date', 
                             'subscription_end_date', 'free_blocks_remaining', 'preferred_payment_method']
                has_old_columns = any(col in user_columns for col in old_columns)
                
                if has_old_columns:
                    logger.info("🗑️  Dropping users table with old schema...")
                    await conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
            
            # Drop blocks_usage if it exists (to recreate with correct schema)
            if 'blocks_usage' in existing_tables:
                logger.info("🗑️  Dropping blocks_usage table to recreate...")
                await conn.execute(text("DROP TABLE IF EXISTS blocks_usage CASCADE;"))
            
            # Create users table with simplified schema
            logger.info("📋 Creating users table...")
            await conn.execute(text("""
                CREATE TABLE users (
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
            
            # Create indexes for users table
            await conn.execute(text("CREATE INDEX idx_users_user_id ON users(user_id);"))
            await conn.execute(text("CREATE INDEX idx_users_email ON users(email);"))
            await conn.execute(text("CREATE INDEX idx_user_blocks ON users(user_id, total_blocks_used);"))
            
            # Create blocks_usage table
            logger.info("📋 Creating blocks_usage table...")
            await conn.execute(text("""
                CREATE TABLE blocks_usage (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    blocks_used INTEGER NOT NULL DEFAULT 1,
                    domain VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """))
            
            # Create indexes for blocks_usage table
            await conn.execute(text("CREATE INDEX idx_blocks_usage_user_id ON blocks_usage(user_id);"))
            await conn.execute(text("CREATE INDEX idx_usage_user_date ON blocks_usage(user_id, created_at);"))
            await conn.execute(text("CREATE INDEX idx_usage_domain ON blocks_usage(domain);"))
            await conn.execute(text("CREATE INDEX idx_usage_user_domain ON blocks_usage(user_id, domain);"))
            
            # Create sync_logs table for debugging
            logger.info("📋 Creating sync_logs table...")
            await conn.execute(text("""
                CREATE TABLE sync_logs (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    sync_type VARCHAR(50) NOT NULL,
                    sync_status VARCHAR(50) NOT NULL DEFAULT 'success',
                    blocks_synced INTEGER NOT NULL DEFAULT 0,
                    error_message TEXT,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );
            """))
            
            await conn.execute(text("CREATE INDEX idx_sync_user_date ON sync_logs(user_id, created_at);"))
            
            # Create updated_at trigger for users table
            logger.info("📋 Creating updated_at trigger...")
            await conn.execute(text("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """))
            
            await conn.execute(text("""
                CREATE TRIGGER update_users_updated_at 
                BEFORE UPDATE ON users 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
            """))
            
            logger.info("✅ Database schema migration completed successfully!")
            
            # Verify the new schema
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """))
            new_tables = [row[0] for row in result.fetchall()]
            logger.info(f"📋 Final tables: {new_tables}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Error during database migration: {e}")
        return False
    finally:
        await engine.dispose()

async def test_schema():
    """Test the new schema by inserting sample data"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        return False
    
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    engine = create_async_engine(database_url)
    
    try:
        async with engine.begin() as conn:
            logger.info("🧪 Testing new schema with sample data...")
            
            # Insert test user
            await conn.execute(text("""
                INSERT INTO users (user_id, email, total_blocks_used) 
                VALUES ('test_user_123', 'test@example.com', 0)
                ON CONFLICT (user_id) DO NOTHING;
            """))
            
            # Insert test block usage
            await conn.execute(text("""
                INSERT INTO blocks_usage (user_id, blocks_used, domain) 
                VALUES ('test_user_123', 5, 'example.com');
            """))
            
            # Test stats query
            result = await conn.execute(text("""
                SELECT 
                    u.user_id,
                    u.total_blocks_used,
                    COUNT(bu.id) as usage_records,
                    SUM(bu.blocks_used) as total_usage
                FROM users u
                LEFT JOIN blocks_usage bu ON u.user_id = bu.user_id
                WHERE u.user_id = 'test_user_123'
                GROUP BY u.user_id, u.total_blocks_used;
            """))
            
            row = result.fetchone()
            if row:
                logger.info(f"✅ Schema test successful!")
                logger.info(f"   User: {row[0]}")
                logger.info(f"   Total blocks: {row[1]}")
                logger.info(f"   Usage records: {row[2]}")
                logger.info(f"   Sum of usage: {row[3]}")
                return True
            else:
                logger.error("❌ Schema test failed - no data returned")
                return False
                
    except Exception as e:
        logger.error(f"❌ Error testing schema: {e}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    print("🚀 NoGoon Database Schema Migration")
    print("===================================")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--test-only":
        # Test existing schema
        success = asyncio.run(test_schema())
    else:
        # Run full migration
        success = asyncio.run(fix_database_schema())
        if success:
            print("\n🧪 Testing new schema...")
            test_success = asyncio.run(test_schema())
            success = success and test_success
    
    if success:
        print("\n🎉 Database migration completed successfully!")
        print("The database now has the correct schema for stats tracking.")
    else:
        print("\n❌ Database migration failed!")
        print("Please check the logs above for error details.")
        sys.exit(1)