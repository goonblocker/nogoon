"""
Configuration management using Pydantic Settings
Loads environment variables securely
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Environment
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    
    # Database - Railway PostgreSQL (optional for local development)
    DATABASE_URL: str = ""
    DATABASE_PUBLIC_URL: str = ""
    
    # Privy Configuration
    PRIVY_APP_ID: str
    PRIVY_APP_SECRET: str
    PRIVY_VERIFICATION_KEY: str  # For JWT validation
    
    # Security
    SECRET_KEY: str
    ALLOWED_ORIGINS: List[str] = [
        "chrome-extension://kjmbccjnkgcpboiiomckhdogdhociajd",  # Replace with actual extension ID
        "http://localhost:3000",  # For development
    ]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Payment Configuration
    SUBSCRIPTION_PRICE_USD: float = 20.0
    TOKEN_PAYMENT_DISCOUNT: float = 0.5  # 50% discount
    
    # Free tier limits
    FREE_BLOCKS_PER_DAY: int = 10
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Blockchain/Web3 (for token payments)
    ETHEREUM_RPC_URL: str = ""
    SOLANA_RPC_URL: str = ""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    @property
    def token_subscription_price(self) -> float:
        """Calculate discounted price for token payments"""
        return self.SUBSCRIPTION_PRICE_USD * (1 - self.TOKEN_PAYMENT_DISCOUNT)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()

