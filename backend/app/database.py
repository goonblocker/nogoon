"""
Database configuration and models with Row Level Security (RLS)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Create async engine
# Use SQLite for development, PostgreSQL for production
if settings.ENVIRONMENT == "development":
    # Use SQLite for development (no external dependencies)
    engine = create_async_engine(
        "sqlite+aiosqlite:///./nogoon.db",
        echo=True,
        pool_pre_ping=True
    )
else:
    # Use PostgreSQL for production
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

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
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


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

