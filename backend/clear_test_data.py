#!/usr/bin/env python3
"""
Script to clear test data from the database
"""
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import BlocksUsage

async def clear_test_data():
    """Clear test data from the database"""
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return
    
    print(f"🔗 Connecting to database...")
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Find test domains
            test_domains = ['example.com', 'test-site.com', 'demo.org', 'test-domain.com']
            
            print(f"🔍 Looking for test data with domains: {test_domains}")
            
            # Count test records
            from sqlalchemy import select, func
            result = await session.execute(
                select(func.count(BlocksUsage.id))
                .where(BlocksUsage.domain.in_(test_domains))
            )
            test_count = result.scalar()
            
            if test_count > 0:
                print(f"🗑️  Found {test_count} test records to delete")
                
                # Delete test records
                await session.execute(
                    BlocksUsage.__table__.delete()
                    .where(BlocksUsage.domain.in_(test_domains))
                )
                
                await session.commit()
                print(f"✅ Deleted {test_count} test records")
            else:
                print("ℹ️  No test data found")
            
            # Show remaining data
            result = await session.execute(
                select(func.count(BlocksUsage.id))
            )
            total_count = result.scalar()
            print(f"📊 Total remaining records: {total_count}")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            await session.rollback()
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(clear_test_data())
