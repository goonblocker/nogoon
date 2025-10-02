-- Database migration script to simplify schema
-- Remove subscription/payment tables and simplify User model

-- 1. Drop subscription/payment related columns from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS is_premium,
DROP COLUMN IF EXISTS subscription_status,
DROP COLUMN IF EXISTS subscription_start_date,
DROP COLUMN IF EXISTS subscription_end_date,
DROP COLUMN IF EXISTS free_blocks_remaining,
DROP COLUMN IF EXISTS last_free_blocks_reset_date,
DROP COLUMN IF EXISTS preferred_payment_method;

-- 2. Drop payment table
DROP TABLE IF EXISTS payments CASCADE;

-- 3. Simplify blocks_usage table
ALTER TABLE blocks_usage 
DROP COLUMN IF EXISTS is_premium_block;

-- 4. Update indexes for better performance
-- Drop old indexes
DROP INDEX IF EXISTS idx_user_subscription;
DROP INDEX IF EXISTS idx_payment_user_status;
DROP INDEX IF EXISTS idx_payment_date;

-- Create new optimized indexes
CREATE INDEX IF NOT EXISTS idx_user_blocks ON users (user_id, total_blocks_used);
CREATE INDEX IF NOT EXISTS idx_usage_domain ON blocks_usage (domain);
CREATE INDEX IF NOT EXISTS idx_usage_user_domain ON blocks_usage (user_id, domain);

-- 5. Update any existing data to ensure consistency
-- Ensure total_blocks_used is accurate
UPDATE users 
SET total_blocks_used = COALESCE((
    SELECT SUM(blocks_used) 
    FROM blocks_usage 
    WHERE blocks_usage.user_id = users.user_id
), 0);

-- 6. Add any missing constraints
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS check_total_blocks_non_negative 
CHECK (total_blocks_used >= 0);

-- 7. Update table comments
COMMENT ON TABLE users IS 'Simplified user table focused on stats tracking';
COMMENT ON TABLE blocks_usage IS 'Track individual block usage for analytics';
COMMENT ON TABLE sync_logs IS 'Log sync operations from Chrome extension';
