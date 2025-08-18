import React, { useState } from "react";
import { createGroup } from "./GroupingApi.js";

export default function GroupForm({ onGroupCreated }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#cccccc");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createGroup({ group_name: name, description: desc, color });
    setName("");
    setDesc("");
    setColor("#cccccc");
    onGroupCreated();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" required />
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      <button type="submit">Create Group</button>
    </form>
  );
}
