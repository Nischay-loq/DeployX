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
import FileSystemManager from '../components/FileSystemManager.jsx';
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
    { id: 'shell', name: 'Remote Shell', color: 'text-cyan-400', icon: TerminalIcon },
    { id: 'files', name: 'File System', color: 'text-blue-400', icon: FolderOpen },
    { id: 'groups', name: 'Device Groups', color: 'text-orange-400', icon: Monitor },
    { id: 'deployment', name: 'Command Execution', color: 'text-teal-400', icon: Command },
    { id: 'deployments', name: 'Software Deployments', color: 'text-purple-400', icon: Play },
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
            setCurrentAgent(firstAgent.agent_id);
            
            // Request shells for the first agent
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('get_shells', firstAgent.agent_id);
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

          {activeSection === 'files' && (
            <FileSystemManager />
          )}
          {activeSection === 'deployment' && (
            <>
              {console.log('Dashboard: Rendering DeploymentManager with agents:', agents, 'currentAgent:', currentAgent)}
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
            </>
          )}

          {activeSection === 'groups' && (
            <GroupsManager />
          )}

          {activeSection === 'deployments' && (
            <DeploymentsManager />
          )}
        </main>
      </div>
    </div>
  );
}
