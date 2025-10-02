#!/usr/bin/env python3
"""
Minimal FastAPI server for testing Railway healthchecks
This bypasses all the complex imports that might be causing issues
"""
from fastapi import FastAPI
import uvicorn
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Minimal Health Check Server")

@app.get("/health")
async def health_check():
    """Simple health check endpoint - Railway compatible"""
    logger.info("Health check requested")
    return {
        "status": "healthy",
        "message": "Minimal server is running",
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "port": os.getenv("PORT", "8000")
    }

@app.get("/")
async def root():
    """Root endpoint"""
    logger.info("Root endpoint requested")
    return {"message": "Minimal server is running"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting server on port {port}")
    
    # Railway v2 requires IPv6 support - use :: for all interfaces
    uvicorn.run(
        "minimal_server:app",
        host="::",  # Listen on all IPv6 interfaces (Railway v2 requirement)
        port=port,
        log_level="info"
    )
