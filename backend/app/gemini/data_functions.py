"""
Data Fetching Functions for Gemini AI

These functions allow Gemini to access real user data from the database.
All functions respect user permissions and only return data belonging to the requesting user.
"""

from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.auth.database import get_db
    from app.agents.models import Agent
    from app.Deployments.models import Deployment, DeploymentDevice
    from app.history.models import History
except:
    # Fallback for different import structure
    def get_db():
        """Placeholder for database session"""
        return None


def get_user_agents(user_id: str, status: Optional[str] = None) -> Dict:
    """
    Get user's agents/devices with statistics
    
    Args:
        user_id: User identifier
        status: Filter by status ('online', 'offline', None for all)
    
    Returns:
        Dictionary with agents data and statistics
    """
    try:
        db = next(get_db())
        
        # Query agents
        query = db.query(Agent).filter(Agent.user_id == user_id)
        
        if status:
            is_online = status.lower() == 'online'
            query = query.filter(Agent.is_connected == is_online)
        
        agents = query.order_by(Agent.hostname).all()
        
        # Calculate statistics
        total = len(agents)
        online = sum(1 for a in agents if a.is_connected)
        offline = total - online
        
        # Format agent data
        agent_list = []
        for agent in agents:
            agent_list.append({
                "id": agent.agent_id,
                "hostname": agent.hostname,
                "status": "online" if agent.is_connected else "offline",
                "ip_address": getattr(agent, 'ip_address', 'N/A'),
                "os": getattr(agent, 'os', 'Unknown'),
                "last_seen": agent.last_seen.isoformat() if hasattr(agent, 'last_seen') and agent.last_seen else None,
                "cpu_usage": getattr(agent, 'cpu_usage', 0),
                "memory_usage": getattr(agent, 'memory_usage', 0),
                "disk_usage": getattr(agent, 'disk_usage', 0)
            })
        
        return {
            "success": True,
            "statistics": {
                "total": total,
                "online": online,
                "offline": offline,
                "online_percentage": round((online / total * 100) if total > 0 else 0, 1)
            },
            "agents": agent_list,
            "chart_data": {
                "type": "pie",
                "labels": ["Online", "Offline"],
                "values": [online, offline],
                "colors": ["#10B981", "#EF4444"]
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch agents: {str(e)}",
            "statistics": {"total": 0, "online": 0, "offline": 0},
            "agents": []
        }


def get_user_deployments(user_id: str, limit: int = 10, status: Optional[str] = None) -> Dict:
    """
    Get user's deployment history with statistics
    
    Args:
        user_id: User identifier
        limit: Number of deployments to return (default 10)
        status: Filter by status ('success', 'failed', 'pending', 'in_progress')
    
    Returns:
        Dictionary with deployment data and statistics
    """
    try:
        db = next(get_db())
        
        # Query deployments
        query = db.query(Deployment).filter(Deployment.user_id == user_id)
        
        if status:
            query = query.filter(Deployment.status == status)
        
        # Get total count
        total_count = query.count()
        
        # Get limited results
        deployments = query.order_by(desc(Deployment.created_at)).limit(limit).all()
        
        # Calculate statistics for all deployments (not just limited)
        all_deployments = db.query(Deployment).filter(Deployment.user_id == user_id).all()
        
        total = len(all_deployments)
        successful = sum(1 for d in all_deployments if d.status == 'success')
        failed = sum(1 for d in all_deployments if d.status == 'failed')
        in_progress = sum(1 for d in all_deployments if d.status == 'in_progress')
        pending = sum(1 for d in all_deployments if d.status == 'pending')
        
        # Format deployment data
        deployment_list = []
        for dep in deployments:
            deployment_list.append({
                "id": dep.id,
                "name": dep.deployment_name,
                "status": dep.status,
                "created_at": dep.created_at.isoformat(),
                "completed_at": dep.completed_at.isoformat() if hasattr(dep, 'completed_at') and dep.completed_at else None,
                "duration_seconds": getattr(dep, 'duration_seconds', None),
                "error_message": getattr(dep, 'error_message', None)
            })
        
        return {
            "success": True,
            "statistics": {
                "total": total,
                "successful": successful,
                "failed": failed,
                "in_progress": in_progress,
                "pending": pending,
                "success_rate": round((successful / total * 100) if total > 0 else 0, 1)
            },
            "deployments": deployment_list,
            "showing": len(deployment_list),
            "total_available": total_count,
            "chart_data": {
                "type": "pie",
                "labels": ["Success", "Failed", "In Progress", "Pending"],
                "values": [successful, failed, in_progress, pending],
                "colors": ["#10B981", "#EF4444", "#3B82F6", "#F59E0B"]
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch deployments: {str(e)}",
            "statistics": {"total": 0, "successful": 0, "failed": 0},
            "deployments": []
        }


def get_deployment_trends(user_id: str, days: int = 7) -> Dict:
    """
    Get deployment trends over time
    
    Args:
        user_id: User identifier
        days: Number of days to analyze (default 7)
    
    Returns:
        Dictionary with trend data for charts
    """
    try:
        db = next(get_db())
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        deployments = db.query(Deployment).filter(
            Deployment.user_id == user_id,
            Deployment.created_at >= cutoff_date
        ).order_by(Deployment.created_at).all()
        
        # Group by date
        date_groups = {}
        for dep in deployments:
            date_key = dep.created_at.date().isoformat()
            if date_key not in date_groups:
                date_groups[date_key] = {"success": 0, "failed": 0, "total": 0}
            
            date_groups[date_key]["total"] += 1
            if dep.status == "success":
                date_groups[date_key]["success"] += 1
            elif dep.status == "failed":
                date_groups[date_key]["failed"] += 1
        
        # Sort by date
        sorted_dates = sorted(date_groups.keys())
        
        return {
            "success": True,
            "period_days": days,
            "chart_data": {
                "type": "line",
                "labels": sorted_dates,
                "datasets": [
                    {
                        "label": "Successful",
                        "data": [date_groups[d]["success"] for d in sorted_dates],
                        "color": "#10B981"
                    },
                    {
                        "label": "Failed",
                        "data": [date_groups[d]["failed"] for d in sorted_dates],
                        "color": "#EF4444"
                    }
                ]
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch deployment trends: {str(e)}"
        }


def get_user_statistics(user_id: str) -> Dict:
    """
    Get comprehensive user account statistics
    
    Args:
        user_id: User identifier
    
    Returns:
        Dictionary with all user statistics and chart data
    """
    try:
        db = next(get_db())
        
        # Agent statistics
        agents = db.query(Agent).filter(Agent.user_id == user_id).all()
        total_agents = len(agents)
        online_agents = sum(1 for a in agents if a.is_connected)
        
        # Deployment statistics
        deployments = db.query(Deployment).filter(Deployment.user_id == user_id).all()
        total_deployments = len(deployments)
        successful_deployments = sum(1 for d in deployments if d.status == "success")
        failed_deployments = sum(1 for d in deployments if d.status == "failed")
        
        # Recent activity (last 7 days)
        week_ago = datetime.now() - timedelta(days=7)
        recent_deployments = sum(1 for d in deployments if d.created_at >= week_ago)
        
        return {
            "success": True,
            "statistics": {
                "agents": {
                    "total": total_agents,
                    "online": online_agents,
                    "offline": total_agents - online_agents,
                    "online_percentage": round((online_agents / total_agents * 100) if total_agents > 0 else 0, 1)
                },
                "deployments": {
                    "total": total_deployments,
                    "successful": successful_deployments,
                    "failed": failed_deployments,
                    "success_rate": round((successful_deployments / total_deployments * 100) if total_deployments > 0 else 0, 1)
                },
                "activity": {
                    "deployments_last_7_days": recent_deployments
                }
            },
            "charts": [
                {
                    "title": "Agent Status",
                    "type": "pie",
                    "data": {
                        "labels": ["Online", "Offline"],
                        "values": [online_agents, total_agents - online_agents],
                        "colors": ["#10B981", "#EF4444"]
                    }
                },
                {
                    "title": "Deployment Success Rate",
                    "type": "pie",
                    "data": {
                        "labels": ["Success", "Failed"],
                        "values": [successful_deployments, failed_deployments],
                        "colors": ["#10B981", "#EF4444"]
                    }
                }
            ]
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch statistics: {str(e)}"
        }


def get_recent_activity(user_id: str, hours: int = 24) -> Dict:
    """
    Get recent user activity
    
    Args:
        user_id: User identifier
        hours: Number of hours to look back (default 24)
    
    Returns:
        Dictionary with recent activities
    """
    try:
        db = next(get_db())
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        # Get recent deployments
        deployments = db.query(Deployment).filter(
            Deployment.user_id == user_id,
            Deployment.created_at >= cutoff_time
        ).order_by(desc(Deployment.created_at)).all()
        
        activities = []
        for dep in deployments:
            activities.append({
                "type": "deployment",
                "action": f"Deployment: {dep.deployment_name}",
                "status": dep.status,
                "timestamp": dep.created_at.isoformat(),
                "details": {
                    "name": dep.deployment_name,
                    "status": dep.status
                }
            })
        
        # Sort by timestamp
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "success": True,
            "period_hours": hours,
            "activity_count": len(activities),
            "activities": activities[:20]  # Limit to 20
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to fetch recent activity: {str(e)}"
        }


# Function registry - maps function names to actual functions
AVAILABLE_FUNCTIONS = {
    "get_user_agents": get_user_agents,
    "get_user_deployments": get_user_deployments,
    "get_deployment_trends": get_deployment_trends,
    "get_user_statistics": get_user_statistics,
    "get_recent_activity": get_recent_activity
}


# Function descriptions for Gemini
FUNCTION_DESCRIPTIONS = {
    "get_user_agents": {
        "description": "Get user's agents/devices with status, metrics, and statistics. Returns chart data for visualization.",
        "parameters": {
            "status": "Optional filter: 'online', 'offline', or None for all"
        },
        "returns": "Statistics (total, online, offline) + list of agents + pie chart data",
        "example": "get_user_agents(status='online')"
    },
    "get_user_deployments": {
        "description": "Get user's deployment history with success/failure statistics. Returns chart data for visualization.",
        "parameters": {
            "limit": "Number of deployments to return (default 10)",
            "status": "Optional filter: 'success', 'failed', 'pending', 'in_progress'"
        },
        "returns": "Statistics (total, successful, failed, success rate) + deployment list + pie chart data",
        "example": "get_user_deployments(limit=5, status='failed')"
    },
    "get_deployment_trends": {
        "description": "Get deployment trends over time. Returns line chart data showing success/failure trends.",
        "parameters": {
            "days": "Number of days to analyze (default 7)"
        },
        "returns": "Time-series data for line chart (successful vs failed deployments per day)",
        "example": "get_deployment_trends(days=7)"
    },
    "get_user_statistics": {
        "description": "Get comprehensive account statistics with multiple charts. Perfect for dashboard overview.",
        "parameters": {},
        "returns": "Complete statistics + multiple chart data (agents, deployments, success rates)",
        "example": "get_user_statistics()"
    },
    "get_recent_activity": {
        "description": "Get recent user activity timeline",
        "parameters": {
            "hours": "Number of hours to look back (default 24)"
        },
        "returns": "List of recent activities with timestamps",
        "example": "get_recent_activity(hours=48)"
    }
}


def execute_function(function_name: str, user_id: str, **kwargs) -> Any:
    """
    Execute a data function by name
    
    Args:
        function_name: Name of the function to execute
        user_id: User identifier for security
        **kwargs: Additional function-specific arguments
    
    Returns:
        Function result or error message
    """
    if function_name not in AVAILABLE_FUNCTIONS:
        return {
            "success": False,
            "error": f"Function '{function_name}' not found",
            "available_functions": list(AVAILABLE_FUNCTIONS.keys())
        }
    
    try:
        func = AVAILABLE_FUNCTIONS[function_name]
        result = func(user_id=user_id, **kwargs)
        return result
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing {function_name}: {str(e)}"
        }
