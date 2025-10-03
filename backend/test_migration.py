#!/usr/bin/env python3
"""
Test the database migration by connecting and checking the schema
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def test_migration():
    """Test the migrated database schema"""
    
    # Use Railway's DATABASE_URL from environment
    database_url = "postgresql+asyncpg://postgres:sFiCAwQAQgHVKKnsayRtwEPVtuiSrdzs@postgres.railway.internal:5432/railway"
    
    try:
        engine = create_async_engine(database_url)
        
        async with engine.begin() as conn:
            print("🔍 Checking database schema after migration...")
            
            # List all tables
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result.fetchall()]
            print(f"📋 Tables: {tables}")
            
            # Check users table structure
            if 'users' in tables:
                result = await conn.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                """))
                print("\n👤 Users table structure:")
                for row in result.fetchall():
                    print(f"   {row[0]} ({row[1]}) - nullable: {row[2]}")
            
            # Check blocks_usage table structure
            if 'blocks_usage' in tables:
                result = await conn.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'blocks_usage' AND table_schema = 'public'
                    ORDER BY ordinal_position;
                """))
                print("\n📊 Blocks_usage table structure:")
                for row in result.fetchall():
                    print(f"   {row[0]} ({row[1]}) - nullable: {row[2]}")
            
            # Check indexes
            result = await conn.execute(text("""
                SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE schemaname = 'public' 
                ORDER BY tablename, indexname;
            """))
            print("\n🔍 Indexes:")
            for row in result.fetchall():
                print(f"   {row[1]}.{row[0]}")
            
            # Test inserting a user and block usage
            print("\n🧪 Testing data insertion...")
            
            # Insert test user
            await conn.execute(text("""
                INSERT INTO users (user_id, email, total_blocks_used) 
                VALUES ('test_migration_user', 'test@migration.com', 0)
                ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
            """))
            
            # Insert test block usage
            await conn.execute(text("""
                INSERT INTO blocks_usage (user_id, blocks_used, domain) 
                VALUES ('test_migration_user', 3, 'test-domain.com');
            """))
            
            # Test stats query
            result = await conn.execute(text("""
                SELECT 
                    u.user_id,
                    u.total_blocks_used,
                    COUNT(bu.id) as usage_records,
                    SUM(bu.blocks_used) as blocks_from_usage,
                    array_agg(bu.domain) as domains
                FROM users u
                LEFT JOIN blocks_usage bu ON u.user_id = bu.user_id
                WHERE u.user_id = 'test_migration_user'
                GROUP BY u.user_id, u.total_blocks_used;
            """))
            
            row = result.fetchone()
            if row:
                print(f"✅ Test data query successful!")
                print(f"   User: {row[0]}")
                print(f"   Total blocks (user): {row[1]}")
                print(f"   Usage records: {row[2]}")
                print(f"   Blocks from usage: {row[3]}")
                print(f"   Domains: {row[4]}")
            
            print("\n🎉 Database migration verification completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error testing migration: {e}")
        return False
    finally:
        await engine.dispose()

if __name__ == "__main__":
    success = asyncio.run(test_migration())
    if success:
        print("\n✅ Database is ready for real stats tracking!")
    else:
        print("\n❌ Database verification failed!")