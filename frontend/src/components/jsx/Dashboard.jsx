import React from "react";
import "../css/dashboard.css";
import Terminal from "./Terminal";
import { useParams } from "react-router-dom";

function Overview({ username }) {
  const params=useParams()
  return (
    <>
      <header className="header">
        <h1>Welcome, {params.username}</h1>
      </header>
      <section className="content">
        <div className="card">Content Block 1</div>
        <div className="card">Content Block 2</div>
        <div className="card">Content Block 3</div>
      </section>
    </>
  );
}

export default function Dashboard({ username }) {
  return (
    <div className="dashboard">
      <main className="main-content">
        <Overview username={username} />
      </main>
    </div>
  );
}
