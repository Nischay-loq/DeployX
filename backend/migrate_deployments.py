"""
Migration script to add missing columns to deployments table
Run this script once to update your existing database
"""
from sqlalchemy import create_engine, text
from app.auth.database import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_deployments_table():
    """Add missing columns to deployments table"""
    engine = create_engine(DATABASE_URL)
    
    migrations = [
        {
            "name": "software_ids",
            "sql": "ALTER TABLE deployments ADD COLUMN software_ids TEXT;"
        },
        {
            "name": "custom_software",
            "sql": "ALTER TABLE deployments ADD COLUMN custom_software TEXT;"
        },
        {
            "name": "rollback_performed",
            "sql": "ALTER TABLE deployments ADD COLUMN rollback_performed BOOLEAN DEFAULT FALSE;"
        }
    ]
    
    for migration in migrations:
        # Use a new connection for each migration to avoid transaction issues
        with engine.connect() as conn:
            try:
                logger.info(f"Adding column: {migration['name']}")
                conn.execute(text(migration['sql']))
                conn.commit()
                logger.info(f"✓ Successfully added column: {migration['name']}")
            except Exception as e:
                error_msg = str(e).lower()
                if 'duplicate column' in error_msg or 'already exists' in error_msg:
                    logger.info(f"Column {migration['name']} already exists, skipping")
                else:
                    logger.error(f"Error adding column {migration['name']}: {e}")
                    # Rollback the failed transaction
                    conn.rollback()
    
    logger.info("Migration completed!")

if __name__ == "__main__":
    migrate_deployments_table()
