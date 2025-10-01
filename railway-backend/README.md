# NoGoon Backend Server

FastAPI backend server for NoGoon Chrome Extension with Privy authentication, PostgreSQL database, and payment processing.

## Features

- ✅ **Privy JWT Authentication** - Secure Web3 authentication
- ✅ **PostgreSQL Database** - With Row Level Security (RLS)
- ✅ **Payment Processing** - Fiat and token payments with 50% token discount
- ✅ **Data Synchronization** - Sync extension data with backend
- ✅ **Usage Analytics** - Track and analyze block usage
- ✅ **Rate Limiting** - Protect against abuse
- ✅ **CORS Protection** - Restricted to extension origin only

## Architecture

```
backend/
├── main.py                 # FastAPI application entry point
├── app/
│   ├── config.py          # Settings and configuration
│   ├── database.py        # Database setup and RLS
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   ├── privy_auth.py      # Privy JWT validation
│   ├── middleware.py      # Custom middleware
│   └── routes/
│       ├── auth.py        # Authentication endpoints
│       ├── users.py       # User management
│       ├── payments.py    # Payment processing
│       └── sync.py        # Data synchronization
├── requirements.txt       # Python dependencies
└── env.example           # Environment variables template
```

## Database Schema

### Users Table
```sql
- id: Integer (Primary Key)
- user_id: String (Privy User ID, Unique)
- email: String (Optional)
- wallet_address: String (Optional)
- is_premium: Boolean
- subscription_status: String (free, active, expired, cancelled)
- subscription_start_date: DateTime
- subscription_end_date: DateTime
- total_blocks_used: Integer
- free_blocks_remaining: Integer
- last_free_blocks_reset_date: DateTime
- preferred_payment_method: String (fiat, token)
- created_at: DateTime
- updated_at: DateTime
- last_login: DateTime
```

### Payments Table
```sql
- id: Integer (Primary Key)
- user_id: String (Foreign Key)
- amount_usd: Float
- payment_method: String (fiat, token)
- discount_applied: Float
- final_amount: Float
- transaction_hash: String (for blockchain)
- transaction_status: String (pending, completed, failed, refunded)
- chain: String (ethereum, solana)
- token_address: String
- subscription_period_start: DateTime
- subscription_period_end: DateTime
- created_at: DateTime
- updated_at: DateTime
```

### Blocks Usage Table
```sql
- id: Integer (Primary Key)
- user_id: String (Foreign Key)
- blocks_used: Integer
- is_premium_block: Boolean
- domain: String (website domain)
- created_at: DateTime
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PRIVY_APP_ID` - Your Privy app ID
- `PRIVY_APP_SECRET` - Your Privy app secret
- `SECRET_KEY` - Generate with `openssl rand -hex 32`

### 3. Initialize Database

The database tables will be created automatically on first run. For RLS setup:

```python
# Run once to set up Row Level Security policies
python -c "
import asyncio
from app.database import init_rls_policies
asyncio.run(init_rls_policies())
"
```

### 4. Run Server

Development mode:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Production mode:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Authentication

#### POST `/api/v1/auth/login`
Login with Privy JWT token
```json
{
  "access_token": "privy_jwt_token"
}
```

#### POST `/api/v1/auth/verify`
Verify authentication token
```http
Authorization: Bearer <token>
```

### Users

#### GET `/api/v1/users/me`
Get current user data

#### PUT `/api/v1/users/me`
Update user data

#### GET `/api/v1/users/stats`
Get usage statistics

### Payments

#### POST `/api/v1/payments/subscribe/fiat`
Subscribe with fiat payment (Stripe)
```json
{
  "payment_method": "fiat",
  "stripe_payment_method_id": "pm_xxx"
}
```

#### POST `/api/v1/payments/subscribe/token`
Subscribe with token payment (50% discount)
```json
{
  "payment_method": "token",
  "chain": "ethereum",
  "transaction_hash": "0x...",
  "from_address": "0x...",
  "token_address": "0x..."
}
```

#### GET `/api/v1/payments/history`
Get payment history

### Sync

#### POST `/api/v1/sync`
Sync data from extension
```json
{
  "sync_type": "blocks_update",
  "blocks_usage": [
    {
      "blocks_used": 1,
      "domain": "example.com",
      "is_premium_block": false
    }
  ]
}
```

#### GET `/api/v1/sync/status`
Get current sync status

## Security Features

### Row Level Security (RLS)
All database queries are scoped to the authenticated user using PostgreSQL RLS:

```sql
-- Users can only see their own records
CREATE POLICY users_isolation_policy ON users
USING (user_id = current_setting('app.current_user_id')::text);
```

### CORS Protection
Only allows requests from:
- Chrome extension origin
- Development localhost

### Rate Limiting
Default: 60 requests per minute per IP

### JWT Validation
All protected routes require valid Privy JWT token:
- Signature verification using Privy's public key
- Expiration checking
- Audience validation

## Payment Processing

### Fiat Payments
- Full price: $20/month
- Processed via Stripe (integration required)
- Instant activation

### Token Payments
- **50% discount**: $10/month
- Supported chains: Ethereum, Solana
- Transaction verification via blockchain RPC
- Automatic activation after verification

## Development

### Testing

Test authentication:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"access_token": "your_privy_token"}'
```

Test protected endpoint:
```bash
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer your_token"
```

### Database Migrations

For schema changes, use Alembic:

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

## Deployment

### Railway Deployment

1. Create Railway project
2. Add PostgreSQL service
3. Set environment variables
4. Deploy:

```bash
railway up
```

### Environment Variables in Production

Ensure these are set in your production environment:
- All database credentials
- Privy configuration
- Secret key (strong random value)
- RPC URLs for blockchain verification
- Allowed origins (your extension ID)

## Monitoring

Logs are output to stdout/stderr:
- Request/response logging
- Error tracking
- Performance metrics (response time)

## Chrome Extension Integration

Update your extension to use the backend:

```typescript
// Example: Login with Privy token
const response = await fetch('https://your-backend.railway.app/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    access_token: privyAccessToken
  })
});

const data = await response.json();
// Store data.user_id, update local state with server data
```

## Support

For issues or questions:
1. Check logs: `tail -f logs/app.log`
2. Verify environment variables
3. Check database connectivity
4. Ensure Privy credentials are correct

## License

Same as Chrome extension

