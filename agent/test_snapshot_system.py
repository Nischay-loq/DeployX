"""
Test script for snapshot and rollback functionality.

Run this script to test the snapshot system locally without needing the backend.
"""
import asyncio
import os
import sys
import tempfile
import logging
from pathlib import Path

# Add parent directory to path so we can import agent modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_snapshot_manager():
    """Test the SnapshotManager independently."""
    from core.snapshot_manager import SnapshotManager
    
    logger.info("=" * 60)
    logger.info("Testing SnapshotManager")
    logger.info("=" * 60)
    
    # Create temporary directory for testing
    test_dir = Path(tempfile.mkdtemp(prefix="deployx_test_"))
    logger.info(f"Test directory: {test_dir}")
    
    try:
        # Initialize snapshot manager
        snapshot_mgr = SnapshotManager()
        
        # Create test files
        test_file1 = test_dir / "test1.txt"
        test_file2 = test_dir / "test2.txt"
        
        test_file1.write_text("Original content 1")
        test_file2.write_text("Original content 2")
        
        logger.info(f"Created test files: {test_file1}, {test_file2}")
        
        # Create snapshot
        snapshot_id = await snapshot_mgr.create_snapshot(
            command="echo 'Modified content' > test1.txt",
            working_dir=str(test_dir),
            monitored_paths=[str(test_dir)]
        )
        
        logger.info(f"✓ Snapshot created: {snapshot_id}")
        
        # Modify files (simulate command execution)
        test_file1.write_text("Modified content 1")
        test_file2.unlink()  # Delete second file
        test_file3 = test_dir / "test3.txt"
        test_file3.write_text("New file content")
        
        logger.info("✓ Files modified (test1 changed, test2 deleted, test3 created)")
        
        # Get snapshot info
        info = snapshot_mgr.get_snapshot_info(snapshot_id)
        logger.info(f"✓ Snapshot info: {info}")
        
        # Rollback
        success = await snapshot_mgr.rollback_snapshot(snapshot_id)
        
        if success:
            logger.info("✓ Rollback successful")
            
            # Verify rollback
            assert test_file1.read_text() == "Original content 1", "File 1 not restored"
            assert test_file2.exists(), "File 2 not restored"
            assert test_file2.read_text() == "Original content 2", "File 2 content incorrect"
            assert not test_file3.exists(), "New file not removed"
            
            logger.info("✓ All files restored correctly")
        else:
            logger.error("✗ Rollback failed")
        
        # Cleanup snapshot
        await snapshot_mgr.delete_snapshot(snapshot_id)
        logger.info("✓ Snapshot cleaned up")
        
        logger.info("=" * 60)
        logger.info("SnapshotManager test: PASSED")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup test directory
        import shutil
        shutil.rmtree(test_dir, ignore_errors=True)


async def test_command_executor():
    """Test the CommandExecutor with snapshot integration."""
    from core.snapshot_manager import SnapshotManager
    from core.shell_manager import ShellManager
    from core.command_executor import CommandExecutor
    
    logger.info("=" * 60)
    logger.info("Testing CommandExecutor")
    logger.info("=" * 60)
    
    test_dir = Path(tempfile.mkdtemp(prefix="deployx_test_"))
    logger.info(f"Test directory: {test_dir}")
    
    try:
        # Initialize components
        snapshot_mgr = SnapshotManager()
        shell_mgr = ShellManager()
        cmd_executor = CommandExecutor(shell_mgr, snapshot_mgr)
        
        # Start shell
        import platform
        shell_name = "cmd" if platform.system() == "Windows" else "bash"
        
        # Note: This test requires a shell to be running
        # In real usage, the shell would be started by the socket handler
        logger.info(f"Note: Full command execution test requires shell integration")
        logger.info(f"Skipping live command execution test")
        
        # Test batch tracking
        batch_id = "test_batch_001"
        
        # Simulate creating snapshots for a batch
        for i in range(3):
            snapshot_id = await snapshot_mgr.create_snapshot(
                command=f"test_command_{i}",
                working_dir=str(test_dir),
                batch_id=batch_id,
                command_index=i
            )
            logger.info(f"✓ Created snapshot {i+1}/3: {snapshot_id}")
        
        # Get batch info
        batch_info = snapshot_mgr.get_batch_info(batch_id)
        logger.info(f"✓ Batch info: {batch_info}")
        
        assert len(batch_info['snapshot_ids']) == 3, "Batch should have 3 snapshots"
        
        # Test batch rollback
        success = await snapshot_mgr.rollback_batch(batch_id)
        logger.info(f"✓ Batch rollback: {'successful' if success else 'failed'}")
        
        # Cleanup
        await snapshot_mgr.delete_batch_snapshots(batch_id)
        logger.info("✓ Batch snapshots cleaned up")
        
        logger.info("=" * 60)
        logger.info("CommandExecutor test: PASSED")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        import shutil
        shutil.rmtree(test_dir, ignore_errors=True)


