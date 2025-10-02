"""
Database configuration and models with Row Level Security (RLS)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import settings
import logging
import asyncio

logger = logging.getLogger(__name__)

# Create async engine
# Always use PostgreSQL if DATABASE_URL is set, otherwise use SQLite
if settings.DATABASE_URL and not settings.DATABASE_URL.startswith("sqlite"):
    # Use PostgreSQL with asyncpg driver (development or production)
    # Convert postgresql:// to postgresql+asyncpg:// for async support
    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    engine = create_async_engine(
        db_url,
        echo=settings.ENVIRONMENT == "development",
        pool_pre_ping=True,
        pool_size=5,  # Reduced pool size for Railway
        max_overflow=10,  # Reduced overflow for Railway
        pool_recycle=3600,  # Recycle connections every hour
        pool_timeout=30,  # Timeout for getting connection from pool
        connect_args={
            "command_timeout": 60,  # Command timeout
            "server_settings": {
                "application_name": "nogoon_backend",
            }
        }
    )
    logger.info(f"Using PostgreSQL database with asyncpg")
else:
    # Use SQLite for local testing without Railway
    engine = create_async_engine(
        "sqlite+aiosqlite:///./nogoon.db",
        echo=True,
        pool_pre_ping=True
    )
    logger.info("Using SQLite database (local testing)")

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    """Base class for all models"""
    pass


async def get_db() -> AsyncSession:
    """Dependency to get database session with retry logic"""
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            async with AsyncSessionLocal() as session:
                try:
                    yield session
                    await session.commit()
                except Exception as e:
                    logger.error(f"Database operation failed (attempt {attempt + 1}): {e}")
                    await session.rollback()
                    raise
                finally:
                    await session.close()
                return  # Success, exit retry loop
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Database connection failed (attempt {attempt + 1}), retrying in {retry_delay}s: {e}")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Database connection failed after {max_retries} attempts: {e}")
                raise


async def init_rls_policies():
    """
    Initialize Row Level Security (RLS) policies for PostgreSQL
    This ensures users can only access their own data
    """
    async with engine.begin() as conn:
        # Enable RLS on users table
        await conn.execute(text("""
            ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        """))
        
        # Create policy: Users can only see their own records
        await conn.execute(text("""
            CREATE POLICY users_isolation_policy ON users
            USING (user_id = current_setting('app.current_user_id')::text);
        """))
        
        # Enable RLS on blocks_usage table
        await conn.execute(text("""
            ALTER TABLE blocks_usage ENABLE ROW LEVEL SECURITY;
        """))
        
        # Create policy: Users can only see their own usage records
        await conn.execute(text("""
            CREATE POLICY blocks_usage_isolation_policy ON blocks_usage
            USING (user_id = current_setting('app.current_user_id')::text);
        """))
        
        # Enable RLS on payments table
        await conn.execute(text("""
            ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        """))
        
        # Create policy: Users can only see their own payments
        await conn.execute(text("""
            CREATE POLICY payments_isolation_policy ON payments
            USING (user_id = current_setting('app.current_user_id')::text);
        """))
        
        logger.info("RLS policies initialized successfully")


async def set_current_user(session: AsyncSession, user_id: str):
    """Set current user context for RLS"""
    await session.execute(
        text("SET LOCAL app.current_user_id = :user_id"),
        {"user_id": user_id}
    )

