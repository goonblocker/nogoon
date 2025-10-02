"""
Authentication routes
Handles Privy JWT authentication and user session management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import get_db, set_current_user
from app.models import User
from app.schemas import PrivyAuthRequest, AuthResponse
from app.privy_auth import privy_auth, get_current_user
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(
    request: PrivyAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user with Privy JWT token
    Creates user if doesn't exist, updates if exists
    """
    try:
        # Check if database is available
        if not settings.DATABASE_URL:
            # Return mock response if no database
            return AuthResponse(
                user_id="mock_user",
                is_premium=False,
                free_blocks_remaining=10,
                subscription_status="free",
                message="Authentication successful (mock mode - no database)"
            )
        # Verify Privy token
        claims = await privy_auth.verify_token(request.access_token)
        user_data = privy_auth.extract_user_data(claims)
        
        user_id = user_data["user_id"]
        
        # Set RLS context
        await set_current_user(db, user_id)
        
        # Check if user exists
        result = await db.execute(
            select(User).where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        
        current_time = datetime.utcnow()
        
        if user:
            # Update existing user
            user.last_login = current_time
            if user_data["email"]:
                user.email = user_data["email"]
            if user_data["wallet_address"]:
                user.wallet_address = user_data["wallet_address"]
            
            # Check if free blocks need reset (new day)
            if user.last_free_blocks_reset_date.date() < current_time.date():
                user.free_blocks_remaining = settings.FREE_BLOCKS_PER_DAY
                user.last_free_blocks_reset_date = current_time
                logger.info(f"Reset free blocks for user {user_id}")
            
            logger.info(f"User {user_id} logged in")
        else:
            # Create new user
            user = User(
                user_id=user_id,
                email=user_data["email"],
                wallet_address=user_data["wallet_address"],
                free_blocks_remaining=settings.FREE_BLOCKS_PER_DAY,
                last_free_blocks_reset_date=current_time,
                last_login=current_time
            )
            db.add(user)
            logger.info(f"Created new user {user_id}")
        
        await db.commit()
        await db.refresh(user)
        
        return AuthResponse(
            user_id=user.user_id,
            is_premium=user.is_premium,
            free_blocks_remaining=user.free_blocks_remaining,
            subscription_status=user.subscription_status,
            message="Authentication successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.post("/verify", response_model=AuthResponse)
async def verify_token(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify authentication token and return user status
    Used for checking auth state without full login
    """
    try:
        # Extract token from "Bearer <token>"
        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization header"
            )
        
        token = authorization.replace("Bearer ", "")
        
        # Verify token
        user_data = await get_current_user(token)
        user_id = user_data["user_id"]
        
        # Set RLS context
        await set_current_user(db, user_id)
        
        # Get user from database
        result = await db.execute(
            select(User).where(User.user_id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check daily reset
        current_time = datetime.utcnow()
        if user.last_free_blocks_reset_date.date() < current_time.date():
            user.free_blocks_remaining = settings.FREE_BLOCKS_PER_DAY
            user.last_free_blocks_reset_date = current_time
            await db.commit()
            await db.refresh(user)
        
        return AuthResponse(
            user_id=user.user_id,
            is_premium=user.is_premium,
            free_blocks_remaining=user.free_blocks_remaining,
            subscription_status=user.subscription_status,
            message="Token valid"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        )


@router.post("/logout")
async def logout(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Logout user (mainly for logging purposes)
    Token invalidation happens client-side
    """
    try:
        token = authorization.replace("Bearer ", "")
        user_data = await get_current_user(token)
        
        logger.info(f"User {user_data['user_id']} logged out")
        
        return {"status": "success", "message": "Logged out successfully"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return {"status": "success", "message": "Logged out"}

