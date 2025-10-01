# Railway Database Setup & Schema Deployment

This guide shows how to deploy your database schema to Railway PostgreSQL.

## Your Railway Database Info

You provided these credentials:

```
Database: railway
User: postgres
Password: zeviEjJTqWxqWUAczOUYoJvvTDHPAwZo
Host: Railway private domain
Port: 5432 (internal) or TCP Proxy Port (external)
```

## Method 1: Using Railway CLI (Recommended)

### Step 1: Install and Login

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Link Your Project

```bash
cd backend
railway link
# Select your project from the list
```

### Step 3: Deploy Schema

```bash
# Option A: Run init_db.py through Railway
railway run python init_db.py init

# Option B: Connect directly and run psql commands
railway run psql $DATABASE_URL
```

### Step 4: Verify Tables

```bash
railway run psql $DATABASE_URL -c "\dt"
```

You should see:
- users
- blocks_usage
- payments
- sync_logs

## Method 2: Local Script with Railway Connection

### Step 1: Get Railway Database URL

```bash
railway variables | grep DATABASE_PUBLIC_URL
```

Copy the URL (includes the proxy port for external access).

### Step 2: Update .env

```bash
cd backend
nano .env
```

Add the Railway database URL:
```env
DATABASE_URL=postgresql://postgres:zeviEjJTqWxqWUAczOUYoJvvTDHPAwZo@junction.proxy.rlwy.net:YOUR_PORT/railway
```

### Step 3: Run Initialization

```bash
source venv/bin/activate
python init_db.py init
```

## Method 3: Manual SQL Execution

If you prefer to run SQL directly:

### Step 1: Connect to Database

```bash
railway run psql $DATABASE_URL
```

### Step 2: Copy and Execute Schema

```sql
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
    last_login TIMESTAMPTZ,
    CONSTRAINT check_free_blocks_non_negative CHECK (free_blocks_remaining >= 0),
    CONSTRAINT check_total_blocks_non_negative CHECK (total_blocks_used >= 0)
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_subscription ON users(user_id, subscription_status);

-- Create blocks_usage table
CREATE TABLE IF NOT EXISTS blocks_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    blocks_used INTEGER DEFAULT 1 NOT NULL,
    is_premium_block BOOLEAN DEFAULT FALSE NOT NULL,
    domain VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON blocks_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date ON blocks_usage(user_id, created_at);

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

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_user_status ON payments(user_id, transaction_status);
CREATE INDEX IF NOT EXISTS idx_payment_date ON payments(created_at);

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

CREATE INDEX IF NOT EXISTS idx_sync_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_user_date ON sync_logs(user_id, created_at);

-- Verify tables created
\dt
```

Type `\q` to exit.

## Verify Schema Deployment

### Check Tables

```bash
railway run psql $DATABASE_URL -c "\dt"
```

Expected output:
```
             List of relations
 Schema |    Name      | Type  |  Owner   
--------+--------------+-------+----------
 public | blocks_usage | table | postgres
 public | payments     | table | postgres
 public | sync_logs    | table | postgres
 public | users        | table | postgres
```

### Check Table Structure

```bash
railway run psql $DATABASE_URL -c "\d users"
```

### Create Test User

```bash
railway run psql $DATABASE_URL
```

```sql
INSERT INTO users (user_id, email, is_premium, free_blocks_remaining)
VALUES ('test-user-123', 'test@example.com', false, 10);

SELECT * FROM users;
```

## Row Level Security (Production Only)

For production deployment, enable RLS:

```bash
railway run psql $DATABASE_URL
```

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY users_isolation_policy ON users
USING (user_id = current_setting('app.current_user_id')::text);

CREATE POLICY blocks_usage_isolation_policy ON blocks_usage
USING (user_id = current_setting('app.current_user_id')::text);

CREATE POLICY payments_isolation_policy ON payments
USING (user_id = current_setting('app.current_user_id')::text);
```

## Monitoring Database

### View Recent Logs

```bash
railway logs --tail 50
```

### Database Size

```bash
railway run psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('railway'));"
```

### Table Row Counts

```bash
railway run psql $DATABASE_URL -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## Backup Database

### Create Backup

```bash
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Restore Backup

```bash
railway run psql $DATABASE_URL < backup_20241001.sql
```

## Troubleshooting

### Can't Connect?

```bash
# Check if database service is running
railway status

# Test connection
railway run psql $DATABASE_URL -c "SELECT 1;"
```

### Permission Denied?

Make sure you're using the correct credentials from Railway variables:

```bash
railway variables | grep POSTGRES
```

### Tables Not Created?

Check for errors:

```bash
railway run python init_db.py check
```

Look for error messages in the output.

## Next Steps

1. ✅ Schema deployed to Railway
2. → Configure backend `.env` with Railway URL
3. → Start backend server locally
4. → Test API endpoints
5. → Deploy backend to Railway

See `DEPLOYMENT.md` for production deployment.

