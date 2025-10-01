#!/usr/bin/env python3
"""
Test database connection with production credentials
"""
import asyncio
import asyncpg
import sys

# Production PostgreSQL credentials
DATABASE_URL = "postgresql://postgres:sFiCAwQAQgHVKKnsayRtwEPVtuiSrdzs@maglev.proxy.rlwy.net:24427/railway"

async def test_connection():
    """Test database connection and show tables"""
    try:
        print("Testing connection to Railway PostgreSQL...")
        print(f"URL: {DATABASE_URL[:50]}...")
        
        # Connect to database
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connected successfully!")
        
        # Check if tables exist
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        
        print(f"\nTables in database ({len(tables)} found):")
        for table in tables:
            print(f"  - {table['table_name']}")
        
        if not tables:
            print("❌ No tables found - database needs initialization")
        
        await conn.close()
        return len(tables) > 0
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_connection())
    sys.exit(0 if result else 1)