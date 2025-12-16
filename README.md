<div align="center">

# 🚀 DeployX

### Automated Deployment & Remote System Management Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)

**DeployX** is a full-stack deployment automation platform that enables centralized management of software installations, command execution, and system monitoring across multiple machines. Deploy, control, and monitor your entire infrastructure from a single dashboard.

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-project-structure) • [Contributors](#-contributors)

</div>

---

## 🌐 Overview

DeployX is designed to simplify and automate the deployment process across distributed systems. Whether managing a handful of machines or an entire fleet, DeployX provides real-time control, automated backup/rollback capabilities, and comprehensive monitoring—all from an intuitive web dashboard.

### 💡 Key Components

```mermaid
graph LR
    A[React Dashboard] -->|REST API| B[FastAPI Backend]
    B -->|Socket.IO| C[Agent 1]
    B -->|Socket.IO| D[Agent 2]
    B -->|Socket.IO| E[Agent N]
    B -->|PostgreSQL| F[Database]
```

- **Frontend**: React-based dashboard with real-time updates and intuitive UI
- **Backend**: FastAPI server with PostgreSQL database for orchestration and state management
- **Agent**: Lightweight Python client running on target machines with auto-update capabilities
- **Communication**: Real-time bidirectional communication via Socket.IO and REST APIs

---

## ✨ Features

### 🎯 Core Capabilities

#### **Deployment Management**
- 📦 **Software Deployment**: Automated installation across multiple machines
- 🔄 **Auto-Update**: Self-updating agent mechanism for seamless updates
- 📅 **Scheduled Deployments**: Schedule installations for specific times
- 🌍 **Multi-Environment Support**: Development, staging, and production environments
- 🔙 **Backup & Rollback**: Automatic backups before destructive operations

#### **Command Execution**
- 💻 **Remote Shell Access**: Execute terminal commands (CMD, PowerShell, Bash)
- 👥 **Group Operations**: Execute commands across device groups simultaneously
- ⚡ **Parallel & Sequential**: Support for both parallel and sequential batch execution
- 🎯 **Selective Targeting**: Run commands on specific machines or groups
- 📊 **Real-time Output**: Live command output streaming

#### **System Monitoring**
- 📈 **Resource Monitoring**: CPU, RAM, disk, and network usage
- 🔍 **Agent Discovery**: Automatic agent detection via Zeroconf/mDNS
- ❤️ **Health Checks**: Continuous heartbeat and status monitoring
- 📝 **Comprehensive Logging**: Detailed activity and error logs
- 🔔 **Real-time Notifications**: Instant updates on deployment status

#### **File Management**
- 📁 **File Transfer**: Upload/download files to/from remote machines
- 🗂️ **Directory Operations**: Remote file system navigation and management
- 📦 **Batch Operations**: Multiple file operations in one go

#### **Security & Authentication**
- 🔐 **JWT Authentication**: Secure token-based authentication
- 🌐 **Firebase Integration**: Support for Google OAuth and social logins
- 👤 **User Management**: Role-based access control
- 🔒 **Secure Communication**: Encrypted agent-server communication
- 📋 **Action Logging**: Complete audit trail of all operations

#### **Advanced Features**
- 🎛️ **Device Grouping**: Organize machines into logical groups
- 🔍 **Destructive Command Detection**: Automatic backup before dangerous operations
- 🏷️ **Software Inventory**: Track installed software across machines
- 📊 **Dashboard Analytics**: Visual insights into deployment status
- 🔄 **State Management**: Persistent tracking of deployment states

---

## 🏗️ Architecture

### Tech Stack

#### **Backend**
| Technology | Purpose |
|-----------|---------|
| FastAPI | Modern Python web framework for APIs |
| PostgreSQL | Relational database for persistent storage |
| SQLAlchemy | ORM for database interactions |
| Socket.IO | Real-time bidirectional communication |
| JWT | Secure authentication tokens |
| APScheduler | Task scheduling and cron jobs |
| Uvicorn | ASGI server for production deployment |

#### **Frontend**
| Technology | Purpose |
|-----------|---------|
| React 18 | Component-based UI framework |
| Vite | Fast build tool and dev server |
| Axios | HTTP client for API communication |
| Socket.IO Client | Real-time event handling |
| Xterm.js | Terminal emulation in browser |
| Tailwind CSS | Utility-first CSS framework |
| Framer Motion | Animation library |
| Firebase | Authentication and OAuth integration |

#### **Agent**
| Technology | Purpose |
|-----------|---------|
| Python 3.8+ | Core agent runtime |
| Socket.IO | Server communication |
| Zeroconf | Service discovery (mDNS) |
| psutil | System information gathering |
| aiohttp | Async HTTP client |

#### **DevOps & Deployment**
- **Hosting**: Render (Backend) + Vercel (Frontend)
- **Version Control**: Git
- **Build Tools**: PyInstaller (Agent executables)
- **CI/CD**: Automated deployment pipelines

---

## 🚀 Quick Start

### Prerequisites

- **Python**: 3.8 or higher
- **Node.js**: 16.x or higher
- **PostgreSQL**: 12 or higher
- **Git**: For cloning the repository

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/DeployX.git
cd DeployX
```

#### 2️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and settings

# Run database migrations (if applicable)
# python migrate.py

# Start the backend server
python start_server.py
```

**Backend Environment Variables** (`.env`):
```env
DATABASE_URL=postgresql://user:password@localhost/deployx
SECRET_KEY=your-secret-key-here
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET_KEY=your-jwt-secret
```

#### 3️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your backend URL

# Start development server
npm run dev
```

**Frontend Environment Variables** (`.env`):
```env
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
```

#### 4️⃣ Agent Setup

```bash
cd agent

# Install dependencies
pip install -r requirements.txt

# Configure agent settings (optional)
# Edit config.json for custom server URL

# Run the agent
python main.py --server http://localhost:8000
```

**Or use the standalone executable** (from `Exe/` directory):
```bash
# Windows
DeployX-Agent.exe

# Linux
./DeployX-Agent

# macOS
./DeployX-Agent
```

### 🎯 Quick Test

1. **Access Dashboard**: Navigate to `http://localhost:5173`
2. **Login**: Create an account or use OAuth
3. **Start Agent**: Run agent on target machine
4. **Verify Connection**: Check dashboard for connected agents
5. **Execute Command**: Test a simple command like `echo "Hello from DeployX!"`

---

## 📁 Project Structure

```
DeployX/
├── agent/                          # Python agent for target machines
│   ├── main.py                    # Agent entry point
│   ├── core/                      # Core agent functionality
│   │   ├── backup_manager.py     # Automatic backup system
│   │   ├── command_executor.py   # Command execution engine
│   │   ├── connection.py         # Server connection management
│   │   ├── destructive_detector.py # Dangerous command detection
│   │   └── shell_manager.py      # Shell session management
│   ├── handlers/                  # Event handlers
│   │   └── socket_handlers.py    # Socket.IO event handling
│   ├── installers/                # Software installation
│   │   ├── downloader.py         # File download utilities
│   │   └── installer.py          # Installation automation
│   ├── network/                   # Network utilities
│   │   ├── server_discoverer.py  # Server discovery (mDNS)
│   │   └── service_advertiser.py # Service advertisement
│   └── utils/                     # Helper utilities
│       └── machine_id.py         # Unique agent identification
│
├── backend/                        # FastAPI backend server
│   ├── app/
│   │   ├── main.py               # Application entry point
│   │   ├── agents/               # Agent management
│   │   │   ├── routes.py        # Agent API endpoints
│   │   │   ├── crud.py          # Database operations
│   │   │   └── schemas.py       # Pydantic models
│   │   ├── auth/                 # Authentication system
│   │   │   ├── routes.py        # Auth endpoints
│   │   │   ├── database.py      # User database
│   │   │   ├── utils.py         # JWT & password hashing
│   │   │   └── schemas.py       # Auth models
│   │   ├── Deployments/          # Deployment management
│   │   │   ├── routes.py        # Deployment endpoints
│   │   │   ├── executor.py      # Deployment execution
│   │   │   ├── models.py        # Database models
│   │   │   └── scheduler.py     # Scheduled deployments
│   │   ├── command_deployment/   # Command execution
│   │   │   ├── routes.py        # Command endpoints
│   │   │   ├── executor.py      # Command execution
│   │   │   ├── queue.py         # Command queue
│   │   │   └── strategies.py    # Execution strategies
│   │   ├── grouping/             # Device grouping
│   │   │   ├── route.py         # Group endpoints
│   │   │   ├── command_executor.py # Group command execution
│   │   │   ├── crud.py          # Group operations
│   │   │   └── models.py        # Group models
│   │   ├── files/                # File management
│   │   │   ├── routes.py        # File endpoints
│   │   │   └── crud.py          # File operations
│   │   ├── software/             # Software catalog
│   │   ├── Devices/              # Device management
│   │   └── dashboard/            # Dashboard data
│   └── start_server.py           # Server startup script
│
├── frontend/                       # React frontend
│   ├── src/
│   │   ├── App.jsx               # Main application component
│   │   ├── main.jsx              # Entry point
│   │   ├── components/           # Reusable components
│   │   ├── pages/                # Page components
│   │   │   ├── Home.jsx         # Landing page
│   │   │   ├── Dashboard.jsx    # Main dashboard
│   │   │   └── ...              # Other pages
│   │   ├── contexts/             # React contexts
│   │   ├── services/             # API services
│   │   │   └── auth.js          # Authentication service
│   │   └── utils/                # Helper functions
│   ├── public/                    # Static assets
│   ├── package.json              # Dependencies
│   └── vite.config.js            # Vite configuration
│
├── executable_agent_file/         # Agent executable builder
│   ├── agent_with_updater.py    # Agent with auto-update
│   ├── updater.py                # Update mechanism
│   ├── version.py                # Version tracking
│   ├── build_all.bat             # Windows build script
│   └── build_all.sh              # Linux/Mac build script
│
├── Exe/                           # Compiled agent executables
│   ├── windows/                  # Windows .exe
│   ├── linux/                    # Linux binaries
│   └── macos/                    # macOS binaries
│
├── LICENSE                        # MIT License
└── README.md                      # This file
```

---

## 📖 API Documentation

### REST API Endpoints

Once the backend is running, access the interactive API documentation:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key API Routes

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/google-login` - Google OAuth login
- `POST /api/auth/refresh` - Refresh JWT token

#### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/{agent_id}` - Get agent details
- `POST /api/agents/{agent_id}/command` - Execute command
- `DELETE /api/agents/{agent_id}` - Remove agent

#### Deployments
- `POST /api/deployments` - Create deployment
- `GET /api/deployments` - List deployments
- `GET /api/deployments/{deployment_id}` - Get deployment status
- `POST /api/deployments/{deployment_id}/rollback` - Rollback deployment

#### Groups
- `POST /api/groups` - Create device group
- `GET /api/groups` - List all groups
- `POST /api/groups/{group_id}/execute` - Execute command on group

---

## 🔧 Configuration

### Agent Configuration

Create `config/config.json` in agent directory:

```json
{
  "server_url": "http://your-server.com:8000",
  "auto_reconnect": true,
  "reconnect_interval": 5,
  "heartbeat_interval": 30,
  "enable_auto_update": true,
  "update_check_interval": 3600,
  "backup_enabled": true,
  "backup_retention_days": 7,
  "allowed_shells": ["cmd", "powershell", "bash"]
}
```

### Backend Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `SECRET_KEY` | Application secret key | - |
| `JWT_SECRET_KEY` | JWT signing key | - |
| `ENVIRONMENT` | Environment (dev/staging/prod) | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `MAX_COMMAND_TIMEOUT` | Max command execution time (seconds) | `300` |

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Agent Tests
```bash
cd agent
python test_backup_rollback.py
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 🚢 Deployment

### Production Deployment

#### Backend (Render)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy using `start_server.py`

#### Frontend (Vercel)
1. Import project from GitHub
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Set environment variables
4. Deploy

#### Agent Distribution
1. Build executables:
   ```bash
   cd executable_agent_file
   # Windows
   build_all.bat
   # Linux/Mac
   ./build_all.sh
   ```
2. Distribute executables from `Exe/` directory

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint rules for JavaScript/React
- Write tests for new features
- Update documentation for API changes

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributors

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Ai-Chetan">
        <img src="https://github.com/Ai-Chetan.png" width="100px;" alt="Chetan Chaudhari"/>
        <br />
        <sub><b>Chetan Chaudhari</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Nischay-loq">
        <img src="https://github.com/Nischay-loq.png" width="100px;" alt="Nischay Chavan"/>
        <br />
        <sub><b>Nischay Chavan</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/ParthShikhare19">
        <img src="https://github.com/ParthShikhare19.png" width="100px;" alt="Parth Shikhare"/>
        <br />
        <sub><b>Parth Shikhare</b></sub>
      </a>
    </td>
  </tr>
</table>

---

## 🙏 Acknowledgments

- FastAPI for the excellent web framework
- Socket.IO for real-time communication
- React team for the amazing UI library
- Open source community for various libraries used



<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by the DeployX Team

</div>