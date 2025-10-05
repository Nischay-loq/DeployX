"""
Database migration script to add file deployment tables
Run this script to update the database schema for file handling features
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, inspect
from app.auth.database import DATABASE_URL, engine, Base

# Import ALL models to ensure tables are registered with Base
from app.auth.models import User
from app.grouping.models import Device, DeviceGroup, DeviceGroupMap
from app.files.models import UploadedFile, FileDeployment, FileDeploymentResult

def check_table_exists(table_name):
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    if not check_table_exists(table_name):
        return False
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns

def migrate_file_tables():
    """Create or update file-related tables"""
    
    print("🔍 Checking database schema for file handling...")
    
    # Check if tables exist
    uploaded_files_exists = check_table_exists('uploaded_files')
    file_deployments_exists = check_table_exists('file_deployments')
    file_deployment_results_exists = check_table_exists('file_deployment_results')
    
    print(f"  • uploaded_files table: {'✅ EXISTS' if uploaded_files_exists else '❌ MISSING'}")
    print(f"  • file_deployments table: {'✅ EXISTS' if file_deployments_exists else '❌ MISSING'}")
    print(f"  • file_deployment_results table: {'✅ EXISTS' if file_deployment_results_exists else '❌ MISSING'}")
    
    # Create tables if they don't exist
    if not all([uploaded_files_exists, file_deployments_exists, file_deployment_results_exists]):
        print("\n📝 Creating missing tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
    else:
        print("\n✅ All tables already exist")
    
    # Verify critical columns
    print("\n🔍 Verifying table columns...")
    
    issues_found = False
    
    # Check file_deployments columns
    if file_deployments_exists:
        required_columns = ['file_ids', 'deployment_name', 'target_path', 'device_ids', 'group_ids', 
                          'status', 'created_at', 'started_at', 'completed_at', 'created_by']
        
        for col in required_columns:
            exists = check_column_exists('file_deployments', col)
            status = '✅' if exists else '❌'
            print(f"  {status} file_deployments.{col}")
            if not exists:
                issues_found = True
    
    # Check uploaded_files columns
    if uploaded_files_exists:
        required_columns = ['filename', 'original_filename', 'file_path', 'file_size', 
                          'content_type', 'checksum', 'upload_time', 'uploaded_by']
        
        for col in required_columns:
            exists = check_column_exists('uploaded_files', col)
            status = '✅' if exists else '❌'
            print(f"  {status} uploaded_files.{col}")
            if not exists:
                issues_found = True
    
    # Check file_deployment_results columns
    if file_deployment_results_exists:
        required_columns = ['deployment_id', 'device_id', 'file_id', 'status', 
                          'message', 'path_created', 'deployed_at', 'error_details']
        
        for col in required_columns:
            exists = check_column_exists('file_deployment_results', col)
            status = '✅' if exists else '❌'
            print(f"  {status} file_deployment_results.{col}")
            if not exists:
                issues_found = True
    
    if issues_found:
        print("\n⚠️  Column mismatches detected!")
        print("📝 Dropping and recreating tables to fix schema...")
        
        # Drop tables in correct order (foreign keys)
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS file_deployment_results CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS file_deployments CASCADE"))
            conn.execute(text("DROP TABLE IF EXISTS uploaded_files CASCADE"))
        
        print("  • Dropped old tables")
        
        # Recreate tables
        Base.metadata.create_all(bind=engine)
        print("  • Recreated tables with correct schema")
        print("\n✅ Schema migration completed successfully!")
    else:
        print("\n✅ All columns are correct!")
    
    print("\n" + "="*60)
    print("🎉 Database migration completed!")
    print("="*60)

if __name__ == "__main__":
    try:
        migrate_file_tables()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
