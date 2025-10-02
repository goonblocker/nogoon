#!/usr/bin/env python3
"""
Railway Database Initialization Script
This script initializes the database tables on Railway
"""
import asyncio
import os
import sys
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment variables
os.environ['ENVIRONMENT'] = 'production'

try:
    from app.database import engine
    from sqlalchemy import text
except ImportError as e:
    print(f"Import error: {e}")
    print("Trying to install requirements...")
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
    from app.database import engine
    from sqlalchemy import text

async def init_database():
    """Initialize database tables"""
    print("🚀 Initializing Railway PostgreSQL database...")
    
    try:
        # Test connection first
        print("Testing database connection...")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
        
        # Create tables
        print("Creating database tables...")
        async with engine.begin() as conn:
            # Users table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255),
                    wallet_address VARCHAR(255),
                    is_premium BOOLEAN DEFAULT FALSE NOT NULL,
                    subscription_status VARCHAR(50) DEFAULT 'free' NOT NULL,
                    subscription_start_date TIMESTAMPTZ,
                    subscription_end_date TIMESTAMPTZ,
                    total_blocks_used INTEGER DEFAULT 0 NOT NULL,
                    free_blocks_remaining INTEGER DEFAULT 10 NOT NULL,
                    last_free_blocks_reset_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    preferred_payment_method VARCHAR(20) DEFAULT 'fiat' NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    last_login TIMESTAMPTZ
                )
            """))
            print("✅ Users table created")
            
            # Blocks usage table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS blocks_usage (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    blocks_used INTEGER DEFAULT 1 NOT NULL,
                    is_premium_block BOOLEAN DEFAULT FALSE NOT NULL,
                    domain VARCHAR(255),
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
            """))
            print("✅ Blocks usage table created")
            
            # Payments table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    amount_usd FLOAT NOT NULL,
                    payment_method VARCHAR(20) NOT NULL,
                    discount_applied FLOAT DEFAULT 0.0 NOT NULL,
                    final_amount FLOAT NOT NULL,
                    transaction_hash VARCHAR(255),
                    transaction_status VARCHAR(50) DEFAULT 'pending' NOT NULL,
                    stripe_payment_intent_id VARCHAR(255),
                    stripe_customer_id VARCHAR(255),
                    chain VARCHAR(50),
                    token_address VARCHAR(255),
                    from_address VARCHAR(255),
                    to_address VARCHAR(255),
                    subscription_period_start TIMESTAMPTZ NOT NULL,
                    subscription_period_end TIMESTAMPTZ NOT NULL,
                    payment_metadata TEXT,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
            """))
            print("✅ Payments table created")
            
            # Sync logs table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS sync_logs (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    sync_type VARCHAR(50) NOT NULL,
                    sync_status VARCHAR(50) DEFAULT 'success' NOT NULL,
                    blocks_synced INTEGER DEFAULT 0 NOT NULL,
                    error_message TEXT,
                    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
                )
            """))
            print("✅ Sync logs table created")
            
            # Create indexes
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON blocks_usage(user_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sync_user_id ON sync_logs(user_id)"))
            print("✅ Indexes created")
            
            # Verify tables
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            tables = result.fetchall()
            print(f"📋 Tables in database ({len(tables)} total):")
            for table in tables:
                print(f"  ✓ {table[0]}")
        
        print("🎉 Database initialization complete!")
        return True
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(init_database())
    if success:
        print("SUCCESS: Database initialized")
        sys.exit(0)
    else:
        print("FAILED: Database initialization failed")
        sys.exit(1)
