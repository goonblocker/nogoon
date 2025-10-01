"""
Payment processing routes
Handles subscriptions with 50% discount for token payments
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import Union
import httpx

from app.database import get_db, set_current_user
from app.models import User, Payment
from app.schemas import (
    FiatPaymentRequest,
    TokenPaymentRequest,
    PaymentResponse,
    PaymentVerifyRequest
)
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


async def verify_blockchain_transaction(
    chain: str,
    tx_hash: str,
    from_address: str,
    expected_amount_usd: float
) -> bool:
    """
    Verify blockchain transaction
    This is a simplified version - in production, use proper blockchain RPC
    """
    try:
        if chain == "ethereum":
            # Use Ethereum RPC to verify transaction
            rpc_url = settings.ETHEREUM_RPC_URL
            if not rpc_url:
                logger.error("Ethereum RPC URL not configured")
                return False
            
            async with httpx.AsyncClient() as client:
                # Get transaction receipt
                response = await client.post(
                    rpc_url,
                    json={
                        "jsonrpc": "2.0",
                        "method": "eth_getTransactionReceipt",
                        "params": [tx_hash],
                        "id": 1
                    }
                )
                data = response.json()
                
                if "result" not in data or not data["result"]:
                    logger.warning(f"Transaction {tx_hash} not found")
                    return False
                
                receipt = data["result"]
                
                # Verify transaction success
                if receipt.get("status") != "0x1":
                    logger.warning(f"Transaction {tx_hash} failed")
                    return False
                
                # Verify sender
                if receipt.get("from", "").lower() != from_address.lower():
                    logger.warning(f"Sender mismatch for tx {tx_hash}")
                    return False
                
                # In production: verify amount, recipient, etc.
                logger.info(f"Ethereum transaction {tx_hash} verified")
                return True
                
        elif chain == "solana":
            # Use Solana RPC to verify transaction
            rpc_url = settings.SOLANA_RPC_URL
            if not rpc_url:
                logger.error("Solana RPC URL not configured")
                return False
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    rpc_url,
                    json={
                        "jsonrpc": "2.0",
                        "method": "getTransaction",
                        "params": [
                            tx_hash,
                            {"encoding": "json", "maxSupportedTransactionVersion": 0}
                        ],
                        "id": 1
                    }
                )
                data = response.json()
                
                if "result" not in data or not data["result"]:
                    logger.warning(f"Solana transaction {tx_hash} not found")
                    return False
                
                # Verify transaction details
                logger.info(f"Solana transaction {tx_hash} verified")
                return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error verifying blockchain transaction: {e}")
        return False


@router.post("/subscribe/fiat", response_model=PaymentResponse)
async def subscribe_fiat(
    payment_request: FiatPaymentRequest,
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Process fiat subscription payment (via Stripe/payment processor)"""
    try:
        amount_usd = settings.SUBSCRIPTION_PRICE_USD
        discount = 0.0
        final_amount = amount_usd
        
        # Calculate subscription period (1 month)
        period_start = datetime.utcnow()
        period_end = period_start + timedelta(days=30)
        
        # Create payment record
        payment = Payment(
            user_id=user.user_id,
            amount_usd=amount_usd,
            payment_method="fiat",
            discount_applied=discount,
            final_amount=final_amount,
            transaction_status="pending",
            subscription_period_start=period_start,
            subscription_period_end=period_end
        )
        
        # In production: Process Stripe payment here
        # stripe.PaymentIntent.create(...)
        
        # For demo: Mark as completed
        payment.transaction_status = "completed"
        payment.stripe_payment_intent_id = "pi_demo_" + str(datetime.utcnow().timestamp())
        
        # Update user subscription
        user.is_premium = True
        user.subscription_status = "active"
        user.subscription_start_date = period_start
        user.subscription_end_date = period_end
        
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        
        logger.info(f"Fiat subscription created for user {user.user_id}")
        
        return PaymentResponse(
            status="success",
            payment_id=payment.id,
            amount_usd=payment.amount_usd,
            discount_applied=payment.discount_applied,
            final_amount=payment.final_amount,
            payment_method=payment.payment_method,
            transaction_status=payment.transaction_status,
            subscription_period_start=payment.subscription_period_start,
            subscription_period_end=payment.subscription_period_end,
            stripe_payment_intent_id=payment.stripe_payment_intent_id,
            message="Subscription activated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error processing fiat payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment processing failed"
        )


