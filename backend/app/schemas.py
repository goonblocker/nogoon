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
    is_premium: bool
    free_blocks_remaining: int
    subscription_status: str
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
    is_premium: bool
    subscription_status: str
    free_blocks_remaining: int
    total_blocks_used: int
    subscription_start_date: Optional[datetime]
    subscription_end_date: Optional[datetime]
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True


# ============================================================================
# Payment Schemas
# ============================================================================

class PaymentMethodBase(BaseModel):
    """Base payment method"""
    payment_method: Literal["fiat", "token"] = Field(..., description="Payment method: fiat or token")


class FiatPaymentRequest(PaymentMethodBase):
    """Request schema for fiat payment"""
    payment_method: Literal["fiat"] = "fiat"
    stripe_payment_method_id: Optional[str] = None
    

class TokenPaymentRequest(PaymentMethodBase):
    """Request schema for token payment"""
    payment_method: Literal["token"] = "token"
    chain: Literal["ethereum", "solana"] = Field(..., description="Blockchain network")
    transaction_hash: str = Field(..., description="Transaction hash on blockchain")
    from_address: str = Field(..., description="Sender wallet address")
    token_address: Optional[str] = Field(None, description="Token contract address (for ERC20/SPL tokens)")


class PaymentResponse(BaseModel):
    """Response schema for payment"""
    status: str
    payment_id: int
    amount_usd: float
    discount_applied: float
    final_amount: float
    payment_method: str
    transaction_status: str
    subscription_period_start: datetime
    subscription_period_end: datetime
    message: str
    
    # For token payments
    transaction_hash: Optional[str] = None
    chain: Optional[str] = None
    
    # For fiat payments
    stripe_payment_intent_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class PaymentVerifyRequest(BaseModel):
    """Request to verify a payment"""
    payment_id: int
    

# ============================================================================
# Sync Schemas
# ============================================================================

class BlockUsageSync(BaseModel):
    """Schema for syncing block usage from extension"""
    blocks_used: int = Field(..., ge=0, description="Number of blocks used")
    domain: Optional[str] = Field(None, description="Domain where blocks were used")
    is_premium_block: bool = False


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

