"""Software deployment executor - handles actual software deployment to agents"""
import logging
import asyncio
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from datetime import datetime

logger = logging.getLogger(__name__)

class SoftwareDeploymentExecutor:
    """Executes software deployments to target devices"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def deploy_to_devices(
        self,
        deployment_id: int,
        software_ids: List[int],
        device_ids: List[int],
        custom_software: Optional[str] = None
    ) -> Dict:
        """
        Deploy software to specified devices (sync wrapper for async deployment)
        
        Args:
            deployment_id: ID of the deployment
            software_ids: List of software IDs to install
            device_ids: List of target device IDs
            custom_software: Custom software command/URL
            
        Returns:
            Dictionary with deployment status
        """
        # Create new event loop for this background task
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self._deploy_to_devices_async(
                    deployment_id,
                    software_ids,
                    device_ids,
                    custom_software
                )
            )
            loop.close()
            return result
        except Exception as e:
            logger.error(f"Error in deploy_to_devices: {e}", exc_info=True)
            return {
                "deployment_id": deployment_id,
                "status": "failed",
                "error": str(e)
            }
        
    async def _deploy_to_devices_async(
        self,
        deployment_id: int,
        software_ids: List[int],
        device_ids: List[int],
        custom_software: Optional[str] = None
    ) -> Dict:
        """
        Deploy software to specified devices
        
        Args:
            deployment_id: ID of the deployment
            software_ids: List of software IDs to install
            device_ids: List of target device IDs
            custom_software: Custom software command/URL
            
        Returns:
            Dictionary with deployment status
        """
        from app.software.models import Software
        from app.Devices.models import Device
        from app.Deployments.models import DeploymentTarget
        
        logger.info(f"[DEPLOYMENT {deployment_id}] Starting deployment to {len(device_ids)} devices")
        logger.info(f"[DEPLOYMENT {deployment_id}] Software IDs: {software_ids}")
        logger.info(f"[DEPLOYMENT {deployment_id}] Device IDs: {device_ids}")
        
        # Get software details
        software_list = []
        if software_ids:
            software_list = self.db.query(Software).filter(
                Software.id.in_(software_ids),
                Software.is_active == True
            ).all()
            logger.info(f"[DEPLOYMENT {deployment_id}] Found {len(software_list)} software packages")
        
        # Get device details
        devices = self.db.query(Device).filter(
            Device.id.in_(device_ids),
            Device.status == "online"
        ).all()
        
        logger.info(f"[DEPLOYMENT {deployment_id}] Found {len(devices)} online devices")
        for device in devices:
            logger.info(f"[DEPLOYMENT {deployment_id}] Device: {device.device_name} (agent_id: {device.agent_id})")
        
        online_device_ids = [d.id for d in devices]
        offline_devices = set(device_ids) - set(online_device_ids)
        
        # Mark offline devices as failed
        for device_id in offline_devices:
            target = self.db.query(DeploymentTarget).filter(
                DeploymentTarget.deployment_id == deployment_id,
                DeploymentTarget.device_id == device_id
            ).first()
            
            if target:
                target.status = "failed"
                target.error_message = "Device offline"
                target.completed_at = datetime.utcnow()
        
        self.db.commit()
        
        # Deploy to online devices
        deployment_tasks = []
        for device in devices:
            if custom_software:
                task = self._deploy_custom_software(
                    deployment_id, device, custom_software
                )
            else:
                task = self._deploy_software_packages(
                    deployment_id, device, software_list
                )
            deployment_tasks.append(task)
        
        # Execute deployments in parallel
        if deployment_tasks:
            results = await asyncio.gather(*deployment_tasks, return_exceptions=True)
            
            success_count = sum(1 for r in results if r and not isinstance(r, Exception))
            failure_count = len(results) - success_count
            
            logger.info(
                f"Deployment {deployment_id} completed: "
                f"{success_count} success, {failure_count} failed, "
                f"{len(offline_devices)} offline"
            )
        
        return {
            "deployment_id": deployment_id,
            "total_devices": len(device_ids),
            "online_devices": len(online_device_ids),
            "offline_devices": len(offline_devices),
            "status": "completed"
        }
    
    async def _deploy_software_packages(
        self,
        deployment_id: int,
        device,
        software_list: List
    ) -> bool:
        """Deploy software packages to a specific device"""
        from app.Deployments.models import DeploymentTarget
        
        try:
            # Get deployment target
            target = self.db.query(DeploymentTarget).filter(
                DeploymentTarget.deployment_id == deployment_id,
                DeploymentTarget.device_id == device.id
            ).first()
            
            if not target:
                logger.error(f"No deployment target found for device {device.id}")
                return False
            
            # Update status to in_progress
            target.status = "in_progress"
            target.started_at = datetime.utcnow()
            target.progress_percent = 0
            self.db.commit()
            
            # Get Socket.IO instance
            try:
                from app.main import get_socketio_components
                sio, _ = get_socketio_components()
            except Exception as e:
                logger.error(f"Failed to get Socket.IO components: {e}")
                target.status = "failed"
                target.error_message = "Socket.IO not available"
                target.completed_at = datetime.utcnow()
                self.db.commit()
                return False
            
            # Prepare software installation data
            software_data = []
            for software in software_list:
                # Determine install command based on device OS
                install_command = None
                device_os = getattr(device, 'os_type', 'windows').lower()
                
                if 'windows' in device_os and software.install_command_windows:
                    install_command = software.install_command_windows
                elif 'linux' in device_os and software.install_command_linux:
                    install_command = software.install_command_linux
                elif 'mac' in device_os and software.install_command_macos:
                    install_command = software.install_command_macos
                
                if not install_command:
                    logger.warning(
                        f"No install command for {software.name} on {device_os}"
                    )
                    continue
                
                software_data.append({
                    "name": software.name,
                    "version": software.version,
                    "download_url": software.download_url,
                    "install_command": install_command,
                    "checksum": software.checksum,
                    "file_size": software.file_size
                })
            
            if not software_data:
                target.status = "failed"
                target.error_message = "No compatible software for device OS"
                target.completed_at = datetime.utcnow()
                self.db.commit()
                return False
            
            # Send installation command to agent
            logger.info(f"[DEPLOYMENT {deployment_id}] Preparing to emit install_software to agent_id: {device.agent_id}")
            logger.info(f"[DEPLOYMENT {deployment_id}] Software data: {len(software_data)} packages")
            logger.info(f"[DEPLOYMENT {deployment_id}] Packages: {[s['name'] for s in software_data]}")
            
            await sio.emit(
                'install_software',
                {
                    'deployment_id': deployment_id,
                    'device_id': device.id,
                    'software_list': software_data
                },
                room=device.agent_id
            )
            
            logger.info(
                f"[DEPLOYMENT {deployment_id}] [OK] Emitted install_software to device {device.device_name} "
                f"(agent_id: {device.agent_id}, {len(software_data)} packages)"
            )
            
            # Status will be updated by agent via Socket.IO events
            return True
            
        except Exception as e:
            logger.error(f"Error deploying to device {device.id}: {e}")
            target.status = "failed"
            target.error_message = str(e)
            target.completed_at = datetime.utcnow()
            self.db.commit()
            return False
    
    async def _deploy_custom_software(
        self,
        deployment_id: int,
        device,
        custom_software: str
    ) -> bool:
        """Deploy custom software command to a device"""
        from app.Deployments.models import DeploymentTarget
        
        try:
            target = self.db.query(DeploymentTarget).filter(
                DeploymentTarget.deployment_id == deployment_id,
                DeploymentTarget.device_id == device.id
            ).first()
            
            if not target:
                return False
            
            target.status = "in_progress"
            target.started_at = datetime.utcnow()
            self.db.commit()
            
            # Get Socket.IO instance
            try:
                from app.main import get_socketio_components
                sio, _ = get_socketio_components()
            except Exception as e:
                logger.error(f"Failed to get Socket.IO components: {e}")
                target.status = "failed"
                target.error_message = "Socket.IO not available"
                target.completed_at = datetime.utcnow()
                self.db.commit()
                return False
            
            # Send custom installation command
            await sio.emit(
                'install_custom_software',
                {
                    'deployment_id': deployment_id,
                    'device_id': device.id,
                    'command': custom_software
                },
                room=device.agent_id
            )
            
            logger.info(f"Sent custom software command to device {device.device_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error deploying custom software to device {device.id}: {e}")
            target.status = "failed"
            target.error_message = str(e)
            target.completed_at = datetime.utcnow()
            self.db.commit()
            return False
