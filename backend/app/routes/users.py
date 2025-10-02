"""
User management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from datetime import datetime, timedelta

from app.database import get_db, set_current_user
from app.models import User, BlocksUsage
from app.schemas import UserResponse, UserUpdate, UsageStats, AnalyticsResponse, BlockEventsRequest
import asyncpg
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


@router.post("/migrate-database")
async def migrate_database(db: AsyncSession = Depends(get_db)):
    """Run database migration to simplify schema"""
    try:
        if not settings.DATABASE_URL:
            return {"status": "error", "message": "No database URL configured"}
        
        # Use SQLAlchemy to run the migration
        await db.execute(text('''
            ALTER TABLE users 
            DROP COLUMN IF EXISTS is_premium,
            DROP COLUMN IF EXISTS subscription_status,
            DROP COLUMN IF EXISTS subscription_start_date,
            DROP COLUMN IF EXISTS subscription_end_date,
            DROP COLUMN IF EXISTS free_blocks_remaining,
            DROP COLUMN IF EXISTS last_free_blocks_reset_date,
            DROP COLUMN IF EXISTS preferred_payment_method;
        '''))
        
        await db.execute(text('DROP TABLE IF EXISTS payments CASCADE;'))
        
        await db.execute(text('ALTER TABLE blocks_usage DROP COLUMN IF EXISTS is_premium_block;'))
        
        await db.execute(text('''
            DROP INDEX IF EXISTS idx_user_subscription;
            DROP INDEX IF EXISTS idx_payment_user_status;
            DROP INDEX IF EXISTS idx_payment_date;
            CREATE INDEX IF NOT EXISTS idx_user_blocks ON users (user_id, total_blocks_used);
            CREATE INDEX IF NOT EXISTS idx_usage_domain ON blocks_usage (domain);
            CREATE INDEX IF NOT EXISTS idx_usage_user_domain ON blocks_usage (user_id, domain);
        '''))
        
        await db.execute(text('''
            UPDATE users 
            SET total_blocks_used = COALESCE((
                SELECT SUM(blocks_used) 
                FROM blocks_usage 
                WHERE blocks_usage.user_id = users.user_id
            ), 0);
        '''))
        
        await db.commit()
        
        return {
            "status": "success", 
            "message": "Database migration completed successfully"
        }
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        await db.rollback()
        return {
            "status": "error", 
            "message": f"Migration failed: {str(e)}"
        }


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


@router.post("/block-events")
async def sync_block_events(
    request: BlockEventsRequest,
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Sync block events from extension to database"""
    try:
        # Check if database is available
        if not settings.DATABASE_URL:
            return {
                "status": "success",
                "message": "Block events received (mock mode - no database)",
                "events_processed": len(request.events)
            }

        total_blocks = 0
        domains_processed = set()

        # Process each block event
        for event in request.events:
            # Create or update block usage record
            block_usage = BlocksUsage(
                user_id=user.user_id,
                domain=event.domain,
                blocks_used=event.count
                # created_at will use the default value from the database
            )
            db.add(block_usage)
            total_blocks += event.count
            domains_processed.add(event.domain)

        # Update user's total blocks used
        user.total_blocks_used += total_blocks

        await db.commit()

        logger.info(f"Synced {len(request.events)} block events for user {user.user_id}, total blocks: {total_blocks}")

        return {
            "status": "success",
            "message": "Block events synced successfully",
            "events_processed": len(request.events),
            "total_blocks_added": total_blocks,
            "domains_processed": list(domains_processed)
        }

    except Exception as e:
        logger.error(f"Error syncing block events: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync block events"
        )


@router.delete("/clear-test-data")
async def clear_test_data(
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear test data from user's statistics"""
    try:
        # Check if database is available
        if not settings.DATABASE_URL:
            return {
                "status": "success",
                "message": "Test data cleared (mock mode - no database)",
                "records_deleted": 0
            }

        # Test domains to clear
        test_domains = ['example.com', 'test-site.com', 'demo.org', 'test-domain.com']
        
        # Count test records before deletion
        result = await db.execute(
            select(func.count(BlocksUsage.id))
            .where(
                BlocksUsage.user_id == user.user_id,
                BlocksUsage.domain.in_(test_domains)
            )
        )
        test_count = result.scalar()
        
        if test_count > 0:
            # Delete test records
            await db.execute(
                BlocksUsage.__table__.delete()
                .where(
                    BlocksUsage.user_id == user.user_id,
                    BlocksUsage.domain.in_(test_domains)
                )
            )
            
            await db.commit()
            
            logger.info(f"Cleared {test_count} test records for user {user.user_id}")
            
            return {
                "status": "success",
                "message": f"Cleared {test_count} test records",
                "records_deleted": test_count
            }
        else:
            return {
                "status": "success",
                "message": "No test data found to clear",
                "records_deleted": 0
            }

    except Exception as e:
        logger.error(f"Error clearing test data: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to clear test data"
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