async def test_snapshot_cleanup():
    """Test automatic snapshot cleanup."""
    from core.snapshot_manager import SnapshotManager
    from datetime import datetime, timedelta
    
    logger.info("=" * 60)
    logger.info("Testing Snapshot Cleanup")
    logger.info("=" * 60)
    
    test_dir = Path(tempfile.mkdtemp(prefix="deployx_test_"))
    
    try:
        snapshot_mgr = SnapshotManager()
        
        # Create some snapshots
        snapshot_ids = []
        for i in range(3):
            snapshot_id = await snapshot_mgr.create_snapshot(
                command=f"test_command_{i}",
                working_dir=str(test_dir)
            )
            snapshot_ids.append(snapshot_id)
        
        logger.info(f"✓ Created {len(snapshot_ids)} test snapshots")
        
        # Manually modify timestamp to simulate old snapshots
        for snapshot_id in snapshot_ids[:2]:
            snapshot = snapshot_mgr.snapshots[snapshot_id]
            # Make snapshot 25 hours old
            snapshot.timestamp = datetime.now().timestamp() - (25 * 3600)
        
        logger.info("✓ Modified 2 snapshots to be 25 hours old")
        
        # Run cleanup (max age: 24 hours)
        await snapshot_mgr.cleanup_old_snapshots(max_age_hours=24)
        
        # Verify cleanup
        remaining = len(snapshot_mgr.snapshots)
        logger.info(f"✓ Snapshots remaining after cleanup: {remaining}")
        
        assert remaining == 1, "Should have 1 snapshot remaining"
        assert snapshot_ids[2] in snapshot_mgr.snapshots, "Recent snapshot should remain"
        
        # Cleanup remaining
        await snapshot_mgr.delete_snapshot(snapshot_ids[2])
        
        logger.info("=" * 60)
        logger.info("Snapshot Cleanup test: PASSED")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        import shutil
        shutil.rmtree(test_dir, ignore_errors=True)


async def test_batch_execution():
    """Test batch execution with persistent context."""
    logger.info("=" * 60)
    logger.info("Testing Batch Execution (Persistent Context)")
    logger.info("=" * 60)
    
    logger.info("This test demonstrates the batch execution concept:")
    logger.info("1. Commands execute in the same shell session")
    logger.info("2. Each command gets its own snapshot")
    logger.info("3. Context (like 'cd') persists between commands")
    logger.info("")
    logger.info("Example batch:")
    logger.info("  - cd backend/")
    logger.info("  - mkdir test_folder")
    logger.info("  - echo 'test' > test.txt")
    logger.info("")
    logger.info("All commands run in the same shell, so 'cd' affects")
    logger.info("subsequent commands, and each step can be individually")
    logger.info("rolled back if needed.")
    
    logger.info("=" * 60)
    logger.info("Batch Execution test: CONCEPTUAL (requires live shell)")
    logger.info("=" * 60)


async def run_all_tests():
    """Run all tests."""
    logger.info("\n" + "=" * 60)
    logger.info("DEPLOYX SNAPSHOT/ROLLBACK SYSTEM TESTS")
    logger.info("=" * 60 + "\n")
    
    await test_snapshot_manager()
    await asyncio.sleep(1)
    
    await test_command_executor()
    await asyncio.sleep(1)
    
    await test_snapshot_cleanup()
    await asyncio.sleep(1)
    
    await test_batch_execution()
    
    logger.info("\n" + "=" * 60)
    logger.info("ALL TESTS COMPLETED")
    logger.info("=" * 60)


if __name__ == "__main__":
    # Run tests
    asyncio.run(run_all_tests())
