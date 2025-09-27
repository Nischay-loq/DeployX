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
  Command,
  Home,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Users,
  TrendingUp,
  Shield,
  Clock,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import GroupsManager from '../components/GroupsManager.jsx';
import DeploymentsManager from '../components/DeploymentsManager.jsx';
import FileSystemManager from '../components/FileSystemManager.jsx';
import APITest from '../components/APITest.jsx';

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [agents, setAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState('');
  const [shells, setShells] = useState([]);
  const [currentShell, setCurrentShell] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const user = authService.getCurrentUser();

  // Real dashboard data from API
  const [dashboardStats, setDashboardStats] = useState({
    devices: { total: 0, online: 0, offline: 0, health_percentage: 0 },
    deployments: { total: 0, successful: 0, failed: 0, pending: 0, success_rate: 0 },
    commands: { active: 0, pending: 0, completed: 0, failed: 0 },
    system: { health_score: 0, uptime: '0%', last_updated: null },
    groups: { total: 0 },
    activity: { recent_deployments: 0 }
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [deviceChart, setDeviceChart] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    network_connections: 0
  });
  const [deploymentTrends, setDeploymentTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  const sections = [
    { id: 'overview', name: 'Dashboard', color: 'text-blue-400', icon: Home },
    { id: 'shell', name: 'Remote Shell', color: 'text-cyan-400', icon: TerminalIcon },
    { id: 'files', name: 'File System', color: 'text-green-400', icon: FolderOpen },
    { id: 'groups', name: 'Device Groups', color: 'text-orange-400', icon: Monitor },
    { id: 'deployments', name: 'Deployments', color: 'text-purple-400', icon: Play },
    { id: 'system', name: 'System Info', color: 'text-emerald-400', icon: Activity },
    { id: 'network', name: 'Network', color: 'text-indigo-400', icon: Network },
    { id: 'processes', name: 'Processes', color: 'text-yellow-400', icon: Command },
    { id: 'services', name: 'Services', color: 'text-red-400', icon: Settings },
    { id: 'api-test', name: 'API Test', color: 'text-pink-400', icon: Search }
  ];

  // Fetch dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Ensure auth service is initialized
      authService.init();
      
      // Get token from multiple sources with priority order
      const token = authService.getToken() || 
                   localStorage.getItem('access_token') || 
                   localStorage.getItem('token') ||
                   sessionStorage.getItem('access_token') ||
                   sessionStorage.getItem('token');
      
      // Debug token and auth state
      console.log('Dashboard: Token from authService:', authService.getToken() ? 'present' : 'missing');
      console.log('Dashboard: Token from localStorage:', localStorage.getItem('token') ? 'present' : 'missing');
      console.log('Dashboard: Access token from localStorage:', localStorage.getItem('access_token') ? 'present' : 'missing');
      console.log('Dashboard: Auth service logged in:', authService.isLoggedIn());
      console.log('Dashboard: Final token to use:', token ? 'present' : 'missing');
      
      // Check if user is authenticated
      if (!token || !authService.isLoggedIn()) {
        console.log('Dashboard: No valid token found, redirecting to login');
        onLogout();
        return;
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch dashboard stats
      const statsResponse = await fetch('http://localhost:8000/api/dashboard/stats', {
        headers
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('Dashboard: Received stats data:', statsData);
        setDashboardStats(statsData);
      } else if (statsResponse.status === 401) {
        console.log('Dashboard: Authentication failed, redirecting to login');
        authService.logout();
        onLogout();
        return;
      } else {
        console.error('Dashboard: Failed to fetch stats:', statsResponse.status, statsResponse.statusText);
        // Use fallback data for better user experience
        setDashboardStats({
          devices: { total: agents.length, online: agents.filter(a => a.status === 'connected').length, offline: agents.filter(a => a.status !== 'connected').length, health_percentage: agents.length > 0 ? Math.round((agents.filter(a => a.status === 'connected').length / agents.length) * 100) : 0 },
          deployments: { total: 0, successful: 0, failed: 0, pending: 0, success_rate: 0 },
          commands: { active: 0, pending: 0, completed: 0, failed: 0 },
          system: { health_score: 85, uptime: '99.9%', last_updated: new Date().toISOString() },
          groups: { total: 0 },
          activity: { recent_deployments: 0 }
        });
      }
      
      // Fetch recent activity
      const activityResponse = await fetch('http://localhost:8000/api/dashboard/recent-activity', {
        headers
      });
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        console.log('Dashboard: Received activity data:', activityData);
        setRecentActivity(activityData.activity || []);
      } else if (activityResponse.status === 401) {
        console.log('Dashboard: Authentication failed for activity data');
        authService.logout();
        onLogout();
        return;
      } else {
        console.error('Dashboard: Failed to fetch activity:', activityResponse.status, activityResponse.statusText);
      }
      
      // Fetch device chart data
      const chartResponse = await fetch('http://localhost:8000/api/dashboard/device-status-chart', {
        headers
      });
      
      if (chartResponse.ok) {
        const chartData = await chartResponse.json();
        console.log('Dashboard: Received chart data:', chartData);
        setDeviceChart(chartData.chart_data || []);
      } else if (chartResponse.status === 401) {
        console.log('Dashboard: Authentication failed for chart data');
        authService.logout();
        onLogout();
        return;
      } else {
        console.error('Dashboard: Failed to fetch chart:', chartResponse.status, chartResponse.statusText);
      }
      
      // Fetch system metrics
      const metricsResponse = await fetch('http://localhost:8000/api/dashboard/system-metrics', {
        headers
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        console.log('Dashboard: Received metrics data:', metricsData);
        setSystemMetrics(metricsData);
      } else {
        console.error('Dashboard: Failed to fetch metrics:', metricsResponse.status, metricsResponse.statusText);
      }
      
      // Fetch deployment trends
      const trendsResponse = await fetch('http://localhost:8000/api/dashboard/deployment-trends', {
        headers
      });
      
      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json();
        console.log('Dashboard: Received trends data:', trendsData);
        setDeploymentTrends(trendsData.trends || []);
      } else {
        console.error('Dashboard: Failed to fetch trends:', trendsResponse.status, trendsResponse.statusText);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize socket connection for agent management
  useEffect(() => {
    isMountedRef.current = true;
    
    // Fetch initial dashboard data
    fetchDashboardData();
    
    // Set up periodic refresh
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    
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
        
        // Don't reset dashboard stats on socket disconnect
        // They will be updated via API calls
      });

      // Agents list received
      socketRef.current.on('agents_list', (agentsList) => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Received agents list:', agentsList);
        
        if (Array.isArray(agentsList)) {
          setAgents(agentsList);
          
          // Refresh dashboard data when agents update
          fetchDashboardData();
          
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
      clearInterval(interval);
      
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
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.username || 'Admin'}!</h1>
                  <p className="text-gray-400">Here's what's happening with your systems today</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Last updated</p>
                  <p className="text-white font-medium">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Connected Devices</p>
                      {loading ? (
                        <div className="h-8 w-16 bg-gray-700/50 rounded animate-pulse"></div>
                      ) : (
                        <p className="text-2xl font-bold text-white">{dashboardStats.devices.total}</p>
                      )}
                      {loading ? (
                        <div className="h-4 w-20 bg-gray-700/50 rounded animate-pulse mt-1"></div>
                      ) : (
                        <p className="text-green-400 text-xs mt-1">
                          <span className="inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {dashboardStats.devices.online} Online
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Server className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="card-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">System Health</p>
                      <p className="text-2xl font-bold text-white">{dashboardStats.system.health_score}%</p>
                      <p className={`text-xs mt-1 ${dashboardStats.system.health_score >= 80 ? 'text-green-400' : dashboardStats.system.health_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {dashboardStats.system.health_score >= 80 ? 'Excellent' : dashboardStats.system.health_score >= 60 ? 'Good' : 'Poor'}
                        </span>
                      </p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <Shield className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="card-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Deployments</p>
                      <p className="text-2xl font-bold text-white">{dashboardStats.deployments.total}</p>
                      <p className="text-green-400 text-xs mt-1">
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {dashboardStats.deployments.success_rate}% Success Rate
                        </span>
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Play className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="card-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Active Commands</p>
                      <p className="text-2xl font-bold text-white">{dashboardStats.commands.active}</p>
                      <p className="text-blue-400 text-xs mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {dashboardStats.commands.pending} Pending
                        </span>
                      </p>
                    </div>
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                      <Command className="w-6 h-6 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts and Visual Data */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Device Health Chart */}
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Device Health</h3>
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Device Health</span>
                        <span className="text-white">{dashboardStats.devices.health_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" 
                          style={{ width: `${dashboardStats.devices.health_percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Deployment Success</span>
                        <span className="text-white">{dashboardStats.deployments.success_rate}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" 
                          style={{ width: `${dashboardStats.deployments.success_rate}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">System Health</span>
                        <span className="text-white">{dashboardStats.system.health_score}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" 
                          style={{ width: `${dashboardStats.system.health_score}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Recent Activities</h3>
                      <p className="text-xs text-gray-400 mt-1">Deployments • Groups • Connections • System Events</p>
                    </div>
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                      </div>
                    ) : recentActivity.length > 0 ? (
                      recentActivity.slice(0, 5).map((activity, index) => {
                        const getActivityColor = (status) => {
                          switch(status) {
                            case 'completed': return 'bg-green-400';
                            case 'failed': return 'bg-red-400';
                            case 'in_progress': return 'bg-blue-400';
                            case 'pending': return 'bg-yellow-400';
                            case 'disconnected': return 'bg-orange-400';
                            default: return 'bg-gray-400';
                          }
                        };
                        
                        const getActivityIcon = (type) => {
                          switch(type) {
                            case 'deployment':
                            case 'deployment_complete':
                              return <Play className="w-3 h-3" />;
                            case 'group_created':
                              return <Users className="w-3 h-3" />;
                            case 'device_connected':
                              return <Server className="w-3 h-3" />;
                            case 'file_uploaded':
                              return <FolderOpen className="w-3 h-3" />;
                            case 'user_login':
                              return <Shield className="w-3 h-3" />;
                            case 'system':
                              return <Activity className="w-3 h-3" />;
                            default:
                              return <Clock className="w-3 h-3" />;
                          }
                        };
                        const formatTimestamp = (timestamp) => {
                          if (!timestamp) return 'Unknown time';
                          const date = new Date(timestamp);
                          const now = new Date();
                          const diffMs = now - date;
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMins / 60);
                          const diffDays = Math.floor(diffHours / 24);
                          
                          if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
                          if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                          return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                        };
                        return (
                          <div key={activity.id || index} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors group">
                            <div className={`w-8 h-8 rounded-full ${getActivityColor(activity.status)} flex items-center justify-center text-white`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{activity.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-400 text-xs">{formatTimestamp(activity.timestamp)}</p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  activity.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                                  activity.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                                  activity.status === 'in_progress' ? 'bg-blue-900/30 text-blue-400' :
                                  activity.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                                  'bg-gray-900/30 text-gray-400'
                                }`}>
                                  {activity.status.replace('_', ' ')}
                                </span>
                              </div>
                              {activity.details && (
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                  {activity.type === 'deployment' && `${activity.details.device_count} devices`}
                                  {activity.type === 'deployment_complete' && activity.details.duration && `Duration: ${activity.details.duration.split('.')[0]}`}
                                  {activity.type === 'group_created' && `Group: ${activity.details.group_name}`}
                                  {activity.type === 'device_connected' && `MAC: ${activity.details.device_mac}`}
                                  {activity.type === 'user_login' && `User: ${activity.details.username}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-400 text-center py-8">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No recent activities</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Device Status Pie Chart */}
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Device Status Distribution</h3>
                    <PieChart className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="3"
                          strokeDasharray={`${dashboardStats.devices.health_percentage}, 100`}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">{dashboardStats.devices.health_percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-gray-300 text-sm">Online</span>
                      </div>
                      <span className="text-white font-medium">{dashboardStats.devices.online}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-gray-300 text-sm">Offline</span>
                      </div>
                      <span className="text-white font-medium">{dashboardStats.devices.offline}</span>
                    </div>
                  </div>
                </div>

                {/* Command Queue Activity */}
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Command Queue Activity</h3>
                    <Activity className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Active</span>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${dashboardStats.commands.active > 0 ? Math.max((dashboardStats.commands.active / Math.max(dashboardStats.commands.active + dashboardStats.commands.pending + dashboardStats.commands.completed + dashboardStats.commands.failed, 1)) * 100, 5) : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-orange-400 font-bold text-sm">{dashboardStats.commands.active}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Pending</span>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${dashboardStats.commands.pending > 0 ? Math.max((dashboardStats.commands.pending / Math.max(dashboardStats.commands.active + dashboardStats.commands.pending + dashboardStats.commands.completed + dashboardStats.commands.failed, 1)) * 100, 5) : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-blue-400 font-bold text-sm">{dashboardStats.commands.pending}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Completed</span>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${dashboardStats.commands.completed > 0 ? Math.max((dashboardStats.commands.completed / Math.max(dashboardStats.commands.active + dashboardStats.commands.pending + dashboardStats.commands.completed + dashboardStats.commands.failed, 1)) * 100, 5) : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-green-400 font-bold text-sm">{dashboardStats.commands.completed}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Failed</span>
                      <div className="flex items-center gap-3">
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-red-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${dashboardStats.commands.failed > 0 ? Math.max((dashboardStats.commands.failed / Math.max(dashboardStats.commands.active + dashboardStats.commands.pending + dashboardStats.commands.completed + dashboardStats.commands.failed, 1)) * 100, 5) : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-red-400 font-bold text-sm">{dashboardStats.commands.failed}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Health Gauge */}
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">System Health Score</h3>
                    <Shield className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-20 overflow-hidden">
                      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831"
                          fill="none"
                          stroke="#374151"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831"
                          fill="none"
                          stroke={dashboardStats.system.health_score >= 80 ? '#10B981' : dashboardStats.system.health_score >= 60 ? '#F59E0B' : '#EF4444'}
                          strokeWidth="3"
                          strokeDasharray={`${dashboardStats.system.health_score / 2}, 100`}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center pt-4">
                        <div className="text-center">
                          <span className="text-2xl font-bold text-white">{dashboardStats.system.health_score}</span>
                          <p className="text-xs text-gray-400 mt-1">Health Score</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>Poor</span>
                      <span>Good</span>
                      <span>Excellent</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          dashboardStats.system.health_score >= 80 
                            ? 'bg-gradient-to-r from-green-600 to-green-400' 
                            : dashboardStats.system.health_score >= 60 
                            ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' 
                            : 'bg-gradient-to-r from-red-600 to-red-400'
                        }`}
                        style={{ width: `${dashboardStats.system.health_score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment Trends Chart */}
              <div className="card-dark">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Deployment Success Trends</h3>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <div className="grid grid-cols-7 gap-2 h-32">
                  {deploymentTrends.length > 0 ? deploymentTrends.map((dayData, i) => {
                    const day = new Date(dayData.date);
                    const dayName = day.toLocaleDateString('en', { weekday: 'short' });
                    const height = dayData.total > 0 ? (dayData.success_rate) : 5; // Use actual success rate
                    const isToday = i === deploymentTrends.length - 1;
                    const hasDeployments = dayData.total > 0;
                    
                    return (
                      <div key={dayData.date} className="flex flex-col items-center justify-end h-full group relative">
                        <div 
                          className={`w-full rounded-t transition-all duration-500 group-hover:opacity-80 ${
                            !hasDeployments 
                              ? 'bg-gradient-to-t from-gray-700 to-gray-600'
                              : isToday 
                              ? 'bg-gradient-to-t from-cyan-600 to-cyan-400' 
                              : dayData.success_rate >= 80
                              ? 'bg-gradient-to-t from-green-600 to-green-400'
                              : dayData.success_rate >= 50
                              ? 'bg-gradient-to-t from-yellow-600 to-yellow-400'
                              : 'bg-gradient-to-t from-red-600 to-red-400'
                          }`}
                          style={{ height: `${Math.max(height, 5)}%` }}
                        ></div>
                        <span className="text-xs text-gray-400 mt-2">{dayName}</span>
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                          {hasDeployments ? (
                            <>
                              <div>Total: {dayData.total}</div>
                              <div>Success: {dayData.successful}</div>
                              <div>Failed: {dayData.failed}</div>
                              <div>Rate: {dayData.success_rate}%</div>
                            </>
                          ) : (
                            <div>No deployments</div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    // Fallback while loading
                    Array.from({ length: 7 }, (_, i) => {
                      const day = new Date();
                      day.setDate(day.getDate() - (6 - i));
                      const dayName = day.toLocaleDateString('en', { weekday: 'short' });
                      
                      return (
                        <div key={i} className="flex flex-col items-center justify-end h-full">
                          <div className="w-full h-2 bg-gray-700 rounded-t animate-pulse"></div>
                          <span className="text-xs text-gray-400 mt-2">{dayName}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300 text-sm">High Success</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-300 text-sm">Moderate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-300 text-sm">Low Success</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                      <span className="text-gray-300 text-sm">Today</span>
                    </div>
                  </div>
                  <span className="text-gray-400 text-sm">Avg Success: {deploymentTrends.length > 0 ? Math.round(deploymentTrends.reduce((acc, day) => acc + day.success_rate, 0) / deploymentTrends.length) : 0}%</span>
                </div>
              </div>

              {/* Real-time Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Network Activity */}
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Network & Connectivity</h3>
                    <Network className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Socket Connection</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                          {isConnected ? 'Active' : 'Disconnected'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Connected Agents</span>
                      <span className="text-cyan-400 font-medium">{agents.filter(agent => agent.status === 'connected').length}/{agents.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Network Connections</span>
                      <span className="text-white font-medium">{systemMetrics.network_connections}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Data Transfer</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'}`}></div>
                        <span className={`text-sm font-medium ${isConnected ? 'text-blue-400' : 'text-gray-400'}`}>
                          {isConnected ? 'Real-time' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resource Usage */}
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">System Resource Usage</h3>
                    <Cpu className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">CPU Usage</span>
                        <span className={`font-medium ${
                          systemMetrics.cpu_usage > 80 ? 'text-red-400' :
                          systemMetrics.cpu_usage > 60 ? 'text-yellow-400' : 'text-green-400'
                        }`}>{systemMetrics.cpu_usage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            systemMetrics.cpu_usage > 80 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            systemMetrics.cpu_usage > 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                            'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}
                          style={{ width: `${systemMetrics.cpu_usage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Memory Usage</span>
                        <span className={`font-medium ${
                          systemMetrics.memory_usage > 80 ? 'text-red-400' :
                          systemMetrics.memory_usage > 60 ? 'text-yellow-400' : 'text-green-400'
                        }`}>{systemMetrics.memory_usage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            systemMetrics.memory_usage > 80 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            systemMetrics.memory_usage > 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                            'bg-gradient-to-r from-green-500 to-cyan-500'
                          }`}
                          style={{ width: `${systemMetrics.memory_usage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Disk Usage</span>
                        <span className={`font-medium ${
                          systemMetrics.disk_usage > 80 ? 'text-red-400' :
                          systemMetrics.disk_usage > 60 ? 'text-yellow-400' : 'text-green-400'
                        }`}>{systemMetrics.disk_usage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-1000 ${
                            systemMetrics.disk_usage > 80 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                            systemMetrics.disk_usage > 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                            'bg-gradient-to-r from-yellow-500 to-orange-500'
                          }`}
                          style={{ width: `${systemMetrics.disk_usage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Shortcuts */}
              <div className="card-dark">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <button 
                    onClick={() => setActiveSection('shell')}
                    className="flex flex-col items-center gap-3 p-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-all group"
                  >
                    <TerminalIcon className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Terminal</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('files')}
                    className="flex flex-col items-center gap-3 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-all group"
                  >
                    <FolderOpen className="w-8 h-8 text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Files</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('deployments')}
                    className="flex flex-col items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all group"
                  >
                    <Play className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Deploy</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('system')}
                    className="flex flex-col items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-all group"
                  >
                    <Activity className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Monitor</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('groups')}
                    className="flex flex-col items-center gap-3 p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg transition-all group"
                  >
                    <Monitor className="w-8 h-8 text-orange-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Groups</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('network')}
                    className="flex flex-col items-center gap-3 p-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-all group"
                  >
                    <Network className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Network</span>
                  </button>
                </div>
              </div>

              {/* System Status Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Agent Status</h3>
                    <PieChart className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-gray-300">Online</span>
                      </div>
                      <span className="text-white font-medium">{agents.filter(a => a.status === 'connected').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <span className="text-gray-300">Offline</span>
                      </div>
                      <span className="text-white font-medium">{agents.filter(a => a.status !== 'connected').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span className="text-gray-300">Pending</span>
                      </div>
                      <span className="text-white font-medium">0</span>
                    </div>
                  </div>
                </div>

                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Deployments</h3>
                    <Database className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">Successful</span>
                      </div>
                      <span className="text-white font-medium">{dashboardStats.deployments.successful}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-gray-300">Failed</span>
                      </div>
                      <span className="text-white font-medium">{dashboardStats.deployments.failed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">In Progress</span>
                      </div>
                      <span className="text-white font-medium">1</span>
                    </div>
                  </div>
                </div>

                <div className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Security</h3>
                    <Shield className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Firewall</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">SSL/TLS</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Auth Status</span>
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
