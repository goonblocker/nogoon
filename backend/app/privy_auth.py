"""
Privy authentication utilities for JWT validation
Based on Privy documentation: https://docs.privy.io
"""
import jwt
import httpx
from typing import Optional, Dict
from fastapi import HTTPException, status
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class PrivyAuthenticator:
    """Handles Privy JWT validation and user authentication"""
    
    def __init__(self):
        self.app_id = settings.PRIVY_APP_ID
        self.app_secret = settings.PRIVY_APP_SECRET
        self.verification_key_url = f"https://auth.privy.io/api/v1/apps/{self.app_id}/verification_key"
        self._verification_key: Optional[str] = None
    
    async def get_verification_key(self) -> str:
        """Fetch Privy's public verification key for JWT validation"""
        if self._verification_key:
            return self._verification_key
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.verification_key_url,
                    headers={
                        "Authorization": f"Bearer {self.app_secret}",
                        "privy-app-id": self.app_id
                    }
                )
                response.raise_for_status()
                data = response.json()
                self._verification_key = data.get("verification_key")
                
                if not self._verification_key:
                    raise ValueError("No verification key in response")
                
                logger.info("Privy verification key fetched successfully")
                return self._verification_key
        except Exception as e:
            logger.error(f"Error fetching Privy verification key: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch authentication verification key"
            )
    
    async def verify_token(self, token: str) -> Dict:
        """
        Verify Privy JWT token and extract user claims
        
        Args:
            token: Privy JWT access token
            
        Returns:
            Dict containing user claims (user_id, email, wallet, etc.)
        """
        try:
            # Get verification key
            verification_key = await self.get_verification_key()
            
            # Decode and verify JWT
            # Privy uses ES256 algorithm (ECDSA with SHA-256)
            decoded = jwt.decode(
                token,
                verification_key,
                algorithms=["ES256"],
                audience=self.app_id,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True
                }
            )
            
            logger.info(f"Token verified for user: {decoded.get('sub')}")
            return decoded
            
        except jwt.ExpiredSignatureError:
            logger.warning("Expired JWT token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"}
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"}
            )
    
    def extract_user_data(self, claims: Dict) -> Dict:
        """
        Extract user data from Privy JWT claims
        
        Standard Privy claims:
        - sub: User ID (Privy DID)
        - email: User email (if available)
        - wallet: Wallet address (if linked)
        - phone: Phone number (if available)
        """
        user_data = {
            "user_id": claims.get("sub"),
            "email": None,
            "wallet_address": None
        }
        
        # Extract email if present
        if "email" in claims:
            user_data["email"] = claims["email"]
        
        # Extract wallet address if present
        # Privy may include wallet in different formats
        if "wallet" in claims:
            wallet = claims["wallet"]
            if isinstance(wallet, dict):
                user_data["wallet_address"] = wallet.get("address")
            elif isinstance(wallet, str):
                user_data["wallet_address"] = wallet
        
        # Check for linked accounts (alternative structure)
        if "linked_accounts" in claims:
            for account in claims["linked_accounts"]:
                if account.get("type") == "wallet":
                    user_data["wallet_address"] = account.get("address")
                    break
                elif account.get("type") == "email":
                    user_data["email"] = account.get("address")
        
        return user_data


# Global authenticator instance
privy_auth = PrivyAuthenticator()


async def get_current_user(token: str) -> Dict:
    """
    Dependency to get current authenticated user from Privy token
    
    Usage in routes:
    @app.get("/protected")
    async def protected_route(user: Dict = Depends(get_current_user)):
        return {"user_id": user["user_id"]}
    """
    claims = await privy_auth.verify_token(token)
    return privy_auth.extract_user_data(claims)

