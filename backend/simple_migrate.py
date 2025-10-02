#!/usr/bin/env python3
import asyncio
import asyncpg
import os

async def migrate():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    try:
        print('Starting migration...')
        
        # Drop subscription columns
        await conn.execute('''
            ALTER TABLE users 
            DROP COLUMN IF EXISTS is_premium,
            DROP COLUMN IF EXISTS subscription_status,
            DROP COLUMN IF EXISTS subscription_start_date,
            DROP COLUMN IF EXISTS subscription_end_date,
            DROP COLUMN IF EXISTS free_blocks_remaining,
            DROP COLUMN IF EXISTS last_free_blocks_reset_date,
            DROP COLUMN IF EXISTS preferred_payment_method;
        ''')
        print('Dropped subscription columns')
        
        # Drop payment table
        await conn.execute('DROP TABLE IF EXISTS payments CASCADE;')
        print('Dropped payments table')
        
        # Simplify blocks_usage
        await conn.execute('ALTER TABLE blocks_usage DROP COLUMN IF EXISTS is_premium_block;')
        print('Simplified blocks_usage table')
        
        # Update indexes
        await conn.execute('''
            DROP INDEX IF EXISTS idx_user_subscription;
            DROP INDEX IF EXISTS idx_payment_user_status;
            DROP INDEX IF EXISTS idx_payment_date;
            CREATE INDEX IF NOT EXISTS idx_user_blocks ON users (user_id, total_blocks_used);
            CREATE INDEX IF NOT EXISTS idx_usage_domain ON blocks_usage (domain);
            CREATE INDEX IF NOT EXISTS idx_usage_user_domain ON blocks_usage (user_id, domain);
        ''')
        print('Updated indexes')
        
        # Update data
        await conn.execute('''
            UPDATE users 
            SET total_blocks_used = COALESCE((
                SELECT SUM(blocks_used) 
                FROM blocks_usage 
                WHERE blocks_usage.user_id = users.user_id
            ), 0);
        ''')
        print('Updated user data')
        
        print('Migration completed successfully!')
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
