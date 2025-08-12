# from fastapi import APIRouter, HTTPException
# from pydantic import BaseModel, Field
# from typing import List, Optional
# from routes import router
# from auth.database import Base, engine

# router = APIRouter()
# router.include_router(router)

# class Device(BaseModel):
#     id: int
#     device_name: str
#     ip_address: str
#     mac_address: str
#     os: str
#     status: str
#     group_name: Optional[str] = None

# class Group(BaseModel):
#     id: int
#     group_name: str
#     description: Optional[str] = ""
#     device_ids: List[int] = []

# class GroupCreate(BaseModel):
#     group_name: str = Field(..., min_length=1)
#     description: Optional[str] = ""
#     device_ids: List[int] = []

# devices = [
#     Device(id=1, device_name="Laptop-01", ip_address="192.168.1.2", mac_address="AA:BB:CC:DD:EE:01", os="Windows 10", status="Online", group_name="Admins"),
#     Device(id=2, device_name="Phone-01", ip_address="192.168.1.3", mac_address="AA:BB:CC:DD:EE:02", os="Android", status="Offline", group_name=None),
#     Device(id=3, device_name="Server-01", ip_address="192.168.1.4", mac_address="AA:BB:CC:DD:EE:03", os="Linux", status="Online", group_name="Admins"),
#     Device(id=4, device_name="Tablet-01", ip_address="192.168.1.5", mac_address="AA:BB:CC:DD:EE:04", os="iOS", status="Online", group_name=None),
# ]

# groups = [
#     Group(id=1, group_name="Admins", description="Admin devices", device_ids=[1,3])
# ]

# @router.get("/devices", response_model=List[Device])
# async def get_devices():
#     return devices

# @router.get("/groups", response_model=List[dict])
# async def get_groups():
#     return [
#         {
#             "id": g.id,
#             "group_name": g.group_name,
#             "description": g.description,
#             "device_ids": g.device_ids,
#             "device_count": len(g.device_ids)
#         } for g in groups
#     ]

# @router.post("/groups", response_model=Group, status_code=201)
# async def create_group(new_group: GroupCreate):
#     if any(g.group_name.lower() == new_group.group_name.lower() for g in groups):
#         raise HTTPException(status_code=400, detail="Group name already exists")

#     new_id = max([g.id for g in groups], default=0) + 1
#     group = Group(id=new_id, group_name=new_group.group_name, description=new_group.description, device_ids=new_group.device_ids)

#     for i, device in enumerate(devices):
#         if device.id in group.device_ids:
#             devices[i] = device.copy(update={"group_name": group.group_name})

#     groups.append(group)
#     return group
