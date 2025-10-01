"""
Data synchronization routes
Syncs block usage and user data between Chrome extension and backend
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db, set_current_user
from app.models import User, BlocksUsage, SyncLog
from app.schemas import SyncRequest, SyncResponse, UserResponse
from app.privy_auth import get_current_user
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_auth_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency to get authenticated user from database"""
    token = authorization.replace("Bearer ", "")
    user_data = await get_current_user(token)
    user_id = user_data["user_id"]
    
    await set_current_user(db, user_id)
    
    result = await db.execute(
        select(User).where(User.user_id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.post("/", response_model=SyncResponse)
async def sync_data(
    sync_request: SyncRequest,
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync data from Chrome extension to backend
    Handles block usage updates and full sync
    """
    try:
        synced_blocks = 0
        
        # Check for daily reset
        current_time = datetime.utcnow()
        if user.last_free_blocks_reset_date.date() < current_time.date():
            user.free_blocks_remaining = settings.FREE_BLOCKS_PER_DAY
            user.last_free_blocks_reset_date = current_time
            logger.info(f"Reset free blocks for user {user.user_id}")
        
        # Process blocks usage sync
        if sync_request.sync_type == "blocks_update" and sync_request.blocks_usage:
            for usage in sync_request.blocks_usage:
                # Create usage record
                blocks_usage = BlocksUsage(
                    user_id=user.user_id,
                    blocks_used=usage.blocks_used,
                    is_premium_block=usage.is_premium_block or user.is_premium,
                    domain=usage.domain
                )
                db.add(blocks_usage)
                
                # Update user's total blocks
                user.total_blocks_used += usage.blocks_used
                
                # Decrement free blocks if not premium
                if not user.is_premium and not usage.is_premium_block:
                    user.free_blocks_remaining = max(0, user.free_blocks_remaining - usage.blocks_used)
                
                synced_blocks += usage.blocks_used
            
            logger.info(f"Synced {synced_blocks} blocks for user {user.user_id}")
        
        # Full sync - update all user data
        elif sync_request.sync_type == "full_sync":
            # Already handled by daily reset check above
            logger.info(f"Full sync completed for user {user.user_id}")
        
        # Auth sync - just update last login
        elif sync_request.sync_type == "auth_sync":
            user.last_login = current_time
            logger.info(f"Auth sync completed for user {user.user_id}")
        
        # Create sync log
        sync_log = SyncLog(
            user_id=user.user_id,
            sync_type=sync_request.sync_type,
            sync_status="success",
            blocks_synced=synced_blocks
        )
        db.add(sync_log)
        
        await db.commit()
        await db.refresh(user)
        
        # Return updated user data
        user_response = UserResponse(
            user_id=user.user_id,
            email=user.email,
            wallet_address=user.wallet_address,
            is_premium=user.is_premium,
            subscription_status=user.subscription_status,
            free_blocks_remaining=user.free_blocks_remaining,
            total_blocks_used=user.total_blocks_used,
            subscription_start_date=user.subscription_start_date,
            subscription_end_date=user.subscription_end_date,
            created_at=user.created_at,
            last_login=user.last_login
        )
        
        return SyncResponse(
            status="success",
            user_data=user_response,
            synced_blocks=synced_blocks,
            message=f"Synced successfully - {synced_blocks} blocks updated"
        )
        
    except Exception as e:
        logger.error(f"Sync error for user {user.user_id}: {e}")
        
        # Log failed sync
        sync_log = SyncLog(
            user_id=user.user_id,
            sync_type=sync_request.sync_type,
            sync_status="failed",
            error_message=str(e)
        )
        db.add(sync_log)
        await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sync failed"
        )


@router.get("/status", response_model=UserResponse)
async def get_sync_status(
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current sync status and user data
    Used by extension to check if local state is in sync
    """
    try:
        # Check for daily reset
        current_time = datetime.utcnow()
        if user.last_free_blocks_reset_date.date() < current_time.date():
            user.free_blocks_remaining = settings.FREE_BLOCKS_PER_DAY
            user.last_free_blocks_reset_date = current_time
            await db.commit()
            await db.refresh(user)
        
        return UserResponse(
            user_id=user.user_id,
            email=user.email,
            wallet_address=user.wallet_address,
            is_premium=user.is_premium,
            subscription_status=user.subscription_status,
            free_blocks_remaining=user.free_blocks_remaining,
            total_blocks_used=user.total_blocks_used,
            subscription_start_date=user.subscription_start_date,
            subscription_end_date=user.subscription_end_date,
            created_at=user.created_at,
            last_login=user.last_login
        )
        
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sync status"
        )

