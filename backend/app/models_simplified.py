"""
Simplified database models for NoGoon backend - focused on stats tracking
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """Simplified User model - stores Privy authenticated users"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), unique=True, nullable=False, index=True)  # Privy user ID
    email = Column(String(255), nullable=True, index=True)
    wallet_address = Column(String(255), nullable=True, index=True)
    
    # Block tracking (simplified - no subscription model)
    total_blocks_used = Column(Integer, default=0, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    blocks_usage = relationship("BlocksUsage", back_populates="user", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_user_blocks', 'user_id', 'total_blocks_used'),
    )


class BlocksUsage(Base):
    """Track individual block usage for analytics"""
    __tablename__ = "blocks_usage"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Usage details
    blocks_used = Column(Integer, default=1, nullable=False)
    
    # Context
    domain = Column(String(255), nullable=True)  # Website domain where block occurred
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="blocks_usage")
    
    # Indexes for efficient stats queries
    __table_args__ = (
        Index('idx_usage_user_date', 'user_id', 'created_at'),
        Index('idx_usage_domain', 'domain'),
        Index('idx_usage_user_domain', 'user_id', 'domain'),
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
