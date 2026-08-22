"""Connection manager tracking connected agents and frontends."""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Set

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.agents: Dict[str, dict] = {}
        self.frontends: Set[str] = set()
        self.agent_frontend_mapping: Dict[str, str] = {}
        self.sid_to_agent: Dict[str, str] = {}
        self.sid_to_type: Dict[str, str] = {}

    def add_agent(self, agent_id: str, sid: str, shells: List[str]):
        """Add a new agent connection"""
        self.agents[agent_id] = {
            'sid': sid,
            'shells': shells,
            'connected_at': datetime.now()
        }
        self.sid_to_agent[sid] = agent_id
        self.sid_to_type[sid] = 'agent'
        logger.info(f"Agent {agent_id} connected (sid: {sid}) with shells: {shells}")

    def add_frontend(self, sid: str):
        """Add a frontend connection"""
        self.frontends.add(sid)
        self.sid_to_type[sid] = 'frontend'
        logger.info(f"Frontend connected (sid: {sid})")

    def remove_connection(self, sid: str):
        """Remove a connection by session ID"""
        connection_type = self.sid_to_type.pop(sid, None)

        if connection_type == 'agent':
            agent_id = self.sid_to_agent.pop(sid, None)
            if agent_id:
                self.agents.pop(agent_id, None)
                self.agent_frontend_mapping.pop(agent_id, None)
                logger.info(f"Agent {agent_id} disconnected (sid: {sid})")
                return 'agent', agent_id

        elif connection_type == 'frontend':
            self.frontends.discard(sid)
            to_remove = [agent_id for agent_id, frontend_sid in self.agent_frontend_mapping.items() if frontend_sid == sid]
            for agent_id in to_remove:
                del self.agent_frontend_mapping[agent_id]
            logger.info(f"Frontend disconnected (sid: {sid})")
            return 'frontend', None

        return None, None

    def get_agent_list(self) -> List[str]:
        """Get list of connected agent IDs"""
        return list(self.agents.keys())

    def get_agent_shells(self, agent_id: str) -> List[str]:
        """Get available shells for an agent"""
        agent_data = self.agents.get(agent_id, {})
        return agent_data.get('shells', [])

    def get_agent_sid(self, agent_id: str) -> str:
        """Get socket ID for an agent"""
        return self.agents.get(agent_id, {}).get('sid')

    def is_agent_connected(self, agent_id: str) -> bool:
        """Check if agent is truly connected and responsive"""
        agent_data = self.agents.get(agent_id)
        if not agent_data:
            return False

        # Check if connection is recent (within last 30 seconds)
        last_seen = agent_data.get('last_heartbeat', agent_data.get('connected_at'))
        if last_seen and isinstance(last_seen, datetime):
            time_diff = datetime.now() - last_seen
            return time_diff.total_seconds() < 30

        return True  # Default to true if no timestamp available

    def get_agent_by_sid(self, sid: str) -> str:
        """Get agent ID by session ID"""
        return self.sid_to_agent.get(sid)

    def map_agent_to_frontend(self, agent_id: str, frontend_sid: str):
        """Map an agent to a frontend for communication"""
        self.agent_frontend_mapping[agent_id] = frontend_sid
        logger.info(f"Mapped agent {agent_id} to frontend {frontend_sid}")

    def get_frontend_for_agent(self, agent_id: str) -> str:
        """Get the frontend SID mapped to an agent"""
        return self.agent_frontend_mapping.get(agent_id)


conn_manager = ConnectionManager()
