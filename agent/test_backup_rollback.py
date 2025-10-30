"""
Test script for backup and rollback functionality.

This script demonstrates the destructive command detection and backup system.
"""
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agent.core.backup_manager import BackupManager
from agent.core.destructive_detector import DestructiveCommandDetector
from agent.core.command_executor import CommandExecutor
from agent.core.shell_manager import ShellManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_detector():
    """Test destructive command detector."""
    print("\n" + "="*80)
    print("TESTING DESTRUCTIVE COMMAND DETECTOR")
    print("="*80 + "\n")
    
    detector = DestructiveCommandDetector()
    
    test_commands = [
        # Destructive commands
        "del /s /q C:\\temp\\old_data",
        "rm -rf /var/log/old",
        "Remove-Item -Recurse -Force C:\\temp\\*",
        "format C:",
        "mv /data/file.txt /backup/",
        "echo '' > config.txt",
        "DROP TABLE users;",
        
        # Safe commands
        "dir C:\\temp",
        "ls -la /var/log",
        "Get-ChildItem C:\\temp",
        "copy file.txt backup.txt",
        "echo 'test' >> log.txt",
        "SELECT * FROM users;",
    ]
    
    for cmd in test_commands:
        analysis = detector.analyze_command(cmd)
        
        print(f"Command: {cmd}")
        print(f"  Destructive: {analysis['is_destructive']}")
        
        if analysis['is_destructive']:
            print(f"  Category: {analysis['category']}")
            print(f"  Severity: {analysis['severity']}")
            print(f"  Description: {analysis['description']}")
            print(f"  Affected Paths: {analysis['affected_paths']}")
            print(f"  Requires Backup: {analysis['requires_backup']}")
        
        print()


def test_backup_manager():
    """Test backup manager."""
    print("\n" + "="*80)
    print("TESTING BACKUP MANAGER")
    print("="*80 + "\n")
    
    # Create test directory and file
    test_dir = Path("test_backup_data")
    test_dir.mkdir(exist_ok=True)
    
    test_file = test_dir / "test_file.txt"
    test_file.write_text("This is test data for backup testing.\n" * 10)
    
    test_subdir = test_dir / "subdir"
    test_subdir.mkdir(exist_ok=True)
    (test_subdir / "nested.txt").write_text("Nested file content")
    
    print(f"Created test directory: {test_dir}")
    
    # Test backup manager
    backup_mgr = BackupManager()
    
    # Create backup
    print("\n1. Creating backup...")
    backup_path = backup_mgr.create_backup(
        target_path=str(test_dir),
        backup_id="test_backup_001",
        command="rm -rf test_backup_data",
        metadata={'test': True, 'purpose': 'demonstration'}
    )
    
    if backup_path:
        print(f"✓ Backup created: {backup_path}")
        
        # Get backup info
        info = backup_mgr.get_backup_info("test_backup_001")
        print(f"\nBackup info:")
        print(f"  - Original path: {info['original_path']}")
        print(f"  - Backup size: {info['backup_size']} bytes")
        print(f"  - File count: {info['file_count']}")
        print(f"  - Created: {info['created_at']}")
    else:
        print("✗ Failed to create backup")
        return
    
    # Simulate deletion
    print("\n2. Simulating destructive operation (deleting test directory)...")
    import shutil
    shutil.rmtree(test_dir)
    print(f"✓ Deleted: {test_dir}")
    print(f"  Exists: {test_dir.exists()}")
    
    # Restore backup
    print("\n3. Restoring from backup...")
    success = backup_mgr.restore_backup("test_backup_001")
    
    if success:
        print(f"✓ Backup restored successfully")
        print(f"  Directory exists: {test_dir.exists()}")
        print(f"  File exists: {test_file.exists()}")
        print(f"  Nested file exists: {(test_subdir / 'nested.txt').exists()}")
        
        # Verify content
        content = test_file.read_text()
        print(f"  File content matches: {content.startswith('This is test data')}")
    else:
        print("✗ Failed to restore backup")
    
    # List all backups
    print("\n4. Listing all backups...")
    backups = backup_mgr.list_backups()
    print(f"Total backups: {len(backups)}")
    for backup in backups:
        print(f"  - {backup['backup_id']}: {backup['original_path']} "
              f"({backup['backup_size']} bytes)")
    
    # Get backup size info
    size_info = backup_mgr.get_backup_size()
    print(f"\nTotal backup storage:")
    print(f"  - Size: {size_info['total_size_mb']} MB")
    print(f"  - Count: {size_info['backup_count']}")
    print(f"  - Directory: {size_info['backup_dir']}")
    
    # Cleanup
    print("\n5. Cleaning up test data...")
    if test_dir.exists():
        shutil.rmtree(test_dir)
    backup_mgr.delete_backup("test_backup_001")
    print("✓ Cleanup complete")


