# Railway Healthcheck Solution

## What Was Failing

Railway healthchecks were failing with "service unavailable" for multiple reasons:

1. **nixpacks.toml conflict** - Railway was preferring nixpacks over Dockerfile
2. **railway.json startCommand override** - The `startCommand: "./start.sh"` was overriding Dockerfile CMD
3. **Docker HEALTHCHECK** - Railway ignores Docker's HEALTHCHECK directive
4. **Complex startup scripts** - Shell scripts with multiple commands were failing silently

## The Fix That Worked

### 1. Removed nixpacks.toml
```bash
git rm backend/nixpacks.toml
```
This forced Railway to use the Dockerfile as specified in railway.json.

### 2. Removed startCommand from railway.json
```json
// Before:
"deploy": {
    "startCommand": "./start.sh",  // This was overriding Dockerfile!
    "healthcheckPath": "/health",
    ...
}

// After:
"deploy": {
    "healthcheckPath": "/health",  // Let Dockerfile handle the start command
    ...
}
```

### 3. Simplified Dockerfile CMD
```dockerfile
# Working version:
CMD ["python3", "minimal_health_test.py"]

# For production, use:
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]
```

### 4. Removed Docker HEALTHCHECK
Railway doesn't use Docker's built-in HEALTHCHECK, so we removed:
```dockerfile
# REMOVED THIS:
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD python3 -c "import urllib.request..."
```

## Key Requirements for Railway Healthchecks

1. **Listen on PORT** - Must use Railway's injected PORT environment variable
2. **Simple /health endpoint** - Return 200 status quickly
3. **No authentication** - Health endpoint must be publicly accessible
4. **Fast startup** - Service must be ready within the timeout period

## Final Working Configuration

### railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

### Dockerfile
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
COPY *.py ./
COPY app/ ./app/
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]
```

### Health Endpoint (in main.py)
```python
@app.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint - Railway compatible"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }
```

## Lessons Learned

1. **Configuration conflicts** - Multiple config files (nixpacks.toml, railway.json, Dockerfile) can conflict
2. **Simple is better** - Direct Python commands work better than shell scripts
3. **No Docker HEALTHCHECK** - Railway uses its own health checking mechanism
4. **PORT must be dynamic** - Always use ${PORT} from environment, never hardcode

## Deployment Checklist

- [ ] No nixpacks.toml in backend directory
- [ ] No startCommand in railway.json
- [ ] Dockerfile CMD uses ${PORT} environment variable
- [ ] Health endpoint returns 200 quickly
- [ ] No authentication on /health endpoint