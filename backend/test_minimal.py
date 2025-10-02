#!/usr/bin/env python3
"""
Minimal test to check if the server can start without issues
"""
import sys
import os

print("Testing minimal imports...")

try:
    print("1. Testing basic Python imports...")
    import asyncio
    print("✓ asyncio imported")
    
    print("2. Testing FastAPI import...")
    from fastapi import FastAPI
    print("✓ FastAPI imported")
    
    print("3. Testing uvicorn import...")
    import uvicorn
    print("✓ uvicorn imported")
    
    print("4. Testing app.config import...")
    from app.config import settings
    print("✓ app.config imported")
    
    print("5. Testing app.database import...")
    from app.database import engine
    print("✓ app.database imported")
    
    print("6. Testing app.routes import...")
    from app.routes import auth, users, payments, sync, admin
    print("✓ app.routes imported")
    
    print("7. Testing main.py import...")
    from main import app
    print("✓ main.py imported successfully!")
    
    print("\n✅ All imports successful! Server should start properly.")
    
except Exception as e:
    print(f"\n❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
