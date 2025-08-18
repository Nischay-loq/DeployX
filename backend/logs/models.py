from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from auth.database import Base

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True)
    deployment_id = Column(Integer, ForeignKey("deployments.id", ondelete="CASCADE"))
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="CASCADE"))
    log_type = Column(String(10))
    message = Column(Text)
    timestamp = Column(DateTime)