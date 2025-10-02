#!/usr/bin/env python3
"""
Minimal health check test for Railway
"""
import os
import sys

# Print debug info immediately
print(f"[STARTUP] Python {sys.version}", flush=True)
print(f"[STARTUP] PORT env: {os.getenv('PORT', 'NOT SET')}", flush=True)
print(f"[STARTUP] Working dir: {os.getcwd()}", flush=True)

from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "alive", "port": os.getenv('PORT', 'NOT SET')}

@app.get("/health")
async def health():
    """Railway health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    print(f"[STARTUP] Starting on port {port}", flush=True)
    
    # Start with minimal config
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )