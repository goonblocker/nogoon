#!/usr/bin/env python3
import os
import asyncio
import asyncpg

async def test_db():
    try:
        db_url = os.getenv('DATABASE_URL')
        print(f'Testing connection to: {db_url[:30]}...')
        
        conn = await asyncpg.connect(db_url)
        result = await conn.fetchval('SELECT 1')
        print(f'Database test successful: {result}')
        await conn.close()
        return True
    except Exception as e:
        print(f'Database test failed: {e}')
        return False

if __name__ == "__main__":
    asyncio.run(test_db())
