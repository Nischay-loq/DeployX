#!/usr/bin/env python3
"""
Migration script to move agent data from agents table to devices table.
Run this script to migrate existing agent data.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from sqlalchemy import text
from app.auth.database import get_db, engine
from app.agents import models as agent_models
from app.grouping.models import Device
import logging
import ipaddress

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_agents_to_devices():
    """Migrate data from agents table to devices table."""
    db = next(get_db())
    
    try:
        # Get all agents from the agents table
        agents = db.query(agent_models.Agent).all()
        logger.info(f"Found {len(agents)} agents to migrate")
        
        migrated_count = 0
        for agent in agents:
            # Check if device already exists
            existing_device = db.query(Device).filter(Device.agent_id == agent.agent_id).first()
            
            if existing_device:
                logger.info(f"Device with agent_id {agent.agent_id} already exists, updating...")
                # Update existing device
                existing_device.device_name = agent.hostname
                existing_device.os = agent.os
                existing_device.os_version = agent.os_version
                existing_device.os_release = agent.os_release
                existing_device.processor = agent.processor
                existing_device.python_version = agent.python_version
                existing_device.cpu_count = agent.cpu_count
                existing_device.memory_total = agent.memory_total
                existing_device.memory_available = agent.memory_available
                existing_device.disk_total = agent.disk_total
                existing_device.disk_free = agent.disk_free
                existing_device.shells = agent.shells
                existing_device.status = agent.status
                existing_device.last_seen = agent.last_seen
                existing_device.updated_at = agent.updated_at
                existing_device.system_info = agent.system_info
                existing_device.machine_id = agent.machine_id
            else:
                # Create new device from agent data
                logger.info(f"Creating new device for agent {agent.agent_id}")
                
                new_device = Device(
                    agent_id=agent.agent_id,
                    machine_id=agent.machine_id,
                    device_name=agent.hostname,
                    ip_address="0.0.0.0",  # Default IP, will be updated when agent connects
                    os=agent.os,
                    os_version=agent.os_version,
                    os_release=agent.os_release,
                    processor=agent.processor,
                    python_version=agent.python_version,
                    cpu_count=agent.cpu_count,
                    memory_total=agent.memory_total,
                    memory_available=agent.memory_available,
                    disk_total=agent.disk_total,
                    disk_free=agent.disk_free,
                    shells=agent.shells,
                    status=agent.status,
                    last_seen=agent.last_seen,
                    updated_at=agent.updated_at,
                    system_info=agent.system_info
                )
                db.add(new_device)
            
            migrated_count += 1
        
        # Commit all changes
        db.commit()
        logger.info(f"Successfully migrated {migrated_count} agents to devices table")
        
        # Optional: Ask if user wants to delete agents table data
        response = input("Migration complete! Do you want to delete the old agent data? (y/N): ")
        if response.lower() == 'y':
            deleted_count = db.query(agent_models.Agent).count()
            db.query(agent_models.Agent).delete()
            db.commit()
            logger.info(f"Deleted {deleted_count} records from agents table")
        else:
            logger.info("Old agent data preserved in agents table")
            
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting agent to device migration...")
    migrate_agents_to_devices()
    print("Migration completed!")