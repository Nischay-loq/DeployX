import React, { useEffect, useState } from "react";
import { fetchGroups, deleteGroup } from "./GroupingApi.js";
import GroupForm from "./GroupFrom.jsx";
import GroupDeviceManager from "./GroupDeviceManager.jsx";

export default function GroupList() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const loadGroups = async () => {
    const res = await fetchGroups();
    setGroups(res.data);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDelete = async (id) => {
    await deleteGroup(id);
    loadGroups();
  };

  return (
    <div>
      <h2>Device Groups</h2>
      <GroupForm onGroupCreated={loadGroups} />
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {groups.map((g) => (
          <div key={g.id} style={{ background: g.color, padding: "1rem", borderRadius: "8px" }}>
            <h4>{g.group_name}</h4>
            <p>{g.description}</p>
            <p>{g.devices.length} devices</p>
            <button onClick={() => setSelectedGroup(g)}>Manage Devices</button>
            <button onClick={() => handleDelete(g.id)}>Delete</button>
          </div>
        ))}
      </div>

      {selectedGroup && (
        <GroupDeviceManager group={selectedGroup} onClose={() => setSelectedGroup(null)} />
      )}
    </div>
  );
}
