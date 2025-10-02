#!/usr/bin/env python3
"""
Simplified main.py for Railway deployment
Only includes the essential health endpoint without complex dependencies
"""
import os
import sys
from fastapi import FastAPI
import uvicorn

# Print debug info
print(f"[STARTUP] Python {sys.version}", flush=True)
print(f"[STARTUP] PORT env: {os.getenv('PORT', 'NOT SET')}", flush=True)

# Create minimal FastAPI app
app = FastAPI(title="NoGoon Backend API - Simple")

@app.get("/")
async def root():
    return {
        "message": "NoGoon Backend API", 
        "version": "1.0.0",
        "port": os.getenv('PORT', 'NOT SET')
    }

@app.get("/health")
async def health_check():
    """Railway health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": "2025-01-02T23:30:00Z"
    }

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    print(f"[STARTUP] Starting simple server on port {port}", flush=True)
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )