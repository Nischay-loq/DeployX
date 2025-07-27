# 🚀 DeployX – Remote Command & System Control Platform

**DeployX** is a MERN-stack based control panel that communicates with lightweight Python agents installed on remote machines. It enables you to execute system commands, monitor status, manage files, and control a fleet of computers in real-time—over LAN or the Internet.

---

## 🌐 Overview

DeployX consists of:
- **Frontend (React.js)** – Interactive dashboard for monitoring and control
- **Backend (Node.js + Express + MongoDB)** – Handles authentication, agent coordination, command queues, and logs
- **Agent (Python script)** – Runs on client systems (Windows/Linux/macOS), connects securely to backend, and executes received tasks

---

## 🔧 Features

### ✅ Core Agent Capabilities:
- Terminal command execution (`CMD`, `Bash`, `PowerShell`)
- File upload/download and directory operations
- Process and service control (start/kill/status)
- System monitoring (CPU, RAM, Disk, Network, etc.)
- Auto-update support
- Persistence (auto-start, heartbeat)
- Agent identity & authorization

### 📡 Real-Time Execution
- Commands sent from web dashboard execute instantly on selected machines
- Output (stdout/stderr) streamed back to frontend

### 🛡️ Secure Communication
- Agent authentication
- Task whitelisting / restrictions
- Action & access logging

---

### 👥 Contributors

- [**Chetan Chaudhari**](https://github.com/Ai-Chetan)
- [**Nischay Chavan**](https://github.com/Nischay-loq)
- [**Parth Shikhare**](https://github.com/ParthShikhare19)