async def test_integration():
    """Test integration with command executor."""
    print("\n" + "="*80)
    print("TESTING INTEGRATION WITH COMMAND EXECUTOR")
    print("="*80 + "\n")
    
    # Create test directory
    test_dir = Path("test_integration_data")
    test_dir.mkdir(exist_ok=True)
    (test_dir / "file1.txt").write_text("File 1 content")
    (test_dir / "file2.txt").write_text("File 2 content")
    
    print(f"Created test directory: {test_dir}")
    print(f"Files: {list(test_dir.glob('*.txt'))}")
    
    # Create shell manager and command executor
    shell_manager = ShellManager()
    executor = CommandExecutor(
        shell_manager=shell_manager,
        connection=None,  # No connection for testing
        enable_auto_backup=True
    )
    
    print("\n1. Testing automatic backup on destructive command...")
    
    # This would be a destructive command in real scenario
    # For testing, we'll just analyze it without executing
    test_command = f"del /s /q {test_dir}"
    
    analysis = executor.detector.analyze_command(test_command)
    print(f"\nCommand: {test_command}")
    print(f"Analysis:")
    print(f"  - Destructive: {analysis['is_destructive']}")
    print(f"  - Category: {analysis['category']}")
    print(f"  - Severity: {analysis['severity']}")
    print(f"  - Affected paths: {analysis['affected_paths']}")
    
    # Create manual backup (since we're not executing the command)
    if analysis['is_destructive']:
        backup_id = "integration_test_001"
        backup_path = executor.backup_manager.create_backup(
            target_path=str(test_dir),
            backup_id=backup_id,
            command=test_command,
            metadata={'test': 'integration'}
        )
        
        if backup_path:
            print(f"\n✓ Backup created: {backup_path}")
            
            # Track backup
            executor.command_backups[backup_id] = [backup_id]
            
            # Simulate deletion
            print("\n2. Simulating destructive operation...")
            import shutil
            shutil.rmtree(test_dir)
            print(f"✓ Deleted: {test_dir}")
            
            # Test rollback
            print("\n3. Testing rollback...")
            success = await executor.rollback_command(backup_id)
            
            if success:
                print(f"✓ Rollback successful")
                print(f"  Directory restored: {test_dir.exists()}")
                print(f"  Files restored: {list(test_dir.glob('*.txt'))}")
            else:
                print("✗ Rollback failed")
            
            # Cleanup
            print("\n4. Cleaning up...")
            if test_dir.exists():
                shutil.rmtree(test_dir)
            executor.backup_manager.delete_backup(backup_id)
            print("✓ Cleanup complete")


def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("BACKUP AND ROLLBACK SYSTEM - TEST SUITE")
    print("="*80)
    
    try:
        # Test 1: Destructive command detector
        test_detector()
        
        # Test 2: Backup manager
        test_backup_manager()
        
        # Test 3: Integration
        asyncio.run(test_integration())
        
        print("\n" + "="*80)
        print("ALL TESTS COMPLETED")
        print("="*80 + "\n")
        
    except Exception as e:
        logger.exception(f"Test failed: {e}")
        print(f"\n✗ Test suite failed: {e}")


if __name__ == "__main__":
    main()
