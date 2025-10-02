"""SQLAlchemy models for agent management."""
# Device model is now in grouping.models
from app.grouping.models import Device

# Re-export Device for backward compatibility
__all__ = ['Device']