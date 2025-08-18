import React from "react";
import Navbar from "./Navbar";

export default function Layout({ children, onLogout }) {
  return (
    <div className="app-container">
      <Navbar onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
