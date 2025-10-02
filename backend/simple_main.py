#!/usr/bin/env python3
"""
Simplified main.py for Railway deployment
Only includes the essential endpoints without complex dependencies
"""
import os
import sys
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import List, Dict
import uvicorn

# Print debug info
print(f"[STARTUP] Python {sys.version}", flush=True)
print(f"[STARTUP] PORT env: {os.getenv('PORT', 'NOT SET')}", flush=True)

# Simple response models
class UsageStats(BaseModel):
    total_blocks_used: int
    blocks_used_today: int
    blocks_used_this_week: int
    blocks_used_this_month: int
    most_blocked_domains: List[Dict[str, int]]

class AnalyticsResponse(BaseModel):
    status: str = "success"
    stats: UsageStats

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

@app.get("/api/v1/users/stats", response_model=AnalyticsResponse)
async def get_user_stats(authorization: str = Header(...)):
    """Get user usage statistics - simplified version with mock data"""
    try:
        # Very basic token validation (just check it exists)
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        
        # Return mock statistics data
        mock_stats = UsageStats(
            total_blocks_used=42,
            blocks_used_today=5,
            blocks_used_this_week=18,
            blocks_used_this_month=42,
            most_blocked_domains=[
                {"domain": "example.com", "blocks": 15},
                {"domain": "test-site.com", "blocks": 12},
                {"domain": "ads.network", "blocks": 8}
            ]
        )
        
        return AnalyticsResponse(stats=mock_stats)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Stats endpoint error: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    print(f"[STARTUP] Starting simple server on port {port}", flush=True)
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )