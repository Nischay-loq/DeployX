import { useState, useEffect, useRef } from 'react';
import authService from '../services/auth.js';
import Terminal from '../components/Terminal.jsx';
import DeploymentManager from '../components/DeploymentManager.jsx';
import io from 'socket.io-client';
import { 
  Terminal as TerminalIcon, 
  FolderOpen, 
  Monitor, 
  Network, 
  Activity, 
  Settings,
  LogOut,
  Bell,
  Search,
  MoreHorizontal,
  Play,
  Square,
  RotateCcw,
  Command
} from 'lucide-react';
import GroupsManager from '../components/GroupsManager.jsx';
import DeploymentsManager from '../components/DeploymentsManager.jsx';
import APITest from '../components/APITest.jsx';

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('shell');
  const [agents, setAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState('');
  const [shells, setShells] = useState([]);
  const [currentShell, setCurrentShell] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const user = authService.getCurrentUser();

  const sections = [
<<<<<<< HEAD
    { id: 'shell', name: 'Remote Shell', icon: TerminalIcon, color: 'text-cyan-400' },
    { id: 'deployment', name: 'Deployment', icon: Command, color: 'text-purple-400' },
    { id: 'files', name: 'File System', icon: FolderOpen, color: 'text-blue-400' },
    { id: 'system', name: 'System Info', icon: Monitor, color: 'text-green-400' },
    { id: 'network', name: 'Network', icon: Network, color: 'text-purple-400' },
    { id: 'processes', name: 'Processes', icon: Activity, color: 'text-yellow-400' },
    { id: 'services', name: 'Services', icon: Settings, color: 'text-red-400' }
=======
    { id: 'shell', name: 'Remote Shell', color: 'text-cyan-400' },
    { id: 'files', name: 'File System', color: 'text-blue-400' },
    { id: 'groups', name: 'Device Groups', color: 'text-orange-400' },
    { id: 'deployments', name: 'Deployments', color: 'text-purple-400' },
    { id: 'system', name: 'System Info', color: 'text-green-400' },
    { id: 'network', name: 'Network', color: 'text-indigo-400' },
    { id: 'processes', name: 'Processes', color: 'text-yellow-400' },
    { id: 'services', name: 'Services', color: 'text-red-400' },
    { id: 'api-test', name: 'API Test', color: 'text-pink-400' }
>>>>>>> parth
  ];

  // Initialize socket connection for agent management
  useEffect(() => {
    isMountedRef.current = true;
    
    const initializeSocket = () => {
      if (socketRef.current) return;
      
      console.log('Dashboard: Initializing socket connection...');
      
      socketRef.current = io('http://localhost:8000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true,
        autoConnect: true
      });

      // Connection successful
      socketRef.current.on('connect', () => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Connected to backend server');
        setIsConnected(true);
        setConnectionError(null);
        
        // Register as frontend to receive agent updates
        socketRef.current.emit('frontend_register', {});
        
        // Request initial agents list
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            console.log('Dashboard: Requesting agents list...');
            socketRef.current.emit('get_agents');
          }
        }, 200);
      });

      // Connection failed
      socketRef.current.on('connect_error', (error) => {
        if (!isMountedRef.current) return;
        
        console.error('Dashboard: Connection error:', error);
        setIsConnected(false);
        setConnectionError(`Failed to connect: ${error.message}`);
      });

      // Disconnected
      socketRef.current.on('disconnect', (reason) => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Disconnected from backend:', reason);
        setIsConnected(false);
        setConnectionError(`Disconnected: ${reason}`);
        
        // Clear agent/shell data
        setAgents([]);
        setShells([]);
        setCurrentAgent('');
        setCurrentShell('');
      });

      // Agents list received
      socketRef.current.on('agents_list', (agentsList) => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Received agents list:', agentsList);
        
        if (Array.isArray(agentsList)) {
          setAgents(agentsList);
          
          // Auto-select first agent if none selected and agents available
          if (agentsList.length > 0 && !currentAgent) {
            const firstAgent = agentsList[0];
            setCurrentAgent(firstAgent);
            
            // Request shells for the first agent
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('get_shells', firstAgent);
            }
          }
        } else {
          console.error('Dashboard: Invalid agents list received:', agentsList);
          setConnectionError('Invalid agents list received from server');
        }
      });

      // Shells list received
      socketRef.current.on('shells_list', (shellsList) => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Received shells list:', shellsList);
        
        if (Array.isArray(shellsList)) {
          setShells(shellsList);
          
          // Auto-select default shell if none selected
          if (shellsList.length > 0 && !currentShell) {
            const defaultShell = shellsList.includes('cmd') ? 'cmd' : 
                               shellsList.includes('bash') ? 'bash' : shellsList[0];
            setCurrentShell(defaultShell);
          }
        }
      });

      // Error messages
      socketRef.current.on('error', (data) => {
        if (!isMountedRef.current) return;
        
        console.error('Dashboard: Socket error:', data);
        const errorMessage = data?.message || data || 'Unknown error';
        setConnectionError(errorMessage);
      });
    };

    initializeSocket();

    return () => {
      isMountedRef.current = false;
      
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Handle agent selection
  const handleAgentSelect = (agentId) => {
    setCurrentAgent(agentId);
    setShells([]);
    setCurrentShell('');
    
    if (agentId && socketRef.current && socketRef.current.connected) {
      console.log('Dashboard: Requesting shells for agent:', agentId);
      socketRef.current.emit('get_shells', agentId);
    }
  };

  // Handle shell selection
  const handleShellSelect = (shellType) => {
    setCurrentShell(shellType);
  };

  const handleDisconnect = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl font-display">DX</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white">DeployX Dashboard</h1>
              <p className="text-sm text-gray-400">
                {user?.username ? `Welcome back, ${user.username}` : 'Remote System Management Console'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              />
            </div>
            
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
              <Bell className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </button>
            
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              isConnected 
                ? 'bg-green-500/20 border-green-500/30' 
                : 'bg-red-500/20 border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <span className={`text-sm font-medium ${
                isConnected ? 'text-green-400' : 'text-red-400'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {agents.length > 0 && (
                <span className="text-gray-400 text-xs">• {agents.length} agent(s)</span>
              )}
            </div>
            
            {/* Logout */}
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800/30 backdrop-blur-sm border-r border-gray-700 p-4">
          <nav className="space-y-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  activeSection === section.id
                    ? 'bg-primary-500/20 border border-primary-500/30 text-primary-400 shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                <section.icon className={`w-5 h-5 ${section.color}`} />
                <span>{section.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto bg-gray-900/50">
          {activeSection === 'shell' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <TerminalIcon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Interactive Remote Shell</h2>
                    <p className="text-gray-400">Execute commands on remote systems in real-time</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Live</span>
                </div>
              </div>
              
              <div className="card-dark">
                <Terminal />
              </div>
            </div>
          )}

          {activeSection === 'deployment' && (
            <DeploymentManager 
              agents={agents}
              currentAgent={currentAgent}
              onSelectAgent={handleAgentSelect}
              shells={shells}
              currentShell={currentShell}
              onSelectShell={handleShellSelect}
              isConnected={isConnected}
              connectionError={connectionError}
            />
          )}

          {activeSection === 'files' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FolderOpen className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">File System Explorer</h2>
                  <p className="text-gray-400">Browse and manage remote file systems</p>
                </div>
              </div>
              
              <div className="card-dark">
                <div className="space-y-3">
                  {[
                    { name: 'home', type: 'folder', expanded: true },
                    { name: 'user', type: 'folder', expanded: false, indent: 1 },
                    { name: 'config', type: 'folder', expanded: false, indent: 1 },
                    { name: 'documents', type: 'folder', expanded: false, indent: 1 },
                    { name: 'downloads', type: 'folder', expanded: false, indent: 1 },
                  ].map((item, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-3 py-2 px-3 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-all ${
                        item.indent ? 'ml-6' : ''
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-200 font-medium">{item.name}</span>
                      <span className="text-gray-500 text-xs ml-auto">
                        {item.expanded ? '▼' : '▶'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'groups' && (
            <GroupsManager />
          )}

          {activeSection === 'deployments' && (
            <DeploymentsManager />
          )}

          {activeSection === 'system' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Monitor className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">System Information</h2>
                  <p className="text-gray-400">Monitor system resources and performance</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'CPU Usage', value: '23.4%', color: 'green' },
                  { label: 'Memory Usage', value: '67.8%', color: 'blue' },
                  { label: 'Disk Usage', value: '45.2%', color: 'yellow' },
                  { label: 'Network I/O', value: '12.3 MB/s', color: 'purple' }
                ].map((metric, index) => (
                  <div key={index} className="card-dark">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-gray-400 text-sm font-medium">{metric.label}</span>
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">{metric.value}</div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          metric.color === 'green' ? 'bg-green-400' :
                          metric.color === 'blue' ? 'bg-blue-400' :
                          metric.color === 'yellow' ? 'bg-yellow-400' : 'bg-purple-400'
                        }`} 
                        style={{ width: metric.value && metric.value.includes('%') ? metric.value : '60%' }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card-dark">
                <h3 className="text-lg font-semibold text-white mb-4">System Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-400">OS:</span> <span className="text-white">Ubuntu 22.04.3 LTS</span></div>
                  <div><span className="text-gray-400">Kernel:</span> <span className="text-white">5.15.0-91-generic</span></div>
                  <div><span className="text-gray-400">Uptime:</span> <span className="text-white">15 days, 4 hours</span></div>
                  <div><span className="text-gray-400">Architecture:</span> <span className="text-white">x86_64</span></div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Settings className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Service Manager</h2>
                  <p className="text-gray-400">Control and monitor system services</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { name: 'nginx', description: 'Web Server', status: 'active', pid: '1234' },
                  { name: 'mysql', description: 'Database Server', status: 'active', pid: '1235' },
                  { name: 'redis', description: 'Cache Server', status: 'inactive', pid: null },
                  { name: 'docker', description: 'Container Runtime', status: 'active', pid: '1236' },
                ].map((service, index) => (
                  <div key={index} className="card-dark">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-white text-lg">{service.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          service.status === 'active' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      <MoreHorizontal className="w-4 h-4 text-gray-500" />
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-4">{service.description}</p>
                    
                    {service.pid && (
                      <p className="text-gray-500 text-xs mb-4">PID: {service.pid}</p>
                    )}
                    
                    <div className="flex gap-2">
                      <button className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm">
                        <Square className="w-3 h-3" />
                        Stop
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-all text-sm">
                        <RotateCcw className="w-3 h-3" />
                        Restart
                      </button>
                      {service.status === 'inactive' && (
                        <button className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/30 transition-all text-sm">
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other sections would follow similar patterns */}
          {activeSection === 'network' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Network className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Network Overview</h2>
                  <p className="text-gray-400">Monitor network interfaces and connections</p>
                </div>
              </div>
              
              <div className="card-dark">
                <h3 className="text-lg font-semibold text-white mb-4">Network Interfaces</h3>
                <div className="space-y-4">
                  {[
                    { name: 'eth0', ip: '192.168.1.100', status: 'up', speed: '1 Gbps' },
                    { name: 'wlan0', ip: '10.0.0.15', status: 'up', speed: '150 Mbps' },
                    { name: 'lo', ip: '127.0.0.1', status: 'up', speed: 'Virtual' },
                  ].map((networkInterface, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="font-medium text-white">{networkInterface.name}</div>
                        <div className="text-sm text-gray-400">{networkInterface.ip}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-400">{networkInterface.speed}</div>
                        <span className="status-online">{networkInterface.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'processes' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Process Manager</h2>
                  <p className="text-gray-400">Monitor and manage running processes</p>
                </div>
              </div>
              
              <div className="card-dark">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 text-gray-400">PID</th>
                        <th className="text-left py-3 text-gray-400">Name</th>
                        <th className="text-left py-3 text-gray-400">CPU %</th>
                        <th className="text-left py-3 text-gray-400">Memory</th>
                        <th className="text-left py-3 text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { pid: '1234', name: 'nginx', cpu: '2.1', memory: '45 MB', status: 'running' },
                        { pid: '1235', name: 'mysql', cpu: '5.8', memory: '128 MB', status: 'running' },
                        { pid: '1236', name: 'node', cpu: '12.3', memory: '89 MB', status: 'running' },
                        { pid: '1237', name: 'python3', cpu: '0.8', memory: '34 MB', status: 'sleeping' },
                      ].map((process, index) => (
                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/30">
                          <td className="py-3 text-gray-300">{process.pid}</td>
                          <td className="py-3 text-white font-medium">{process.name}</td>
                          <td className="py-3 text-gray-300">{process.cpu}%</td>
                          <td className="py-3 text-gray-300">{process.memory}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              process.status === 'running' 
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {process.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'api-test' && (
            <APITest />
          )}
        </main>
      </div>
    </div>
  );
}