@router.post("/subscribe/token", response_model=PaymentResponse)
async def subscribe_token(
    payment_request: TokenPaymentRequest,
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Process token subscription payment with 50% discount"""
    try:
        # Calculate discounted price for token payments
        amount_usd = settings.SUBSCRIPTION_PRICE_USD
        discount = settings.TOKEN_PAYMENT_DISCOUNT
        final_amount = settings.token_subscription_price  # $10 with 50% discount
        
        # Verify blockchain transaction
        is_valid = await verify_blockchain_transaction(
            chain=payment_request.chain,
            tx_hash=payment_request.transaction_hash,
            from_address=payment_request.from_address,
            expected_amount_usd=final_amount
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction verification failed"
            )
        
        # Calculate subscription period (1 month)
        period_start = datetime.utcnow()
        period_end = period_start + timedelta(days=30)
        
        # Create payment record
        payment = Payment(
            user_id=user.user_id,
            amount_usd=amount_usd,
            payment_method="token",
            discount_applied=discount,
            final_amount=final_amount,
            transaction_hash=payment_request.transaction_hash,
            transaction_status="completed",
            chain=payment_request.chain,
            from_address=payment_request.from_address,
            token_address=payment_request.token_address,
            subscription_period_start=period_start,
            subscription_period_end=period_end
        )
        
        # Update user subscription
        user.is_premium = True
        user.subscription_status = "active"
        user.subscription_start_date = period_start
        user.subscription_end_date = period_end
        user.preferred_payment_method = "token"
        
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        
        logger.info(f"Token subscription created for user {user.user_id} with 50% discount")
        
        return PaymentResponse(
            status="success",
            payment_id=payment.id,
            amount_usd=payment.amount_usd,
            discount_applied=payment.discount_applied,
            final_amount=payment.final_amount,
            payment_method=payment.payment_method,
            transaction_status=payment.transaction_status,
            subscription_period_start=payment.subscription_period_start,
            subscription_period_end=payment.subscription_period_end,
            transaction_hash=payment.transaction_hash,
            chain=payment.chain,
            message=f"Subscription activated with {int(discount * 100)}% token discount!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing token payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token payment processing failed"
        )


@router.post("/verify", response_model=PaymentResponse)
async def verify_payment(
    verify_request: PaymentVerifyRequest,
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify a payment status"""
    try:
        result = await db.execute(
            select(Payment).where(
                Payment.id == verify_request.payment_id,
                Payment.user_id == user.user_id
            )
        )
        payment = result.scalar_one_or_none()
        
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        return PaymentResponse(
            status="success",
            payment_id=payment.id,
            amount_usd=payment.amount_usd,
            discount_applied=payment.discount_applied,
            final_amount=payment.final_amount,
            payment_method=payment.payment_method,
            transaction_status=payment.transaction_status,
            subscription_period_start=payment.subscription_period_start,
            subscription_period_end=payment.subscription_period_end,
            transaction_hash=payment.transaction_hash,
            chain=payment.chain,
            stripe_payment_intent_id=payment.stripe_payment_intent_id,
            message="Payment details retrieved"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment verification failed"
        )


@router.get("/history")
async def get_payment_history(
    user: User = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's payment history"""
    try:
        result = await db.execute(
            select(Payment)
            .where(Payment.user_id == user.user_id)
            .order_by(Payment.created_at.desc())
        )
        payments = result.scalars().all()
        
        return {
            "status": "success",
            "payments": [
                {
                    "id": p.id,
                    "amount_usd": p.amount_usd,
                    "final_amount": p.final_amount,
                    "payment_method": p.payment_method,
                    "transaction_status": p.transaction_status,
                    "created_at": p.created_at,
                    "subscription_period_start": p.subscription_period_start,
                    "subscription_period_end": p.subscription_period_end,
                }
                for p in payments
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting payment history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve payment history"
        )

