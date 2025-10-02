#!/usr/bin/env python3
"""
Run database migration to simplify schema
"""
import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from migrate_database import migrate_database
import logging

async def main():
    """Run the migration"""
    logging.basicConfig(level=logging.INFO)
    try:
        await migrate_database()
        print("✅ Database migration completed successfully!")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
