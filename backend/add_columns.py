from app.auth.database import engine, Base
from sqlalchemy import text

# Add the missing columns to the deployments table
with engine.connect() as conn:
    try:
        # Add software_ids column
        conn.execute(text("ALTER TABLE deployments ADD COLUMN IF NOT EXISTS software_ids TEXT"))
        # Add custom_software column
        conn.execute(text("ALTER TABLE deployments ADD COLUMN IF NOT EXISTS custom_software TEXT"))
        conn.commit()
        print("Successfully added missing columns to deployments table")
    except Exception as e:
        print(f"Error adding columns: {e}")
        conn.rollback()