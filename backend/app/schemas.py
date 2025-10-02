"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Literal
from datetime import datetime


# ============================================================================
# Authentication Schemas
# ============================================================================

class PrivyAuthRequest(BaseModel):
    """Request schema for Privy JWT authentication"""
    access_token: str = Field(..., description="Privy JWT access token")
    

class AuthResponse(BaseModel):
    """Response schema for authentication"""
    status: str = "success"
    user_id: str
    total_blocks_used: int
    message: str = "Authentication successful"
    

# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    """Base user schema"""
    email: Optional[EmailStr] = None
    wallet_address: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""
    user_id: str


class UserUpdate(BaseModel):
    """Schema for updating user data"""
    email: Optional[EmailStr] = None
    wallet_address: Optional[str] = None
    preferred_payment_method: Optional[Literal["fiat", "token"]] = None


class UserResponse(BaseModel):
    """Response schema for user data"""
    user_id: str
    email: Optional[str]
    wallet_address: Optional[str]
    total_blocks_used: int
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============================================================================
# Sync Schemas
# ============================================================================

class BlockUsageSync(BaseModel):
    """Schema for syncing block usage from extension"""
    blocks_used: int = Field(..., ge=0, description="Number of blocks used")
    domain: Optional[str] = Field(None, description="Domain where blocks were used")
    is_premium_block: bool = False


class BlockEvent(BaseModel):
    """Schema for individual block events"""
    domain: str = Field(..., description="Domain that was blocked")
    count: int = Field(default=1, ge=1, description="Number of blocks for this domain")


class BlockEventsRequest(BaseModel):
    """Request schema for syncing block events"""
    events: list[BlockEvent] = Field(..., description="List of block events to sync")


class SyncRequest(BaseModel):
    """Request schema for syncing data from extension"""
    sync_type: Literal["blocks_update", "auth_sync", "full_sync"]
    blocks_usage: Optional[list[BlockUsageSync]] = None
    

class SyncResponse(BaseModel):
    """Response schema for sync operations"""
    status: str
    user_data: UserResponse
    synced_blocks: int = 0
    message: str = "Sync successful"


# ============================================================================
# Analytics Schemas
# ============================================================================

class UsageStats(BaseModel):
    """User usage statistics"""
    total_blocks_used: int
    blocks_used_today: int
    blocks_used_this_week: int
    blocks_used_this_month: int
    most_blocked_domains: list[dict]
    

class AnalyticsResponse(BaseModel):
    """Response for analytics data"""
    status: str = "success"
    stats: UsageStats
    

# ============================================================================
# Error Schemas
# ============================================================================

class ErrorResponse(BaseModel):
    """Standard error response"""
    status: str = "error"
    error: str
    detail: Optional[str] = None
    code: Optional[str] = None

