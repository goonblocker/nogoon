"""
User management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.database import get_db, set_current_user
from app.models import User, BlocksUsage
from app.schemas import UserResponse, UserUpdate, UsageStats, AnalyticsResponse
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


@router.get("/me", response_model=UserResponse)
async def get_current_user_data(
    user: User = Depends(get_auth_user)
):
    """Get current authenticated user's data"""
    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's data"""
    try:
        # Update fields if provided
        if update_data.email is not None:
            user.email = update_data.email
        if update_data.wallet_address is not None:
            user.wallet_address = update_data.wallet_address
        if update_data.preferred_payment_method is not None:
            user.preferred_payment_method = update_data.preferred_payment_method
        
        await db.commit()
        await db.refresh(user)
        
        logger.info(f"User {user.user_id} updated profile")
        return user
        
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )


@router.get("/stats", response_model=AnalyticsResponse)
async def get_user_stats(
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user usage statistics"""
    try:
        # Check if database is available
        if not settings.DATABASE_URL:
            # Return mock data if no database
            mock_stats = UsageStats(
                total_blocks_used=0,
                blocks_used_today=0,
                blocks_used_this_week=0,
                blocks_used_this_month=0,
                most_blocked_domains=[]
            )
            return AnalyticsResponse(stats=mock_stats)
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        week_start = now - timedelta(days=7)
        month_start = now - timedelta(days=30)
        
        # Get blocks used today
        result = await db.execute(
            select(func.coalesce(func.sum(BlocksUsage.blocks_used), 0))
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.created_at >= today_start
            )
        )
        blocks_today = result.scalar()
        
        # Get blocks used this week
        result = await db.execute(
            select(func.coalesce(func.sum(BlocksUsage.blocks_used), 0))
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.created_at >= week_start
            )
        )
        blocks_week = result.scalar()
        
        # Get blocks used this month
        result = await db.execute(
            select(func.coalesce(func.sum(BlocksUsage.blocks_used), 0))
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.created_at >= month_start
            )
        )
        blocks_month = result.scalar()
        
        # Get most blocked domains
        result = await db.execute(
            select(
                BlocksUsage.domain,
                func.count(BlocksUsage.id).label('count')
            )
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.domain.isnot(None)
            )
            .group_by(BlocksUsage.domain)
            .order_by(func.count(BlocksUsage.id).desc())
            .limit(10)
        )
        domains = [
            {"domain": row[0], "blocks": row[1]}
            for row in result.all()
        ]
        
        stats = UsageStats(
            total_blocks_used=user.total_blocks_used,
            blocks_used_today=int(blocks_today),
            blocks_used_this_week=int(blocks_week),
            blocks_used_this_month=int(blocks_month),
            most_blocked_domains=domains
        )
        
        return AnalyticsResponse(stats=stats)
        
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )


@router.delete("/me")
async def delete_current_user(
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete current user account (GDPR compliance)"""
    try:
        user_id = user.user_id
        await db.delete(user)
        await db.commit()
        
        logger.info(f"User {user_id} deleted their account")
        
        return {
            "status": "success",
            "message": "Account deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account"
        )

