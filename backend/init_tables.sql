-- Create users table
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
);

-- Create blocks_usage table
CREATE TABLE IF NOT EXISTS blocks_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    blocks_used INTEGER DEFAULT 1 NOT NULL,
    is_premium_block BOOLEAN DEFAULT FALSE NOT NULL,
    domain VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create payments table
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
);

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    sync_type VARCHAR(50) NOT NULL,
    sync_status VARCHAR(50) DEFAULT 'success' NOT NULL,
    blocks_synced INTEGER DEFAULT 0 NOT NULL,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON blocks_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_user_id ON sync_logs(user_id);

-- Verify tables were created
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
