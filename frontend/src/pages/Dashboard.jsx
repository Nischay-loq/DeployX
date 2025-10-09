import { useState, useEffect, useRef, useMemo, memo } from 'react';
import authService from '../services/auth.js';
import Terminal from '../components/Terminal.jsx';
import DeploymentManager from '../components/DeploymentManager.jsx';
import io from 'socket.io-client';

// Helper function to get API URL from environment
const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};
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
  PieChart,
  User,
  Edit,
  Mail,
  Lock,
  Eye,
  EyeOff,
  X,
  Trash2,
  Plus,
  Menu
} from 'lucide-react';
import GroupsManager from '../components/GroupsManager.jsx';
import DeploymentsManager from '../components/DeploymentsManager.jsx';
import FileSystemManager from '../components/FileSystemManager.jsx';
import GroupForm from '../components/GroupForm.jsx';
import UsernameModal from '../components/UsernameModal.jsx';
import PasswordModal from '../components/PasswordModal.jsx';
import EmailModal from '../components/EmailModal.jsx';
import DeleteAccountModal from '../components/DeleteAccountModal.jsx';
import groupsService from '../services/groups.js';

export default function Dashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState('');
  const [shells, setShells] = useState([]);
  const [currentShell, setCurrentShell] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [showAgentsTooltip, setShowAgentsTooltip] = useState(false);
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastErrorTimeRef = useRef(0);
  const user = authService.getCurrentUser();

  // Add authentication debugging
  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    console.log('Dashboard - User:', user);
    console.log('Dashboard - Token available:', !!token);
    
    if (!user || !token) {
      console.warn('Dashboard - No user or token found, redirecting to login');
      // Optionally redirect to login or show error
    }
  }, [user]);

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
  
  // Devices data with caching
  const [devicesData, setDevicesData] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesLastFetch, setDevicesLastFetch] = useState(null);
  const [devicesSearchTerm, setDevicesSearchTerm] = useState('');
  const [devicesStatusFilter, setDevicesStatusFilter] = useState('all');
  const [devicesGroupFilter, setDevicesGroupFilter] = useState('all');
  
  // Device Groups data with caching
  const [groupsData, setGroupsData] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsLastFetch, setGroupsLastFetch] = useState(null);
  const [groupsSearchTerm, setGroupsSearchTerm] = useState('');
  
  // Global loading state for smoother UX
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Profile dropdown states
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Profile modal states
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  
  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Group devices modal states
  const [showGroupDevicesModal, setShowGroupDevicesModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDevices, setGroupDevices] = useState([]);
  const [loadingGroupDevices, setLoadingGroupDevices] = useState(false);
  
  // Deployment details modal states
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState(null);
  const [deploymentDevices, setDeploymentDevices] = useState([]);
  const [deploymentGroups, setDeploymentGroups] = useState([]);
  const [loadingDeploymentDetails, setLoadingDeploymentDetails] = useState(false);
  
  // Group Edit Modal State
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  // Group Create Modal State
  const [showGroupCreateModal, setShowGroupCreateModal] = useState(false);
  
  // Force refresh key for group and device cards
  const [groupsRefreshKey, setGroupsRefreshKey] = useState(0);
  const [devicesRefreshKey, setDevicesRefreshKey] = useState(0);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  
  // Loading and error states
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState({ type: '', text: '' });

  // Optimized filtered data with useMemo for better performance
  const filteredDevices = useMemo(() => {
    const startTime = performance.now();
    
    if (!devicesData || devicesData.length === 0) return [];
    
    const result = devicesData.filter(device => {
      const searchTerm = devicesSearchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        device.device_name?.toLowerCase().includes(searchTerm) ||
        device.ip_address?.toLowerCase().includes(searchTerm) ||
        device.os?.toLowerCase().includes(searchTerm);
      
      const matchesStatus = devicesStatusFilter === 'all' || device.status === devicesStatusFilter;
      
      const matchesGroup = devicesGroupFilter === 'all' || 
        device.group?.group_name === devicesGroupFilter ||
        device.groups?.some(g => g.group_name === devicesGroupFilter || g.name === devicesGroupFilter);
      
      return matchesSearch && matchesStatus && matchesGroup;
    });
    
    const endTime = performance.now();
    console.log(`🚀 Device filtering took ${(endTime - startTime).toFixed(2)}ms for ${devicesData.length} devices`);
    
    return result;
  }, [devicesData, devicesSearchTerm, devicesStatusFilter, devicesGroupFilter]);

  const filteredGroups = useMemo(() => {
    const startTime = performance.now();
    
    if (!groupsData || groupsData.length === 0) return [];
    
    const result = groupsData.filter(group => {
      const searchTerm = groupsSearchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        group.group_name?.toLowerCase().includes(searchTerm) ||
        group.description?.toLowerCase().includes(searchTerm);
      
      return matchesSearch;
    });
    
    const endTime = performance.now();
    console.log(`🚀 Group filtering took ${(endTime - startTime).toFixed(2)}ms for ${groupsData.length} groups`);
    
    return result;
  }, [groupsData, groupsSearchTerm]);

  // Memoized unique groups for filter dropdown
  const availableGroups = useMemo(() => {
    if (!devicesData || devicesData.length === 0) return [];
    
    return [...new Set(
      devicesData.flatMap(device => {
        const groups = [];
        if (device.group?.group_name) groups.push(device.group.group_name);
        if (device.groups) {
          device.groups.forEach(g => {
            const name = g.group_name || g.name;
            if (name) groups.push(name);
          });
        }
        return groups;
      })
    )];
  }, [devicesData]);

  const sections = [
    { id: 'overview', name: 'Dashboard', color: 'text-blue-400', icon: Home },
    { id: 'groups', name: 'Device Groups', color: 'text-orange-400', icon: Monitor },
    { id: 'devices', name: 'Devices', color: 'text-teal-400', icon: Server },
    { id: 'shell', name: 'Remote Shell', color: 'text-cyan-400', icon: TerminalIcon },
    { id: 'deployment', name: 'Command Execution', color: 'text-teal-400', icon: Command },
    { id: 'deployments', name: 'Software Deployments', color: 'text-purple-400', icon: Play },
    { id: 'files', name: 'File System', color: 'text-green-400', icon: FolderOpen },
  ];

  // Click outside handler for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Optimized data loading - only load on initial mount, section changes use cached data
  useEffect(() => {
    const loadInitialData = async () => {
      // Only load data on first mount
      if (initialLoading) {
        console.log('📦 Dashboard: Loading initial data for section:', activeSection);
        
        // Load only what's needed for the initial section
        if (activeSection === 'overview') {
          await fetchDashboardData();
        } else if (activeSection === 'devices') {
          await fetchDevicesData(false); // Use cache if available
        } else if (activeSection === 'groups') {
          await Promise.all([
            fetchGroupsData(false),
            fetchDevicesData(false)
          ]);
        }
        // Other sections load data on-demand when user navigates to them
        
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, []); // Only run once on mount
  
  // Lazy load data when switching to sections that need it
  useEffect(() => {
    if (!initialLoading && activeSection === 'devices' && devicesData.length === 0) {
      fetchDevicesData(false);
    } else if (!initialLoading && activeSection === 'groups' && (groupsData.length === 0 || devicesData.length === 0)) {
      Promise.all([
        groupsData.length === 0 ? fetchGroupsData(false) : Promise.resolve(),
        devicesData.length === 0 ? fetchDevicesData(false) : Promise.resolve()
      ]);
    }
  }, [activeSection, initialLoading]);

  // Debounced search for better performance
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // Search is handled by filteredDevices/filteredGroups computed values
      // This effect ensures smooth typing experience
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [devicesSearchTerm, groupsSearchTerm]);

  // Fetch devices for a specific group
  const fetchGroupDevices = async (groupId, groupName, skipModalOpen = false) => {
    setLoadingGroupDevices(true);
    if (!skipModalOpen) {
      setSelectedGroup({ id: groupId, name: groupName });
      setShowGroupDevicesModal(true);
    }
    
    try {
      // Ensure we have fresh device data
      if (!devicesData || devicesData.length === 0) {
        await fetchDevicesData(true);
      }
      
      // Filter devices that belong to this group
      const devicesInGroup = devicesData.filter(device => {
        // Check direct group relationship
        if (device.group && device.group.id === groupId) {
          return true;
        }
        // Check group mappings
        if (device.groups && device.groups.some(g => g.id === groupId)) {
          return true;
        }
        return false;
      });
      
      setGroupDevices(devicesInGroup);
    } catch (error) {
      console.error('Error filtering group devices:', error);
      setGroupDevices([]);
    } finally {
      setLoadingGroupDevices(false);
    }
  };

  // Fetch deployment details
  const fetchDeploymentDetails = async (deployment) => {
    setLoadingDeploymentDetails(true);
    setSelectedDeployment(deployment);
    setShowDeploymentModal(true);
    
    try {
      const token = authService.getToken();
      if (!token) {
        console.log('No token found for deployment details fetch');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch deployment details from API
      const response = await fetch(`${getApiUrl()}/deployments/${deployment.id}`, {
        headers
      });

      if (response.ok) {
        const deploymentDetails = await response.json();
        console.log('Deployment details:', deploymentDetails);
        
        // Extract devices and groups from deployment details
        setDeploymentDevices(deploymentDetails.devices || []);
        setDeploymentGroups(deploymentDetails.groups || []);
        
        // Update selected deployment with full details
        setSelectedDeployment({
          ...deployment,
          ...deploymentDetails,
          software_details: deploymentDetails.software_details || [],
          installation_paths: deploymentDetails.installation_paths || [],
          target_devices: deploymentDetails.target_devices || [],
          target_groups: deploymentDetails.target_groups || []
        });
      } else {
        console.error('Failed to fetch deployment details:', response.status);
        // Use fallback data structure
        setDeploymentDevices([]);
        setDeploymentGroups([]);
        setSelectedDeployment({
          ...deployment,
          software_details: deployment.software_name ? [{
            name: deployment.software_name,
            version: deployment.version || 'Unknown',
            installation_path: deployment.installation_path || '/default/path',
            size: deployment.file_size || 'Unknown'
          }] : [],
          target_devices: deployment.target_devices || [],
          target_groups: deployment.target_groups || []
        });
      }
    } catch (error) {
      console.error('Error fetching deployment details:', error);
      // Fallback to basic deployment info
      setDeploymentDevices([]);
      setDeploymentGroups([]);
      setSelectedDeployment({
        ...deployment,
        software_details: [],
        target_devices: [],
        target_groups: []
      });
    } finally {
      setLoadingDeploymentDetails(false);
    }
  };

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
      
      // Fetch all dashboard data in parallel for faster loading
      const apiUrl = getApiUrl();
      const [statsResponse, activityResponse, chartResponse, metricsResponse, trendsResponse] = await Promise.allSettled([
        fetch(`${apiUrl}/api/dashboard/stats`, { headers }),
        fetch(`${apiUrl}/api/dashboard/recent-activity`, { headers }),
        fetch(`${apiUrl}/api/dashboard/device-status-chart`, { headers }),
        fetch(`${apiUrl}/api/dashboard/system-metrics`, { headers }),
        fetch(`${apiUrl}/api/dashboard/deployment-trends`, { headers })
      ]);
      
      // Process stats response
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        console.log('Dashboard: Received stats data:', statsData);
        setDashboardStats(statsData);
      } else if (statsResponse.status === 'fulfilled' && statsResponse.value.status === 401) {
        console.log('Dashboard: Authentication failed');
        if (!authService.isPersistentSession()) {
          authService.logout();
          onLogout();
          return;
        }
      } else {
        console.error('Dashboard: Failed to fetch stats');
        setDashboardStats({
          devices: { total: agents.length, online: agents.filter(a => a.status === 'connected').length, offline: agents.filter(a => a.status !== 'connected').length, health_percentage: agents.length > 0 ? Math.round((agents.filter(a => a.status === 'connected').length / agents.length) * 100) : 0 },
          deployments: { total: 0, successful: 0, failed: 0, pending: 0, success_rate: 0 },
          commands: { active: 0, pending: 0, completed: 0, failed: 0 },
          system: { health_score: 85, uptime: '99.9%', last_updated: new Date().toISOString() },
          groups: { total: 0 },
          activity: { recent_deployments: 0 }
        });
      }
      
      // Process activity response
      if (activityResponse.status === 'fulfilled' && activityResponse.value.ok) {
        const activityData = await activityResponse.value.json();
        console.log('Dashboard: Received activity data:', activityData);
        setRecentActivity(activityData.activity || []);
      } else if (activityResponse.status === 'fulfilled' && activityResponse.value.status === 401) {
        if (!authService.isPersistentSession()) {
          authService.logout();
          onLogout();
          return;
        }
      }
      
      // Process chart response
      if (chartResponse.status === 'fulfilled' && chartResponse.value.ok) {
        const chartData = await chartResponse.value.json();
        console.log('Dashboard: Received chart data:', chartData);
        setDeviceChart(chartData.chart_data || []);
      }
      
      // Process metrics response
      if (metricsResponse.status === 'fulfilled' && metricsResponse.value.ok) {
        const metricsData = await metricsResponse.value.json();
        console.log('Dashboard: Received metrics data:', metricsData);
        setSystemMetrics(metricsData);
      }
      
      // Process trends response
      if (trendsResponse.status === 'fulfilled' && trendsResponse.value.ok) {
        const trendsData = await trendsResponse.value.json();
        console.log('Dashboard: Received trends data:', trendsData);
        setDeploymentTrends(trendsData.trends || []);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Optimized devices data fetching with caching
  const fetchDevicesData = async (forceRefresh = false) => {
    const fetchStartTime = performance.now();
    
    try {
      // Check cache first (refresh every 45 seconds for better performance)
      const now = Date.now();
      if (!forceRefresh && devicesLastFetch && (now - devicesLastFetch) < 45000 && devicesData.length > 0) {
        console.log('⚡ Dashboard: Using cached devices data (age: ' + Math.round((now - devicesLastFetch) / 1000) + 's)');
        return;
      }

      setDevicesLoading(true);
      
      // Ensure auth service is initialized
      if (!authService.getCurrentUser()) {
        console.log('Dashboard: No user found for devices fetch');
        return;
      }

      const token = authService.getToken();
      if (!token) {
        console.log('Dashboard: No token found for devices fetch');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Remove timeout for persistent connection
      const devicesResponse = await fetch(`${getApiUrl()}/devices/`, {
        headers
      });
      
      if (devicesResponse.ok) {
        const devicesDataResponse = await devicesResponse.json();
        const fetchEndTime = performance.now();
        const fetchDuration = (fetchEndTime - fetchStartTime).toFixed(2);
        
        console.log(`🚀 Dashboard: Received ${devicesDataResponse?.length || 0} devices in ${fetchDuration}ms`);
        
        // Update data and cache timestamp
        setDevicesData(devicesDataResponse || []);
        setDevicesLastFetch(Date.now());
      } else if (devicesResponse.status === 401) {
        console.log('Dashboard: Authentication failed for devices data');
        // Only auto-logout for non-persistent sessions
        if (!authService.isPersistentSession()) {
          authService.logout();
          onLogout();
          return;
        }
      } else {
        console.error('Dashboard: Failed to fetch devices:', devicesResponse.status, devicesResponse.statusText);
        // Set fallback data for development
        setDevicesData([
          {
            id: 1,
            device_name: "Web Server 01",
            ip_address: "192.168.1.10",
            status: "online",
            os: "Ubuntu 20.04",
            last_seen: "2024-01-15T10:30:00Z",
            groups: ["Web Servers", "Production"],
            cpu_usage: 45,
            memory_usage: 60,
            disk_usage: 25
          },
          {
            id: 2,
            device_name: "Database Server",
            ip_address: "192.168.1.20",
            status: "online",
            os: "CentOS 8",
            last_seen: "2024-01-15T10:29:00Z",
            groups: ["Database Servers"],
            cpu_usage: 30,
            memory_usage: 80,
            disk_usage: 55
          },
          {
            id: 3,
            device_name: "App Server 02",
            ip_address: "192.168.1.30",
            status: "offline",
            os: "Windows Server 2019",
            last_seen: "2024-01-15T09:15:00Z",
            groups: ["Application Servers"],
            cpu_usage: 0,
            memory_usage: 0,
            disk_usage: 40
          }
        ]);
      }
    } catch (error) {
      console.error('Dashboard: Error fetching devices data:', error);
      // Set fallback data
      setDevicesData([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  // Optimized groups data fetching with caching
  const fetchGroupsData = async (forceRefresh = false) => {
    const fetchStartTime = performance.now();
    
    try {
      // Check cache first (refresh every 45 seconds for better performance)
      const now = Date.now();
      if (!forceRefresh && groupsLastFetch && (now - groupsLastFetch) < 45000 && groupsData.length > 0) {
        console.log('⚡ Dashboard: Using cached groups data (age: ' + Math.round((now - groupsLastFetch) / 1000) + 's)');
        return;
      }

      setGroupsLoading(true);
      
      // Ensure auth service is initialized
      if (!authService.getCurrentUser()) {
        console.log('Dashboard: No user found for groups fetch');
        return;
      }

      const token = authService.getToken();
      if (!token) {
        console.log('Dashboard: No token found for groups fetch');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Use Promise.race for timeout handling
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 8000)
      );

      const apiUrl = getApiUrl();
      console.log('Dashboard: Using API URL:', apiUrl);
      console.log('Dashboard: Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
      
      const fetchPromise = fetch(`${apiUrl}/groups/`, {
        headers
      });
      
      const groupsResponse = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (groupsResponse.ok) {
        const groupsDataResponse = await groupsResponse.json();
        const fetchEndTime = performance.now();
        const fetchDuration = (fetchEndTime - fetchStartTime).toFixed(2);
        
        console.log(`🚀 Dashboard: Received ${groupsDataResponse?.length || 0} groups in ${fetchDuration}ms`);
        
        // Update data and cache timestamp
        setGroupsData(groupsDataResponse || []);
        setGroupsLastFetch(Date.now());
      } else if (groupsResponse.status === 401) {
        console.log('Dashboard: Authentication failed for groups data');
        // Only auto-logout for non-persistent sessions
        if (!authService.isPersistentSession()) {
          authService.logout();
          onLogout();
          return;
        }
      } else {
        console.error('Dashboard: Failed to fetch groups:', groupsResponse.status, groupsResponse.statusText);
        // Set empty array when API call fails
        setGroupsData([]);
      }
    } catch (error) {
      console.error('Dashboard: Error fetching groups data:', error);
      setGroupsData([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  // Handle group update
  const handleUpdateGroup = async (groupData) => {
    const updatedGroupId = editingGroup.id;
    try {
      console.log('🎯 Updating group:', updatedGroupId, groupData);
      await groupsService.updateGroup(updatedGroupId, groupData);
      console.log('✅ Group updated successfully, triggering refresh...');
      
      // Force refresh groups and devices data
      await forceRefreshGroups();
      
      // If group devices modal is open for this group, refresh it
      if (showGroupDevicesModal && selectedGroup && selectedGroup.id === updatedGroupId) {
        console.log('Refreshing group devices modal for updated group');
        // Update the selected group name
        const newGroupName = groupData.group_name || selectedGroup.name;
        setSelectedGroup({ id: updatedGroupId, name: newGroupName });
        // Refresh the devices in the modal (skipModalOpen = true since it's already open)
        await fetchGroupDevices(updatedGroupId, newGroupName, true);
      }
      
      // Close edit modal
      setShowGroupEditModal(false);
      setEditingGroup(null);
      console.log('🎯 Group update completed');
    } catch (error) {
      console.error('❌ Failed to update group:', error);
      alert('Failed to update group: ' + error.message);
    }
  };

  const closeGroupEditModal = () => {
    setShowGroupEditModal(false);
    setEditingGroup(null);
  };

  // Handle group creation
  const handleCreateGroup = async (groupData) => {
    try {
      console.log('🎯 Creating group:', groupData);
      await groupsService.createGroup(groupData);
      console.log('✅ Group created successfully, triggering refresh...');
      // Force refresh groups and devices data
      await forceRefreshGroups();
      
      // Close modal
      setShowGroupCreateModal(false);
      console.log('🎯 Group creation completed');
    } catch (error) {
      console.error('❌ Failed to create group:', error);
      alert('Failed to create group: ' + error.message);
    }
  };

  const closeGroupCreateModal = () => {
    setShowGroupCreateModal(false);
  };

  // Force refresh devices data specifically
  const forceRefreshDevices = async () => {
    console.log('🔄 Dashboard: Force refreshing devices data...');
    setDevicesLastFetch(null);
    await fetchDevicesData(true);
    setDevicesRefreshKey(prev => prev + 1);
    console.log('✅ Dashboard: Devices data refresh completed');
  };

  // Force refresh all dashboard data
  const forceRefreshAll = async () => {
    console.log('🔄 Dashboard: Force refreshing all dashboard data...');
    setGroupsLastFetch(null);
    setDevicesLastFetch(null);
    await Promise.all([
      fetchDashboardData(),
      fetchGroupsData(true),
      fetchDevicesData(true)
    ]);
    setGroupsRefreshKey(prev => prev + 1);
    setDevicesRefreshKey(prev => prev + 1);
    console.log('✅ Dashboard: All dashboard data refresh completed');
  };

  // Debug function to log current state (temporary)
  const debugCurrentState = () => {
    console.log('🐛 === CURRENT DASHBOARD STATE ===');
    console.log('📊 Dashboard Stats:', dashboardStats);
    console.log('👥 Groups Data:', groupsData);
    console.log('🖥️ Devices Data:', devicesData);
    console.log('🔑 Refresh Keys - Groups:', groupsRefreshKey, 'Devices:', devicesRefreshKey);
    console.log('🐛 === END DEBUG STATE ===');
  };

  // Add debug function to window for manual testing
  window.debugDashboard = debugCurrentState;

  // Force refresh all group-related data
  const forceRefreshGroups = async () => {
    console.log('🔄 Dashboard: Force refreshing all group-related data (groups, devices, dashboard stats)...');
    const oldGroupsKey = groupsRefreshKey;
    const oldDevicesKey = devicesRefreshKey;
    
    // Clear cache timestamps to force fresh fetch
    setGroupsLastFetch(null);
    setDevicesLastFetch(null);
    
    // Fetch fresh data (groups and devices only, stats not needed for group operations)
    await Promise.all([
      fetchGroupsData(true),
      fetchDevicesData(true)
    ]);
    
    // Force re-render for both groups and devices
    setGroupsRefreshKey(prev => {
      console.log('📊 Groups refresh key: ', prev, '->', prev + 1);
      return prev + 1;
    });
    setDevicesRefreshKey(prev => {
      console.log('📱 Devices refresh key: ', prev, '->', prev + 1);
      return prev + 1;
    });
    
    console.log('✅ Dashboard: All group-related data refresh completed');
    console.log('📈 Refresh keys updated - Groups:', oldGroupsKey, '->', groupsRefreshKey + 1, 'Devices:', oldDevicesKey, '->', devicesRefreshKey + 1);
  };

  // Initialize socket connection for agent management
  useEffect(() => {
    isMountedRef.current = true;
    
    // Don't fetch initial data here - it's handled by the section loading effect
    
    // Set up periodic refresh only for overview section (reduced from 30s to 60s)
    const interval = setInterval(() => {
      if (activeSection === 'overview') {
        console.log('🔄 Periodic refresh for overview section');
        fetchDashboardData();
      }
    }, 60000); // Refresh every 60 seconds
    
    const initializeSocket = () => {
      if (socketRef.current) return;
      
      console.log('Dashboard: Initializing socket connection...');
      
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
      
      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 500,  // Fast reconnection
        reconnectionAttempts: Infinity,  // Infinite reconnection attempts
        timeout: 20000,  // Connection timeout: 20 seconds
        forceNew: true,
        autoConnect: true,
        pingTimeout: 60000,  // Ping timeout: 60 seconds
        pingInterval: 25000  // Ping every 25 seconds to keep connection alive
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
        
        // Throttle error logging to prevent spam
        const now = Date.now();
        if (now - lastErrorTimeRef.current > 5000) { // Only log every 5 seconds
          console.error('Dashboard: Connection error:', error);
          lastErrorTimeRef.current = now;
        }
        
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

      // Reconnection failed after max attempts
      socketRef.current.on('reconnect_failed', () => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Reconnection failed after maximum attempts');
        setIsConnected(false);
        setConnectionError('Connection failed. Please check if the backend server is running and refresh the page.');
      });

      // Agents list received
      socketRef.current.on('agents_list', (agentsList) => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Received agents list:', agentsList);
        
        if (Array.isArray(agentsList)) {
          // Validate that agents have the expected structure
          const validAgents = agentsList.filter(agent => 
            agent && typeof agent === 'object' && agent.agent_id && agent.hostname
          );
          
          if (validAgents.length !== agentsList.length) {
            console.warn('Dashboard: Some agents have invalid structure:', agentsList);
          }
          
          setAgents(validAgents);
          console.log('Dashboard: Set agents:', validAgents);
          
          // Refresh dashboard data when agents update
          fetchDashboardData();
          
          // Auto-select first agent if none selected and agents available
          if (validAgents.length > 0 && !currentAgent) {
            const firstAgent = validAgents[0];
            setCurrentAgent(firstAgent.agent_id);
            console.log('Dashboard: Auto-selected first agent:', firstAgent.agent_id);
            console.log('Dashboard: First agent details:', firstAgent);
            
            // Request shells for the first agent
            if (socketRef.current && socketRef.current.connected) {
              console.log('Dashboard: Auto-requesting shells for first agent:', firstAgent.agent_id);
              socketRef.current.emit('get_shells', firstAgent.agent_id);
            } else {
              console.warn('Dashboard: Cannot auto-request shells - socket not connected');
            }
          }
        } else {
          console.error('Dashboard: Invalid agents list received (not array):', agentsList);
          setConnectionError('Invalid agents list received from server');
        }
      });

      // Shells list received
      socketRef.current.on('shells_list', (shellsList) => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Received shells list:', shellsList);
        console.log('Dashboard: Shells type:', typeof shellsList);
        console.log('Dashboard: Is array:', Array.isArray(shellsList));
        console.log('Dashboard: Current agent when shells received:', currentAgent);
        
        if (Array.isArray(shellsList)) {
          setShells(shellsList);
          
          if (shellsList.length > 0) {
            console.log('Dashboard: Setting shells:', shellsList);
            // Auto-select default shell if none selected
            if (!currentShell) {
              const defaultShell = shellsList.includes('cmd') ? 'cmd' : 
                                 shellsList.includes('bash') ? 'bash' : shellsList[0];
              console.log('Dashboard: Auto-selecting shell:', defaultShell);
              setCurrentShell(defaultShell);
            }
          } else {
            console.warn('Dashboard: Received empty shells array');
          }
        } else {
          console.error('Dashboard: Received invalid shells list:', shellsList);
        }
      });

      // Error messages
      socketRef.current.on('error', (data) => {
        if (!isMountedRef.current) return;
        
        console.error('Dashboard: Socket error:', data);
        const errorMessage = data?.message || data || 'Unknown error';
        setConnectionError(errorMessage);
      });

      // Real-time device status changes
      socketRef.current.on('device_status_changed', (deviceInfo) => {
        if (!isMountedRef.current) return;
        
        console.log('Dashboard: Device status changed in real-time:', deviceInfo);
        
        // Update devices data immediately without refetching
        setDevicesData((prevDevices) => {
          return prevDevices.map((device) => {
            if (device.agent_id === deviceInfo.agent_id || device.device_name === deviceInfo.device_name) {
              return {
                ...device,
                status: deviceInfo.status,
                last_seen: deviceInfo.last_seen,
                ip_address: deviceInfo.ip_address || device.ip_address
              };
            }
            return device;
          });
        });
        
        // Also refresh dashboard stats for accurate counts
        fetchDashboardData();
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

  // Click outside handler for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If the clicked element is not within the profile dropdown, close it
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Handle agent selection
  const handleAgentSelect = (agentId) => {
    console.log('Dashboard: Agent selected:', agentId);
    console.log('Dashboard: Available agents:', agents);
    
    // Find the agent object
    const selectedAgentObj = agents.find(a => a.agent_id === agentId);
    console.log('Dashboard: Selected agent object:', selectedAgentObj);
    
    setCurrentAgent(agentId);
    setShells([]);
    setCurrentShell('');
    
    if (agentId && socketRef.current && socketRef.current.connected) {
      console.log('Dashboard: Requesting shells for agent:', agentId);
      console.log('Dashboard: Socket connected:', socketRef.current.connected);
      socketRef.current.emit('get_shells', agentId);
    } else {
      console.warn('Dashboard: Cannot request shells - no agentId or socket not connected');
      console.log('Dashboard: AgentId:', agentId);
      console.log('Dashboard: Socket exists:', !!socketRef.current);
      console.log('Dashboard: Socket connected:', socketRef.current?.connected);
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

  // Profile management functions
  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage({ type: '', text: '' });

    try {
      const token = authService.getToken() || localStorage.getItem('access_token');
      const response = await fetch(`${getApiUrl()}/auth/update-username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_username: usernameForm.newUsername })
      });

      const data = await response.json();

      if (response.ok) {
        setFormMessage({ type: 'success', text: data.message });
        setUsernameForm({ newUsername: '' });
        // Update user info in auth service if needed
        setTimeout(() => {
          setShowChangeUsername(false);
          setFormMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setFormMessage({ type: 'error', text: data.detail || 'Failed to update username' });
      }
    } catch (error) {
      setFormMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormMessage({ type: 'error', text: 'New passwords do not match' });
      setFormLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setFormMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
      setFormLoading(false);
      return;
    }

    try {
      const token = authService.getToken() || localStorage.getItem('access_token');
      const response = await fetch(`${getApiUrl()}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFormMessage({ type: 'success', text: data.message });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowChangePassword(false);
          setFormMessage({ type: '', text: '' });
        }, 2000);
      } else {
        setFormMessage({ type: 'error', text: data.detail || 'Failed to change password' });
      }
    } catch (error) {
      setFormMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMessage({ type: '', text: '' });

    try {
      const token = authService.getToken() || localStorage.getItem('access_token');
      const response = await fetch(`${getApiUrl()}/auth/request-email-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_email: emailForm.newEmail,
          password: emailForm.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFormMessage({ type: 'success', text: data.message });
        setEmailForm({ newEmail: '', password: '' });
        setTimeout(() => {
          setShowChangeEmail(false);
          setFormMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setFormMessage({ type: 'error', text: data.detail || 'Failed to request email change' });
      }
    } catch (error) {
      setFormMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setFormLoading(false);
    }
  };

  const resetForms = () => {
    setNewUsername('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNewEmail('');
    setEmailPassword('');
    setUsernameError('');
    setPasswordError('');
    setEmailError('');
    setEmailSuccess('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowEmailPassword(false);
  };

  const handleProfileOptionClick = (option) => {
    resetForms();
    setShowProfileDropdown(false);
    
    switch(option) {
      case 'username':
        setShowUsernameModal(true);
        break;
      case 'password':
        setShowPasswordModal(true);
        break;
      case 'email':
        setShowEmailModal(true);
        break;
      case 'logout':
        handleDisconnect();
        break;
      case 'delete-account':
        setShowDeleteAccountModal(true);
        break;
    }
  };

  // Skeleton loading component
  const SkeletonCard = memo(() => (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-white/20 rounded w-3/4"></div>
        <div className="h-3 bg-white/20 rounded w-1/2"></div>
        <div className="h-3 bg-white/20 rounded w-2/3"></div>
        <div className="h-3 bg-white/20 rounded w-1/3"></div>
      </div>
    </div>
  ));

  // Error boundary for safe rendering
  const SafeDeviceCard = memo(({ device, refreshKey }) => {
    try {
      return <DeviceCard device={device} refreshKey={refreshKey} />;
    } catch (error) {
      console.error('Error rendering device card:', error);
      return (
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg p-6">
          <div className="text-red-400 text-sm">Error loading device</div>
        </div>
      );
    }
  });

  // Memoized Device Card Component for better performance
  const DeviceCard = memo(({ device, refreshKey }) => {
    console.log('🖥️ Rendering device card:', device.device_name, 'refreshKey:', refreshKey);
    console.log('👥 Device group info:', device.group, device.groups);
    
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 hover:bg-white/15 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-semibold">{device.device_name || 'Unknown Device'}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            device.status === 'online' ? 'bg-green-500/20 text-green-300' : 
            device.status === 'offline' ? 'bg-red-500/20 text-red-300' : 
            'bg-yellow-500/20 text-yellow-300'
          }`}>
            {device.status || 'Unknown'}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center text-gray-300">
            <Monitor className="h-4 w-4 mr-2" />
            <span className="text-sm">{device.ip_address || 'N/A'}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Server className="h-4 w-4 mr-2" />
            <span className="text-sm">{device.os || 'Unknown OS'}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Users className="h-4 w-4 mr-2" />
            <span className="text-sm">
              {device.group?.group_name || 
               (device.groups && device.groups.length > 0 ? 
                device.groups.map(g => g.group_name || g.name).join(', ') : 'No Group')}
            </span>
          </div>
          {device.last_seen && (
            <div className="flex items-center text-gray-400">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-xs">Last seen: {new Date(device.last_seen).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    );
  });

  // Error boundary for safe group rendering
  const SafeGroupCard = memo(({ group, refreshKey }) => {
    try {
      return <GroupCard group={group} refreshKey={refreshKey} />;
    } catch (error) {
      console.error('Error rendering group card:', error);
      return (
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg p-6">
          <div className="text-red-400 text-sm">Error loading group</div>
        </div>
      );
    }
  });

  // Memoized Group Card Component for better performance
  const GroupCard = memo(({ group, refreshKey }) => {
    // Calculate actual device count from devicesData
    const actualDeviceCount = useMemo(() => {
      console.log('🔍 Calculating device count for group:', group.id, group.group_name, 'refreshKey:', refreshKey);
      console.log('📊 Available devices data:', devicesData?.length, 'devices');
      
      if (!devicesData || devicesData.length === 0) {
        console.log('❌ No devices data available');
        return 0;
      }
      
      const matchingDevices = devicesData.filter(device => {
        // Check direct group relationship
        if (device.group && device.group.id === group.id) {
          return true;
        }
        // Check group mappings
        if (device.groups && device.groups.some(g => g.id === group.id)) {
          return true;
        }
        return false;
      });
      
      console.log('✅ Found', matchingDevices.length, 'devices for group', group.group_name);
      return matchingDevices.length;
    }, [devicesData, group.id, refreshKey]);

    const handleEditGroup = async (e) => {
      e.stopPropagation();
      // Ensure devices are loaded before opening modal
      if (!devicesData || devicesData.length === 0) {
        await fetchDevicesData(true);
      }
      setEditingGroup(group);
      setShowGroupEditModal(true);
    };

    const handleDeleteGroup = async (e) => {
      e.stopPropagation();
      if (window.confirm(`Are you sure you want to delete the group "${group.group_name}"?`)) {
        try {
          console.log('🎯 Deleting group:', group.id, group.group_name);
          await groupsService.deleteGroup(group.id);
          console.log('✅ Group deleted successfully, triggering refresh...');
          
          // If group devices modal is open for this group, close it
          if (showGroupDevicesModal && selectedGroup && selectedGroup.id === group.id) {
            console.log('Closing group devices modal for deleted group');
            setShowGroupDevicesModal(false);
            setSelectedGroup(null);
            setGroupDevices([]);
          }
          
          // Force refresh groups and devices data
          await forceRefreshGroups();
          console.log('🎯 Group deletion completed');
        } catch (error) {
          console.error('❌ Failed to delete group:', error);
          alert('Failed to delete group: ' + error.message);
        }
      }
    };

    return (
      <div 
        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 hover:bg-white/15 transition-all duration-300 cursor-pointer group relative"
        onClick={() => fetchGroupDevices(group.id, group.group_name)}
      >
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEditGroup}
            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 hover:text-blue-200 transition-all"
            title="Edit Group"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={handleDeleteGroup}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 hover:text-red-200 transition-all"
            title="Delete Group"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4 pr-20">
          <h3 className="text-white text-lg font-semibold group-hover:text-blue-300 transition-colors">{group.group_name || 'Unknown Group'}</h3>
          <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {actualDeviceCount} device{actualDeviceCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center text-gray-300">
            <Server className="h-4 w-4 mr-2" />
            <span className="text-sm">{group.description || 'No description'}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Users className="h-4 w-4 mr-2" />
            <span className="text-sm">Click to view devices</span>
          </div>
          {group.created_at && (
            <div className="flex items-center text-gray-400">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-xs">Created: {new Date(group.created_at).toLocaleString()}</span>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center text-blue-400 text-sm group-hover:text-blue-300 transition-colors">
            <Eye className="h-4 w-4 mr-2" />
            <span>View devices in this group</span>
          </div>
        </div>
      </div>
    );
  });

  // Show skeleton loading for initial load
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-8 bg-white/20 rounded w-1/4 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-4 sm:px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg sm:text-xl font-display">DX</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold font-display text-white">DeployX</h1>
              {/* <p className="text-sm text-gray-400">
                {user?.username ? `Welcome back, ${user.username}` : 'Remote System Management Console'}
              </p> */}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden md:block">
              {/* <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /> */}
              {/* <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
              /> */}
            </div>
            
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
              <Bell className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
            </button>
            
            {/* Connection Status */}
            <div 
              className="relative"
              onMouseEnter={() => agents.length > 0 && setShowAgentsTooltip(true)}
              onMouseLeave={() => setShowAgentsTooltip(false)}
            >
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

              {/* Agents Tooltip */}
              {showAgentsTooltip && agents.length > 0 && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[100] backdrop-blur-sm">
                  <div className="p-3 border-b border-gray-700 bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <h3 className="text-sm font-semibold text-white">Connected Devices</h3>
                      <span className="ml-auto text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full">
                        {agents.length}
                      </span>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {agents.map((agent, index) => (
                      <div 
                        key={agent.agent_id}
                        className={`p-3 hover:bg-gray-800/50 transition-colors ${
                          index !== agents.length - 1 ? 'border-b border-gray-800' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <Server className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {agent.hostname || 'Unknown Host'}
                            </p>
                            <p className="text-xs text-gray-400 font-mono truncate">
                              ID: {agent.agent_id}
                            </p>
                            {agent.os && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-gray-500">
                                  {agent.os}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                title={user?.username || 'User Profile'}
              >
                <User className="w-5 h-5 text-white" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-[100] backdrop-blur-sm">
                  <div className="py-2 bg-gray-800">
                    <div className="px-4 py-3 border-b border-gray-700 bg-gray-800">
                      <p className="text-white font-medium">{user?.username}</p>
                      <p className="text-gray-400 text-sm">{user?.email}</p>
                    </div>
                    
                    <button
                      onClick={() => handleProfileOptionClick('username')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 bg-gray-800 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Change Username</span>
                    </button>
                    
                    <button
                      onClick={() => handleProfileOptionClick('password')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 bg-gray-800 transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Change Password</span>
                    </button>
                    
                    <button
                      onClick={() => handleProfileOptionClick('email')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 bg-gray-800 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Change Email</span>
                    </button>
                    
                    <div className="border-t border-gray-700 mt-2 bg-gray-800">
                      <button
                        onClick={() => handleProfileOptionClick('logout')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/20 bg-gray-800 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                      
                      <button
                        onClick={() => handleProfileOptionClick('delete-account')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/20 bg-gray-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Account</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)] relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-50 w-72 bg-gray-900 lg:bg-gray-800/30 backdrop-blur-sm border-r border-gray-700 p-4 transform transition-transform duration-300 ease-in-out lg:transform-none shadow-2xl lg:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } h-[calc(100vh-80px)] lg:h-auto top-[80px] lg:top-0`}>
          <nav className="space-y-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setIsMobileSidebarOpen(false);
                }}
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
        <main className="flex-1 p-4 sm:p-6 overflow-auto bg-gray-900/50">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Welcome Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome back, {user?.username || 'Admin'}!</h1>
                  <p className="text-sm sm:text-base text-gray-400">Here's what's happening with your systems today</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs sm:text-sm text-gray-400">Last updated</p>
                  <p className="text-sm sm:text-base text-white font-medium">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                  className="card-dark cursor-pointer hover:bg-gray-800/80 transition-all hover:scale-105"
                  onClick={() => setActiveSection('devices')}
                  title="Click to view all devices"
                >
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

                <div 
                  className="card-dark cursor-pointer hover:bg-gray-800/80 transition-all hover:scale-105"
                  onClick={() => setActiveSection('deployments')}
                  title="Click to view software deployments"
                >
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

                <div 
                  className="card-dark cursor-pointer hover:bg-gray-800/80 transition-all hover:scale-105"
                  onClick={() => setActiveSection('deployment')}
                  title="Click to view command execution"
                >
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
                            case 'completed': 
                            case 'success': return 'bg-green-400';
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
                          <div 
                            key={activity.id || index} 
                            className={`flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors group ${
                              activity.type === 'deployment' || activity.type === 'deployment_complete' ? 'cursor-pointer' : ''
                            }`}
                            onClick={() => {
                              if (activity.type === 'deployment' || activity.type === 'deployment_complete') {
                                fetchDeploymentDetails({
                                  id: activity.id || `activity-${index}`,
                                  name: activity.title,
                                  status: activity.status,
                                  timestamp: activity.timestamp,
                                  software_name: activity.details?.software_name || 'Unknown Software',
                                  target_devices: activity.details?.device_count || 0,
                                  duration: activity.details?.duration
                                });
                              }
                            }}
                          >
                            <div className={`w-8 h-8 rounded-full ${getActivityColor(activity.status)} flex items-center justify-center text-white`}>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{activity.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-gray-400 text-xs">{formatTimestamp(activity.timestamp)}</p>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                                  activity.status === 'completed' || activity.status === 'success' ? 'bg-green-900/30 text-green-400' :
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
                              {(activity.type === 'deployment' || activity.type === 'deployment_complete') && (
                                <div className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                  Click to view deployment details
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
                      <div 
                        key={dayData.date} 
                        className={`flex flex-col items-center justify-end h-full group relative ${hasDeployments ? 'cursor-pointer' : ''}`}
                        onClick={() => hasDeployments && fetchDeploymentDetails({
                          id: `day-${dayData.date}`,
                          name: `Deployments for ${day.toLocaleDateString()}`,
                          status: dayData.success_rate >= 80 ? 'success' : dayData.success_rate >= 50 ? 'partial' : 'failed',
                          timestamp: dayData.date,
                          total_deployments: dayData.total,
                          successful_deployments: dayData.successful,
                          failed_deployments: dayData.failed,
                          success_rate: dayData.success_rate
                        })}
                      >
                        <div 
                          className={`w-full rounded-t transition-all duration-500 group-hover:opacity-80 ${hasDeployments ? 'group-hover:scale-105' : ''} ${
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
                        {hasDeployments && (
                          <span className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Click for details</span>
                        )}
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                          {hasDeployments ? (
                            <>
                              <div>Total: {dayData.total}</div>
                              <div>Success: {dayData.successful}</div>
                              <div>Failed: {dayData.failed}</div>
                              <div>Rate: {dayData.success_rate}%</div>
                              <div className="text-blue-400 mt-1">Click to view details</div>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                  <button 
                    onClick={() => setActiveSection('shell')}
                    className="flex flex-col items-center gap-3 p-6 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg transition-all group"
                  >
                    <TerminalIcon className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Terminal</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('files')}
                    className="flex flex-col items-center gap-3 p-6 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-all group"
                  >
                    <FolderOpen className="w-10 h-10 text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Files</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('deployments')}
                    className="flex flex-col items-center gap-3 p-6 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all group"
                  >
                    <Play className="w-10 h-10 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Deploy</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveSection('groups')}
                    className="flex flex-col items-center gap-3 p-6 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg transition-all group"
                  >
                    <Monitor className="w-10 h-10 text-orange-400 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-sm font-medium">Groups</span>
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

          {activeSection === 'deployment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <Command className="w-6 h-6 text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Command Execution</h2>
                    <p className="text-gray-400">Execute commands with deployment strategies and rollback capabilities</p>
                  </div>
                </div>
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
              </div>
              
              <div className="card-dark">
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
              </div>
            </div>
          )}

          {activeSection === 'files' && (
            <FileSystemManager />
          )}

          {activeSection === 'groups' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Device Groups</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      // Ensure devices are loaded before opening modal
                      if (!devicesData || devicesData.length === 0) {
                        await fetchDevicesData(true);
                      }
                      setShowGroupCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Group
                  </button>
                  <button
                    onClick={fetchGroupsData}
                    disabled={groupsLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <RotateCcw className={`w-4 h-4 ${groupsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search groups by name or description..."
                        value={groupsSearchTerm}
                        onChange={(e) => setGroupsSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                      />
                    </div>
                  </div>

                  {groupsSearchTerm && (
                    <button
                      onClick={() => setGroupsSearchTerm('')}
                      className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Clear Search
                    </button>
                  )}
                </div>

                <div className="mt-3 text-sm text-gray-400">
                  Showing {filteredGroups.length} of {groupsData.length} groups
                </div>
              </div>

              {groupsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">Loading groups...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Monitor className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Total Groups</p>
                          <p className="text-xl font-semibold text-white">{filteredGroups.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Server className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Total Devices</p>
                          <p className="text-xl font-semibold text-white">
                            {filteredGroups.reduce((sum, group) => sum + (group.device_count || 0), 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Avg Devices/Group</p>
                          <p className="text-xl font-semibold text-white">
                            {filteredGroups.length > 0 
                              ? Math.round(filteredGroups.reduce((sum, group) => sum + (group.device_count || 0), 0) / filteredGroups.length)
                              : 0
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Groups Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {groupsLoading ? (
                      // Show skeleton loading cards
                      [...Array(4)].map((_, i) => <SkeletonCard key={`skeleton-group-${i}`} />)
                    ) : (
                      filteredGroups.map((group) => (
                        <SafeGroupCard key={`group-${group.id}-refresh-${groupsRefreshKey}`} group={group} refreshKey={groupsRefreshKey} />
                      ))
                    )}
                  </div>
                  
                  {/* Empty States */}
                  {filteredGroups.length === 0 && groupsData.length > 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-300 mb-2">No groups match your search</h3>
                      <p className="text-gray-500 mb-4">Try adjusting your search criteria</p>
                      <button 
                        onClick={() => setGroupsSearchTerm('')}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        Clear Search
                      </button>
                    </div>
                  )}

                  {groupsData.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Monitor className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-300 mb-2">No device groups found</h3>
                      <p className="text-gray-500 mb-4">Create your first device group to organize your devices</p>
                      <button 
                        onClick={async () => {
                          // Ensure devices are loaded before opening modal
                          if (!devicesData || devicesData.length === 0) {
                            await fetchDevicesData(true);
                          }
                          setShowGroupCreateModal(true);
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        Create Group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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

          {activeSection === 'devices' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Devices Management</h2>
                <button
                  onClick={fetchDevicesData}
                  disabled={devicesLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  <RotateCcw className={`w-4 h-4 ${devicesLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Search and Filters */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search devices by name, IP, or OS..."
                        value={devicesSearchTerm}
                        onChange={(e) => setDevicesSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="lg:w-48">
                    <select
                      value={devicesStatusFilter}
                      onChange={(e) => setDevicesStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                    >
                      <option value="all">All Status</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  {/* Group Filter */}
                  <div className="lg:w-48">
                    <select
                      value={devicesGroupFilter}
                      onChange={(e) => setDevicesGroupFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                    >
                      <option value="all">All Groups</option>
                      {availableGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>

                  {/* Clear Filters */}
                  {(devicesSearchTerm || devicesStatusFilter !== 'all' || devicesGroupFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setDevicesSearchTerm('');
                        setDevicesStatusFilter('all');
                        setDevicesGroupFilter('all');
                      }}
                      className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Results Count */}
                <div className="mt-3 text-sm text-gray-400">
                  Showing {filteredDevices.length} of {devicesData.length} devices
                </div>
              </div>

              {devicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-300">Loading devices...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Online</p>
                          <p className="text-xl font-semibold text-white">
                            {filteredDevices.filter(d => d.status === 'online').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Offline</p>
                          <p className="text-xl font-semibold text-white">
                            {filteredDevices.filter(d => d.status === 'offline').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Maintenance</p>
                          <p className="text-xl font-semibold text-white">
                            {filteredDevices.filter(d => d.status === 'maintenance').length}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Server className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Filtered</p>
                          <p className="text-xl font-semibold text-white">{filteredDevices.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Devices Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {devicesLoading ? (
                      // Show skeleton loading cards
                      [...Array(6)].map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)
                    ) : (
                      filteredDevices.map((device) => (
                        <SafeDeviceCard key={`device-${device.id}-refresh-${devicesRefreshKey}`} device={device} refreshKey={devicesRefreshKey} />
                      ))
                    )}
                  </div>
                  
                  {/* Empty State */}
                  {filteredDevices.length === 0 && devicesData.length > 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-300 mb-2">No devices match your filters</h3>
                      <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria</p>
                      <button 
                        onClick={() => {
                          setDevicesSearchTerm('');
                          setDevicesStatusFilter('all');
                          setDevicesGroupFilter('all');
                        }}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}

                  {devicesData.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Server className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-300 mb-2">No devices found</h3>
                      <p className="text-gray-500 mb-4">Connect your first device to get started</p>
                      <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                        Add Device
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Profile Management Modals */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Change Username</h3>
            <form onSubmit={handleUpdateUsername}>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  New Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter new username"
                  required
                />
              </div>
              {usernameError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{usernameError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={usernameLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {usernameLoading ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUsernameModal(false);
                    setNewUsername('');
                    setUsernameError('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {passwordError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{passwordError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {passwordLoading ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Change Email</h3>
            <form onSubmit={handleChangeEmail}>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter new email address"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Password (for verification)
                </label>
                <div className="relative">
                  <input
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-10 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {emailError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{emailError}</p>
                </div>
              )}
              {emailSuccess && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-sm">{emailSuccess}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {emailLoading ? 'Sending...' : 'Send Verification'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setNewEmail('');
                    setEmailPassword('');
                    setEmailError('');
                    setEmailSuccess('');
                    setShowEmailPassword(false);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deployment Details Modal */}
      {showDeploymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-7xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Deployment Details: {selectedDeployment?.name}
                </h2>
                <p className="text-gray-400 mt-1">
                  Status: <span className={`font-medium ${
                    selectedDeployment?.status === 'success' ? 'text-green-400' :
                    selectedDeployment?.status === 'failed' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>{selectedDeployment?.status}</span>
                  {selectedDeployment?.timestamp && (
                    <span className="ml-4">Date: {new Date(selectedDeployment.timestamp).toLocaleString()}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setShowDeploymentModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
              {loadingDeploymentDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                  <span className="ml-3 text-gray-400">Loading deployment details...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Software Details Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-400" />
                      Software Details
                    </h3>
                    {selectedDeployment?.software_details?.length > 0 ? (
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {selectedDeployment.software_details.map((software, index) => (
                            <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                              <h4 className="font-medium text-white mb-2">{software.name}</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Version:</span>
                                  <span className="text-gray-300">{software.version}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Installation Path:</span>
                                  <span className="text-gray-300 font-mono text-xs">{software.installation_path}</span>
                                </div>
                                {software.size && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Size:</span>
                                    <span className="text-gray-300">{software.size}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-700/30 rounded-lg p-6 text-center">
                        <Database className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400">No software details available</p>
                      </div>
                    )}
                  </div>

                  {/* Target Devices Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-green-400" />
                      Target Devices ({deploymentDevices.length})
                    </h3>
                    {deploymentDevices.length > 0 ? (
                      <div className="overflow-hidden rounded-lg border border-gray-700">
                        <table className="min-w-full">
                          <thead className="bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Device Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">IP Address</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Deployment Result</th>
                            </tr>
                          </thead>
                          <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                            {deploymentDevices.map((device, index) => (
                              <tr key={index} className="hover:bg-gray-700/30">
                                <td className="px-4 py-3 text-sm text-white">{device.device_name || device.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-300 font-mono">{device.ip_address}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    device.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {device.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    device.deployment_status === 'success' ? 'bg-green-500/20 text-green-400' :
                                    device.deployment_status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {device.deployment_status || 'pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-gray-700/30 rounded-lg p-6 text-center">
                        <Monitor className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400">No target devices specified</p>
                      </div>
                    )}
                  </div>

                  {/* Target Groups Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-400" />
                      Target Groups ({deploymentGroups.length})
                    </h3>
                    {deploymentGroups.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deploymentGroups.map((group, index) => (
                          <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                            <h4 className="font-medium text-white mb-2">{group.group_name}</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Devices:</span>
                                <span className="text-gray-300">{group.device_count || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Success Rate:</span>
                                <span className="text-green-400">{group.success_rate || '0%'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-700/30 rounded-lg p-6 text-center">
                        <Users className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400">No target groups specified</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeploymentModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  onClick={() => {
                    // Could add functionality to re-run deployment or view logs
                    console.log('View deployment logs for:', selectedDeployment?.id);
                  }}
                >
                  View Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Devices Modal */}
      {showGroupDevicesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-6xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Devices in {selectedGroup?.name}
                </h2>
                <p className="text-gray-400 mt-1">
                  {groupDevices.length} device{groupDevices.length !== 1 ? 's' : ''} found in this group
                </p>
              </div>
              <button
                onClick={() => setShowGroupDevicesModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              {loadingGroupDevices ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-400">Loading devices...</span>
                </div>
              ) : groupDevices.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-gray-700">
                  <table className="min-w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Device Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          IP Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Operating System
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Last Seen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                      {groupDevices.map((device) => (
                        <tr key={device.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Monitor className="h-5 w-5 text-blue-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {device.device_name || device.name || 'Unknown Device'}
                                </div>
                                <div className="text-sm text-gray-400">
                                  ID: {device.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300 font-mono">
                              {device.ip_address || 'N/A'}
                            </div>
                            {device.mac_address && (
                              <div className="text-xs text-gray-500 font-mono">
                                MAC: {device.mac_address}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              device.status === 'online' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : device.status === 'offline'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-1.5 ${
                                device.status === 'online' 
                                  ? 'bg-green-400 animate-pulse' 
                                  : device.status === 'offline'
                                  ? 'bg-red-400'
                                  : 'bg-yellow-400'
                              }`}></div>
                              {device.status?.charAt(0).toUpperCase() + device.status?.slice(1) || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {device.os || 'Unknown OS'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {device.last_seen 
                              ? new Date(device.last_seen).toLocaleString()
                              : 'Never seen'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Server className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No devices found</h3>
                  <p className="text-gray-500">This group doesn't contain any devices yet.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowGroupDevicesModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Edit Modal */}
      {showGroupEditModal && editingGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/90 border border-electricBlue/30 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-electricBlue">Edit Group</h2>
              <p className="text-gray-400">Modify group details and device assignments</p>
            </div>
            <GroupForm
              initialData={editingGroup}
              devices={devicesData}
              onSubmit={handleUpdateGroup}
              onCancel={closeGroupEditModal}
            />
          </div>
        </div>
      )}

      {/* Group Create Modal */}
      {showGroupCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/90 border border-electricBlue/30 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-electricBlue">Create New Group</h2>
              <p className="text-gray-400">Create a new device group and assign devices</p>
            </div>
            <GroupForm
              initialData={null}
              devices={devicesData}
              onSubmit={handleCreateGroup}
              onCancel={closeGroupCreateModal}
            />
          </div>
        </div>
      )}

      {/* Username Change Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <UsernameModal onClose={() => setShowUsernameModal(false)} />
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <PasswordModal onClose={() => setShowPasswordModal(false)} />
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <EmailModal onClose={() => setShowEmailModal(false)} />
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <DeleteAccountModal onClose={() => setShowDeleteAccountModal(false)} />
        </div>
      )}
    </div>
  );
}
