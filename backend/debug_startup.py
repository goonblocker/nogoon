#!/usr/bin/env python3
"""
Debug startup script to test what's happening during Railway deployment
"""
import sys
import os

print("=== DEBUG STARTUP SCRIPT ===")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")
print(f"Environment variables:")
for key in ["PORT", "ENVIRONMENT", "DATABASE_URL"]:
    value = os.getenv(key, "NOT SET")
    print(f"  {key}: {value}")

print("\n=== TESTING IMPORTS ===")
try:
    print("1. Testing basic imports...")
    import asyncio
    print("✓ asyncio imported")
    
    print("2. Testing FastAPI import...")
    from fastapi import FastAPI
    print("✓ FastAPI imported")
    
    print("3. Testing uvicorn import...")
    import uvicorn
    print("✓ uvicorn imported")
    
    print("\n=== CREATING SIMPLE APP ===")
    app = FastAPI(title="Debug Server")
    
    @app.get("/health")
    async def health():
        print("Health check requested")
        return {"status": "healthy", "message": "Debug server is running"}
    
    print("✓ App created successfully")
    
    print("\n=== STARTING SERVER ===")
    port = int(os.getenv("PORT", 8000))
    print(f"Starting server on port {port}")
    print(f"Host: :: (IPv6)")
    
    # Start the server
    uvicorn.run(
        app,
        host="::",
        port=port,
        log_level="info"
    )
    
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
