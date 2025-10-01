"""
Database models for NoGoon backend
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base


class User(Base):
    """User model - stores Privy authenticated users"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), unique=True, nullable=False, index=True)  # Privy user ID
    email = Column(String(255), nullable=True, index=True)
    wallet_address = Column(String(255), nullable=True, index=True)
    
    # Subscription status
    is_premium = Column(Boolean, default=False, nullable=False)
    subscription_status = Column(String(50), default="free", nullable=False)  # free, active, expired, cancelled
    subscription_start_date = Column(DateTime(timezone=True), nullable=True)
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Block management
    total_blocks_used = Column(Integer, default=0, nullable=False)
    free_blocks_remaining = Column(Integer, default=10, nullable=False)
    last_free_blocks_reset_date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    
    # Payment method preference
    preferred_payment_method = Column(String(20), default="fiat", nullable=False)  # fiat or token
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    blocks_usage = relationship("BlocksUsage", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    
    # Constraints
    __table_args__ = (
        CheckConstraint('free_blocks_remaining >= 0', name='check_free_blocks_non_negative'),
        CheckConstraint('total_blocks_used >= 0', name='check_total_blocks_non_negative'),
        Index('idx_user_subscription', 'user_id', 'subscription_status'),
    )


class BlocksUsage(Base):
    """Track individual block usage for analytics"""
    __tablename__ = "blocks_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Usage details
    blocks_used = Column(Integer, default=1, nullable=False)
    is_premium_block = Column(Boolean, default=False, nullable=False)
    
    # Context
    domain = Column(String(255), nullable=True)  # Website domain where block occurred
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="blocks_usage")
    
    # Indexes
    __table_args__ = (
        Index('idx_usage_user_date', 'user_id', 'created_at'),
    )


class Payment(Base):
    """Payment transactions"""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Payment details
    amount_usd = Column(Float, nullable=False)
    payment_method = Column(String(20), nullable=False)  # fiat, token
    discount_applied = Column(Float, default=0.0, nullable=False)
    final_amount = Column(Float, nullable=False)
    
    # Transaction details
    transaction_hash = Column(String(255), nullable=True)  # For blockchain payments
    transaction_status = Column(String(50), default="pending", nullable=False)  # pending, completed, failed, refunded
    
    # Stripe/payment processor details (if fiat)
    stripe_payment_intent_id = Column(String(255), nullable=True, index=True)
    stripe_customer_id = Column(String(255), nullable=True)
    
    # Blockchain details (if token payment)
    chain = Column(String(50), nullable=True)  # ethereum, solana
    token_address = Column(String(255), nullable=True)
    from_address = Column(String(255), nullable=True)
    to_address = Column(String(255), nullable=True)
    
    # Subscription period
    subscription_period_start = Column(DateTime(timezone=True), nullable=False)
    subscription_period_end = Column(DateTime(timezone=True), nullable=False)
    
    # Metadata
    payment_metadata = Column(String, nullable=True)  # JSON string for additional data
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="payments")
    
    # Indexes
    __table_args__ = (
        Index('idx_payment_user_status', 'user_id', 'transaction_status'),
        Index('idx_payment_date', 'created_at'),
    )


class SyncLog(Base):
    """Log sync operations from Chrome extension"""
    __tablename__ = "sync_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    
    # Sync details
    sync_type = Column(String(50), nullable=False)  # blocks_update, auth_sync, full_sync
    sync_status = Column(String(50), default="success", nullable=False)  # success, failed
    
    # Data synced
    blocks_synced = Column(Integer, default=0, nullable=False)
    error_message = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_sync_user_date', 'user_id', 'created_at'),
    )

