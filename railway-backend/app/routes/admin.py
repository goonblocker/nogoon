"""
Admin routes for database management
"""
from fastapi import APIRouter, HTTPException
from app.database import engine, Base
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/init-database")
async def initialize_database():
    """
    Initialize database tables
    WARNING: Only use this once during initial deployment
    """
    try:
        logger.info("Initializing database tables...")
        
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        logger.info("✅ Database tables created successfully")
        
        return {
            "status": "success",
            "message": "Database tables initialized successfully",
            "tables": ["users", "blocks_usage", "payments", "sync_logs"]
        }
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize database: {str(e)}"
        )


@router.get("/check-tables")
async def check_tables():
    """Check if database tables exist"""
    try:
        from sqlalchemy import text, inspect
        
        async with engine.connect() as conn:
            # Get list of tables
            result = await conn.execute(text("""
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public'
            """))
            tables = [row[0] for row in result.fetchall()]
        
        return {
            "status": "success",
            "tables": tables,
            "count": len(tables)
        }
        
    except Exception as e:
        logger.error(f"Failed to check tables: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check tables: {str(e)}"
        )


