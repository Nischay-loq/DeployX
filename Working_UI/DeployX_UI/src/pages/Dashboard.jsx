import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth.js';

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('shell');
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const sections = [
    { id: 'shell', name: 'Remote Shell', color: 'text-cyan-400' },
    { id: 'files', name: 'File System', color: 'text-blue-400' },
    { id: 'system', name: 'System Info', color: 'text-green-400' },
    { id: 'network', name: 'Network', color: 'text-purple-400' },
    { id: 'processes', name: 'Processes', color: 'text-yellow-400' },
    { id: 'services', name: 'Services', color: 'text-red-400' }
  ];

  const handleDisconnect = () => {
    if (onLogout) {
      onLogout();
    }
    navigate("/"); // Redirect to home page
  };

  return (
    <div className="min-h-screen bg-cyberBlue text-softWhite">
      {/* Header */}
      <header className="bg-black/80 backdrop-blur-sm border-b border-electricBlue/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-electricBlue to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-cyberBlue font-bold text-xl">DX</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-electricBlue">DeployX</h1>
              <p className="text-sm text-gray-400">
                {user?.username ? `Welcome, ${user.username}` : 'Remote System Management'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300">Connected</span>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 hover:bg-red-500/30 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-black/60 backdrop-blur-sm border-r border-electricBlue/30 p-4">
          <nav className="space-y-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                  activeSection === section.id
                    ? 'bg-electricBlue/20 border border-electricBlue/50 text-electricBlue'
                    : 'text-gray-400 hover:bg-cyberBlue/20 hover:text-softWhite'
                }`}
              >
                <span className={section.color}>●</span>
                <span className="font-medium">{section.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {activeSection === 'shell' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-cyan-400 text-2xl">●</span>
                <h2 className="text-xl font-bold">Interactive Remote Shell</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Live</span>
                </div>
              </div>
              
              <div className="bg-black/80 border border-cyan-400/30 rounded-lg p-4 h-96 overflow-auto">
                <div className="space-y-1 font-mono text-sm">
                  <div className="flex items-start gap-2 text-cyan-400">
                    <span className="text-gray-500 text-xs w-16">14:30:22</span>
                    <span>root@server-01:~# </span>
                    <span className="animate-pulse">|</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <span className="text-gray-500 text-xs w-16">14:30:22</span>
                    <span>Welcome to DeployX Remote Shell v2.1.0</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-300">
                    <span className="text-gray-500 text-xs w-16">14:30:22</span>
                    <span>Connected to: server-01.deployx.local</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter command..."
                  className="flex-1 px-4 py-2 bg-black/60 border border-cyan-400/30 rounded-lg text-softWhite focus:outline-none focus:border-cyan-400/60 cursor-text"
                />
                <button className="px-6 py-2 bg-cyan-500/20 border border-cyan-400/50 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-all cursor-pointer">
                  Execute
                </button>
              </div>
            </div>
          )}

          {activeSection === 'files' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-blue-400 text-2xl">●</span>
                <h2 className="text-xl font-bold">File System Explorer</h2>
              </div>
              
              <div className="bg-black/80 border border-blue-400/30 rounded-lg p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 py-1 hover:bg-cyberBlue/20 rounded px-2 cursor-pointer">
                    <span className="text-electricBlue">📁</span>
                    <span className="text-softWhite">home</span>
                    <span className="text-electricBlue text-xs">▼</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 hover:bg-cyberBlue/20 rounded px-2 cursor-pointer ml-5">
                    <span className="text-electricBlue">📁</span>
                    <span className="text-softWhite">user</span>
                    <span className="text-electricBlue text-xs">▶</span>
                  </div>
                  <div className="flex items-center gap-2 py-1 hover:bg-cyberBlue/20 rounded px-2 cursor-pointer ml-5">
                    <span className="text-electricBlue">📁</span>
                    <span className="text-softWhite">config</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-green-400 text-2xl">●</span>
                <h2 className="text-xl font-bold">System Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-black/80 border border-green-400/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">23.4%</div>
                  <div className="text-sm text-gray-400 mt-2">CPU Usage</div>
                  <div className="mt-3 bg-gray-700 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full transition-all duration-300" style={{ width: '23.4%' }}></div>
                  </div>
                </div>
                
                <div className="bg-black/80 border border-green-400/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">67.8%</div>
                  <div className="text-sm text-gray-400 mt-2">Memory Usage</div>
                  <div className="mt-3 bg-gray-700 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full transition-all duration-300" style={{ width: '67.8%' }}></div>
                  </div>
                </div>
                
                <div className="bg-black/80 border border-green-400/30 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">45.2%</div>
                  <div className="text-sm text-gray-400 mt-2">Disk Usage</div>
                  <div className="mt-3 bg-gray-700 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full transition-all duration-300" style={{ width: '45.2%' }}></div>
                  </div>
                </div>
                
                <div className="bg-black/80 border border-green-400/30 rounded-lg p-4">
                  <div className="text-sm text-gray-300 space-y-2">
                    <div><span className="text-gray-400">OS:</span> Ubuntu 22.04.3 LTS</div>
                    <div><span className="text-gray-400">Uptime:</span> 15 days</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'network' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-purple-400 text-2xl">●</span>
                <h2 className="text-xl font-bold">Network Overview</h2>
              </div>
              
              <div className="bg-black/80 border border-purple-400/30 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-purple-400/20">
                    <span className="font-medium">eth0</span>
                    <span className="text-sm text-gray-400">192.168.1.100</span>
                    <span className="text-green-400">● Up</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-purple-400/20">
                    <span className="font-medium">wlan0</span>
                    <span className="text-sm text-gray-400">10.0.0.15</span>
                    <span className="text-green-400">● Up</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'processes' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-yellow-400 text-2xl">●</span>
                <h2 className="text-xl font-bold">Process Manager</h2>
              </div>
              
              <div className="bg-black/80 border border-yellow-400/30 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-yellow-400/20">
                    <span className="font-medium">nginx</span>
                    <span className="text-sm text-gray-400">PID: 1234</span>
                    <span className="text-green-400">● Running</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-yellow-400/20">
                    <span className="font-medium">mysql</span>
                    <span className="text-sm text-gray-400">PID: 1235</span>
                    <span className="text-green-400">● Running</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'services' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-red-400 text-2xl">●</span>
                <h2 className="text-xl font-bold">Service Manager</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/80 border border-red-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-softWhite">nginx</h3>
                    <span className="text-green-400">● Active</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Web Server</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all cursor-pointer text-sm">
                      Stop
                    </button>
                    <button className="px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all cursor-pointer text-sm">
                      Restart
                    </button>
                  </div>
                </div>
                
                <div className="bg-black/80 border border-red-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-softWhite">mysql</h3>
                    <span className="text-green-400">● Active</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">Database Server</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-all cursor-pointer text-sm">
                      Stop
                    </button>
                    <button className="px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all cursor-pointer text-sm">
                      Restart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
