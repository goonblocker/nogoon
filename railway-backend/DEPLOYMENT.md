# Backend Deployment Guide

## Deployment Options

### Option 1: Railway (Recommended)

Railway provides easy deployment with PostgreSQL included.

#### Steps:

1. **Install Railway CLI**
```bash
npm i -g @railway/cli
```

2. **Login to Railway**
```bash
railway login
```

3. **Initialize Project**
```bash
cd backend
railway init
```

4. **Add PostgreSQL**
```bash
railway add postgresql
```

5. **Set Environment Variables**
```bash
# Copy from Railway PostgreSQL service
railway variables set DATABASE_URL=postgresql://...
railway variables set PRIVY_APP_ID=your_app_id
railway variables set PRIVY_APP_SECRET=your_secret
railway variables set SECRET_KEY=$(openssl rand -hex 32)
```

6. **Deploy**
```bash
railway up
```

7. **Get Deployment URL**
```bash
railway domain
```

### Option 2: Render

1. Create new Web Service
2. Connect GitHub repo
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add PostgreSQL database
6. Set environment variables in dashboard

### Option 3: Google Cloud Run

1. **Build Container**
```bash
# Create Dockerfile
cat > Dockerfile <<EOF
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
EOF
```

2. **Deploy**
```bash
gcloud run deploy nogoon-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Option 4: AWS Elastic Beanstalk

1. Install EB CLI
2. Initialize: `eb init`
3. Create environment: `eb create nogoon-backend`
4. Deploy: `eb deploy`

## Database Setup

### Railway PostgreSQL

Railway automatically provisions PostgreSQL. Get credentials:

```bash
railway variables
```

### External PostgreSQL (Supabase, Neon, etc.)

1. Create database
2. Get connection string
3. Set `DATABASE_URL` environment variable
4. Run migrations

## Environment Variables

Required variables for production:

```bash
# Core
ENVIRONMENT=production
PORT=8000

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_PUBLIC_URL=postgresql://user:pass@host:5432/db

# Privy
PRIVY_APP_ID=your_app_id
PRIVY_APP_SECRET=your_app_secret
PRIVY_VERIFICATION_KEY=auto_fetched

# Security
SECRET_KEY=generate_with_openssl_rand_hex_32
ALLOWED_ORIGINS=["chrome-extension://your_extension_id"]
ALLOWED_HOSTS=["your-domain.com"]

# Payments
SUBSCRIPTION_PRICE_USD=20.0
TOKEN_PAYMENT_DISCOUNT=0.5
FREE_BLOCKS_PER_DAY=10

# Blockchain RPC
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

## Post-Deployment Checklist

### 1. Initialize Database

```bash
# SSH into server or use Railway CLI
railway run python -c "
from app.database import engine, Base, init_rls_policies
import asyncio

async def setup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await init_rls_policies()

asyncio.run(setup())
"
```

### 2. Verify Endpoints

```bash
# Health check
curl https://your-backend.railway.app/health

# Should return: {"status":"healthy","environment":"production","version":"1.0.0"}
```

### 3. Test Authentication

```bash
# Get a Privy JWT token from your extension
curl -X POST https://your-backend.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"access_token":"your_privy_jwt"}'
```

### 4. Configure CORS

Update `ALLOWED_ORIGINS` with your Chrome extension ID:

```python
ALLOWED_ORIGINS = [
    "chrome-extension://kjmbccjnkgcpboiiomckhdogdhociajd"  # Replace with actual ID
]
```

### 5. Set Up Monitoring

**Railway:**
- View logs: `railway logs`
- Monitor metrics in dashboard

**Sentry (Error Tracking):**
```bash
pip install sentry-sdk[fastapi]

# In main.py
import sentry_sdk
sentry_sdk.init(dsn="your_sentry_dsn")
```

**Datadog/New Relic:**
- Follow platform-specific integration guides

### 6. Set Up SSL/HTTPS

Most platforms (Railway, Render, GCP) provide automatic HTTPS.

For custom domains:
- Add domain in platform dashboard
- Update DNS records
- Platform handles SSL certificate

## Database Migrations

For schema changes after initial deployment:

### 1. Create Migration

```bash
# Install Alembic
pip install alembic

# Initialize (first time only)
alembic init alembic

# Create migration
alembic revision --autogenerate -m "add_new_column"
```

### 2. Apply Migration

```bash
# Locally
alembic upgrade head

# Production (Railway)
railway run alembic upgrade head
```

## Scaling

### Horizontal Scaling (Multiple Instances)

```bash
# Railway
railway scale --replicas 3

# Google Cloud Run
gcloud run services update nogoon-backend --min-instances=2 --max-instances=10
```

### Database Connection Pooling

Already configured in `database.py`:
```python
engine = create_async_engine(
    database_url,
    pool_size=10,      # Adjust based on load
    max_overflow=20    # Extra connections when needed
)
```

