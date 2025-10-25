"""
Database migration script for scheduling tables
Run this to create the scheduling tables in your database
"""
from app.auth.database import engine, Base
from app.schedule.models import ScheduledTask, ScheduledTaskExecution
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_scheduling_tables():
    """Create scheduling tables in the database"""
    try:
        logger.info("Creating scheduling tables...")
        
        # This will create only the tables that don't exist yet
        Base.metadata.create_all(bind=engine)
        
        logger.info("✓ Scheduling tables created successfully!")
        logger.info("Tables created:")
        logger.info("  - scheduled_tasks")
        logger.info("  - scheduled_task_executions")
        
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise


if __name__ == "__main__":
    create_scheduling_tables()
