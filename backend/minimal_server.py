#!/usr/bin/env python3
"""
Minimal FastAPI server for testing Railway healthchecks
This bypasses all the complex imports that might be causing issues
"""
from fastapi import FastAPI
import uvicorn
import os

app = FastAPI(title="Minimal Health Check Server")

@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "message": "Minimal server is running",
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "port": os.getenv("PORT", "8000")
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Minimal server is running"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "minimal_server:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