### Caching (Optional)

Add Redis for caching:

```python
# Install redis
pip install redis

# Cache user data
import redis
cache = redis.Redis(host='localhost', port=6379)

@router.get("/users/me")
async def get_user(user_id: str):
    # Try cache first
    cached = cache.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Fetch from DB
    user = await db.query(User).filter(User.user_id == user_id).first()
    
    # Cache for 5 minutes
    cache.setex(f"user:{user_id}", 300, json.dumps(user))
    
    return user
```

## Security Hardening

### 1. Rate Limiting

Already implemented with SlowAPI. Adjust limits:

```python
# In main.py
@app.get("/api/v1/users/me")
@limiter.limit("10/minute")  # 10 requests per minute
async def get_user(...):
    ...
```

### 2. API Key Authentication (Optional)

For service-to-service:

```python
from fastapi import Security, HTTPException
from fastapi.security import APIKeyHeader

api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403)
    return api_key
```

### 3. Request Validation

Already handled by Pydantic schemas. Add custom validation:

```python
@app.middleware("http")
async def validate_content_type(request: Request, call_next):
    if request.method in ["POST", "PUT"]:
        if "application/json" not in request.headers.get("content-type", ""):
            return JSONResponse({"error": "Invalid content type"}, status_code=400)
    return await call_next(request)
```

### 4. SQL Injection Protection

Already protected by SQLAlchemy parameterized queries and RLS.

## Monitoring & Logs

### View Logs

**Railway:**
```bash
railway logs --tail 100
```

**Docker:**
```bash
docker logs -f container_id
```

### Log Aggregation

**Papertrail:**
```bash
# Add to Railway
railway variables set PAPERTRAIL_URL=logs.papertrailapp.com:12345
```

**CloudWatch (AWS):**
- Automatic with Elastic Beanstalk

### Metrics

**Prometheus + Grafana:**

```python
# Install prometheus client
pip install prometheus-client

# In main.py
from prometheus_client import Counter, Histogram, make_asgi_app

request_count = Counter('requests_total', 'Total requests')
request_duration = Histogram('request_duration_seconds', 'Request duration')

# Mount metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)
```

## Backup & Recovery

### Database Backups

**Railway:**
- Automatic daily backups
- Manual backup: `railway db backup`

**Manual PostgreSQL Backup:**
```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Disaster Recovery Plan

1. Keep `.env.example` updated with all required variables
2. Document database schema in version control
3. Regular backups (automated)
4. Test restoration process quarterly
5. Keep deployment scripts in repo

## Troubleshooting

### Issue: "Database connection failed"
```bash
# Check connection
railway run python -c "from app.database import engine; import asyncio; asyncio.run(engine.connect())"
```

### Issue: "Privy verification failed"
```bash
# Verify Privy credentials
railway variables | grep PRIVY
```

### Issue: "CORS errors"
```bash
# Check allowed origins
railway variables | grep ALLOWED_ORIGINS

# Update if needed
railway variables set ALLOWED_ORIGINS='["chrome-extension://your-id"]'
```

### Issue: "Rate limit exceeded"
```bash
# Increase limit temporarily
railway variables set RATE_LIMIT_PER_MINUTE=120
```

## Cost Optimization

### Railway
- Free tier: Suitable for development
- Hobby: $5/month (recommended for MVP)
- Pro: $20/month (for production with high traffic)

### Database Optimization
- Add indexes on frequently queried columns
- Archive old data
- Use database connection pooling
- Enable query caching

### Reduce Compute Costs
- Scale down during low-traffic hours
- Use autoscaling
- Optimize cold starts (keep-alive pings)

## Maintenance

### Regular Tasks

**Weekly:**
- Review logs for errors
- Check database size
- Monitor API response times

**Monthly:**
- Update dependencies: `pip install --upgrade -r requirements.txt`
- Review and archive old data
- Security audit

**Quarterly:**
- Test disaster recovery
- Performance optimization
- Cost analysis

### Update Process

1. Test changes locally
2. Deploy to staging environment
3. Run integration tests
4. Deploy to production
5. Monitor for issues
6. Rollback if needed:
   ```bash
   railway rollback
   ```

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Privy Docs**: https://docs.privy.io
- **PostgreSQL Docs**: https://www.postgresql.org/docs

## Production Readiness Checklist

- [ ] All environment variables set
- [ ] Database initialized with RLS
- [ ] HTTPS enabled
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] Error tracking setup (Sentry)
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Monitoring dashboard setup
- [ ] Extension ID in ALLOWED_ORIGINS
- [ ] API documentation accessible
- [ ] Health check endpoint tested
- [ ] Payment processing tested
- [ ] Blockchain verification working
- [ ] Load tested (use `locust` or `k6`)
- [ ] Security audit completed

