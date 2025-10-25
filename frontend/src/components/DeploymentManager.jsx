import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Settings,
  Terminal,
  Command,
  Layers,
  ChevronDown,
  ChevronRight,
  Calendar
} from 'lucide-react';
import io from 'socket.io-client';
import SnapshotManager from './SnapshotManager';
import SchedulingModal from './SchedulingModal';
import groupsService from '../services/groups';
import devicesService from '../services/devices';
import authService from '../services/auth';
import schedulingService from '../services/scheduling';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

const DEPLOYMENT_STRATEGIES = [
  { value: 'snapshot', label: 'Snapshot Rollback', icon: '�', description: 'Creates system snapshots before each command for easy rollback' }
];

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-yellow-400" />,
  running: <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />,
  completed: <CheckCircle className="w-4 h-4 text-green-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
  paused: <Pause className="w-4 h-4 text-orange-400" />
};

const STATUS_COLORS = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  paused: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
};

export default function DeploymentManager({ 
  agents = [], 
  currentAgent, 
  onSelectAgent, 
  shells = [], 
  currentShell, 
  onSelectShell,
  isConnected = false,
  connectionError = null
}) {
  console.log('DeploymentManager: Received agents:', agents);
  console.log('DeploymentManager: Current agent:', currentAgent);
  const [commands, setCommands] = useState([]);
  const [newCommand, setNewCommand] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('snapshot');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, running: 0, completed: 0, failed: 0, paused: 0 });
  const [batchMode, setBatchMode] = useState(false);
  const [batchCommands, setBatchCommands] = useState(['']);
  
  // Groups state
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  
  // Devices state (for matching with group devices)
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  
  // Available shells based on group selection
  const [availableShells, setAvailableShells] = useState([]);
  
  // Common shells as fallback
  const commonShells = ['cmd', 'powershell', 'bash', 'sh'];
  
  // Expanded group executions state
  const [expandedExecutions, setExpandedExecutions] = useState(new Set());

  // Scheduling state
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingData, setSchedulingData] = useState(null);

  // Load groups
  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await groupsService.fetchGroups();
      setGroups(response || []);
      console.log('DeploymentManager: Loaded groups:', response);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Load devices
  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await devicesService.fetchDevices();
      setDevices(response || []);
      console.log('DeploymentManager: Loaded devices:', response);
      return response || [];
    } catch (error) {
      console.error('Failed to load devices:', error);
      return [];
    } finally {
      setLoadingDevices(false);
    }
  };

  // Update available shells when groups are selected
  useEffect(() => {
    if (selectedGroups.length > 0 && devices.length > 0) {
      console.log('DeploymentManager: Updating shells for selected groups');
      console.log('Selected groups:', selectedGroups);
      console.log('Available devices:', devices);
      
      // Get all unique shells from devices in selected groups
      const shellsSet = new Set();
      selectedGroups.forEach(groupId => {
        const group = groups.find(g => g.id === groupId);
        console.log(`Group ${groupId}:`, group);
        
        if (group && group.devices) {
          group.devices.forEach(groupDevice => {
            const device = devices.find(d => 
              d.id === groupDevice.id || 
              d.id === groupDevice.device_id ||
              d.device_id === groupDevice.id
            );
            
            console.log('Group device:', groupDevice);
            console.log('Found device:', device);
            
            if (device) {
              if (device.shells && Array.isArray(device.shells) && device.shells.length > 0) {
                device.shells.forEach(shell => shellsSet.add(shell));
              } else {
                // Use OS-based defaults if device doesn't have shells field
                if (device.os && device.os.toLowerCase().includes('windows')) {
                  shellsSet.add('cmd');
                  shellsSet.add('powershell');
                } else {
                  shellsSet.add('bash');
                  shellsSet.add('sh');
                }
              }
            }
          });
        }
      });
      
      let uniqueShells = Array.from(shellsSet);
      
      // If no shells found, use common shells as fallback
      if (uniqueShells.length === 0) {
        console.log('No shells found in devices, using common shells');
        uniqueShells = commonShells;
      }
      
      setAvailableShells(uniqueShells);
      console.log('Available shells for selected groups:', uniqueShells);
    } else if (selectedGroups.length > 0) {
      // If groups are selected but devices not loaded yet, use common shells
      console.log('Groups selected but devices not loaded, using common shells');
      setAvailableShells(commonShells);
    } else {
      setAvailableShells([]);
    }
  }, [selectedGroups, groups, devices]);

  useEffect(() => {
    loadGroups();
    loadDevices();
  }, []);

  useEffect(() => {
    // Initialize socket.io connection
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
      timeout: 20000,  // Connection timeout: 20 seconds
      pingTimeout: 60000,  // Ping timeout: 60 seconds
      pingInterval: 25000  // Ping every 25 seconds
    });
    setSocket(newSocket);

    // Listen for real-time deployment updates
    newSocket.on('deployment_command_output', (data) => {
      updateCommandOutput(data.command_id, data.output);
    });

    newSocket.on('deployment_command_completed', (data) => {
      updateCommandStatus(data.command_id, data.success ? 'completed' : 'failed', data.output, data.error);
    });

    // Listen for new commands added to queue
    newSocket.on('command_queue_updated', (data) => {
      console.log('Command queue updated:', data);
      loadCommands(); // Reload the entire command list
    });

    // Load initial data
    loadCommands();
    loadStats();

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const updateCommandOutput = (commandId, output) => {
    setCommands(prev => {
      const existingCmd = prev.find(cmd => cmd.id === commandId);
      if (existingCmd) {
        // Update existing command
        return prev.map(cmd => 
          cmd.id === commandId 
            ? { ...cmd, output: (cmd.output || '') + output }
            : cmd
        );
      } else {
        // Command doesn't exist yet, fetch it from server
        loadCommands();
        return prev;
      }
    });
  };

  const updateCommandStatus = (commandId, status, output, error) => {
    setCommands(prev => {
      const existingCmd = prev.find(cmd => cmd.id === commandId);
      if (existingCmd) {
        // Update existing command
        return prev.map(cmd => 
          cmd.id === commandId 
            ? { 
                ...cmd, 
                status, 
                output: output || cmd.output,
                error: error || cmd.error,
                completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : cmd.completed_at
              }
            : cmd
        );
      } else {
        // Command doesn't exist yet, fetch it from server
        loadCommands();
        return prev;
      }
    });
    loadStats(); // Refresh stats
  };

  const loadCommands = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployment/commands`);
      if (response.ok) {
        const data = await response.json();
        setCommands(data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    } catch (error) {
      console.error('Error loading commands:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployment/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Scheduling functions
  const openSchedulingModal = async () => {
    const hasTarget = currentAgent || selectedGroups.length > 0;
    if (!hasTarget) {
      alert('Please select an agent or group first');
      return;
    }

    // Ensure devices are loaded before trying to schedule
    let devicesToUse = devices;
    if (devices.length === 0) {
      console.log('Devices not loaded, loading now...');
      try {
        devicesToUse = await loadDevices();
        console.log('Devices loaded:', devicesToUse);
      } catch (error) {
        console.error('Failed to load devices:', error);
        alert('Failed to load devices. Please try again.');
        return;
      }
    }

    openSchedulingModalWithDevices(devicesToUse);
  };

  const openSchedulingModalWithDevices = (devicesToUse = devices) => {
    // Get device IDs from groups or use current agent
    let deviceIds = [];
    if (currentAgent && !selectedGroups.length) {
      console.log('Looking for device with agent_id:', currentAgent);
      console.log('Available devices from DB:', devicesToUse);
      console.log('Available agents (connected):', agents);
      
      // First check if the agent is actually connected
      const connectedAgent = agents.find(a => a.agent_id === currentAgent);
      if (!connectedAgent) {
        console.error('CRITICAL: Agent is not connected:', currentAgent);
        alert(`Cannot schedule: Agent ${currentAgent} is not connected. Please select a connected agent.`);
        return;
      }
      
      // First try to find in devices array (from database)
      let device = devicesToUse.find(d => d.agent_id === currentAgent);
      
      // If not found in devices, try matching by other fields from the agents list
      if (!device && agents.length > 0) {
        const agent = agents.find(a => a.agent_id === currentAgent);
        console.log('Found agent in connected agents:', agent);
        
        if (agent && devicesToUse.length > 0) {
          // Try matching by hostname (agent.hostname should match device.device_name)
          device = devicesToUse.find(d => 
            d.device_name === agent.hostname
          );
        }
      }
      
      console.log('Final found device:', device);
      
      if (device) {
        deviceIds = [device.id];
      } else {
        // Device not found - reload devices and show error
        console.error('CRITICAL: Device not found for agent_id:', currentAgent);
        alert(`Cannot schedule: Device not found in database for agent ${currentAgent}. Please wait for the agent to fully register or select a different agent.`);
        loadDevices(); // Reload devices to refresh the list
        return;
      }
    }

    const taskData = {
      device_ids: deviceIds,
      group_ids: selectedGroups,
      command_payload: batchMode 
        ? {
            commands: batchCommands.filter(cmd => cmd.trim()),
            shell: currentShell || 'cmd',
            stop_on_failure: true
          }
        : {
            command: newCommand,
            shell: currentShell || 'cmd',
            strategy: selectedStrategy
          }
    };

    console.log('DeploymentManager - Opening scheduling modal with data:', {
      currentAgent,
      deviceIds,
      selectedGroups,
      taskData
    });

    const targetInfo = selectedGroups.length > 0 
      ? `${selectedGroups.length} groups selected`
      : `Agent: ${currentAgent}`;

    setSchedulingData({ taskData, targetInfo });
    setShowSchedulingModal(true);
  };

  const handleSchedule = async (schedulePayload) => {
    try {
      await schedulingService.createScheduledTask(schedulePayload);
      alert('Command scheduled successfully!');
      setShowSchedulingModal(false);
    } catch (error) {
      console.error('Scheduling error:', error);
      throw error;
    }
  };

  const handleExecuteNow = async () => {
    setShowSchedulingModal(false);
    if (batchMode) {
      await executeBatchCommands();
    } else {
      await executeCommand();
    }
  };

  const executeCommand = async () => {
    const hasTarget = currentAgent || selectedGroups.length > 0;
    if (!newCommand.trim() || !hasTarget || !isConnected) {
      const message = !isConnected ? 'Backend connection required' : 
                     !hasTarget ? 'Please select an agent or group' : 'Please enter a command';
      alert(message);
      return;
    }

    setIsLoading(true);
    try {
      // Get authentication token
      const token = authService.getToken() || 
                    localStorage.getItem('access_token') || 
                    sessionStorage.getItem('access_token');
      
      // If groups are selected, use the group command execution API
      if (selectedGroups.length > 0) {
        // Execute command on each selected group using the group API
        for (const groupId of selectedGroups) {
          const response = await fetch(`${API_BASE_URL}/groups/${groupId}/commands`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              command: newCommand,
              shell: currentShell || 'cmd',
              strategy: selectedStrategy,
              config: {}
            })
          });

          if (response.ok) {
            const execution = await response.json();
            console.log(`Group ${groupId} execution started:`, execution.execution_id);
            // Reload commands immediately to show new queue entries
            loadCommands();
          } else {
            const error = await response.json();
            alert(`Error executing on group ${groupId}: ${error.detail || 'Unknown error'}`);
          }
        }
      } else {
        // Execute command on single agent
        const response = await fetch(`${API_BASE_URL}/api/deployment/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: newCommand,
            agent_id: currentAgent,
            shell: currentShell || 'cmd',
            strategy: selectedStrategy
          })
        });

        if (response.ok) {
          const newCmd = await response.json();
          setCommands(prev => [newCmd, ...prev]);
        }
      }
      
      setNewCommand('');
      loadStats();
    } catch (error) {
      console.error('Error executing command:', error);
      alert('Error executing command: ' + error.message);
    }
    setIsLoading(false);
  };

  const getTargetAgentsFromGroups = () => {
    const targetAgents = [];
    console.log('Selected groups:', selectedGroups);
    console.log('All groups:', groups);
    console.log('All devices:', devices);
    console.log('Online agents (from props):', agents);
    
    selectedGroups.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      console.log(`Processing group ${groupId}:`, group);
      
      if (group && group.devices) {
        console.log(`Group devices:`, group.devices);
        
        group.devices.forEach(groupDevice => {
          console.log(`Checking group device:`, groupDevice);
          
          // The groupDevice itself IS the device with all info
          // It has agent_id field directly
          const agentId = groupDevice.agent_id;
          
          console.log(`Agent ID from group device: ${agentId}`);
          
          if (agentId) {
            // Check if this agent is online
            const isOnline = agents.find(a => a.agent_id === agentId);
            
            console.log(`Is agent ${agentId} online:`, !!isOnline);
            
            if (isOnline && !targetAgents.includes(agentId)) {
              targetAgents.push(agentId);
              console.log(`Added agent ${agentId} to target list`);
            } else if (!isOnline) {
              console.log(`Agent ${agentId} is not online (status: ${groupDevice.status})`);
            }
          } else {
            console.log(`No agent_id found for device:`, groupDevice);
          }
        });
      }
    });
    
    console.log('Final target agents:', targetAgents);
    return targetAgents;
  };

  const executeBatchCommands = async () => {
    const validCommands = batchCommands.filter(cmd => cmd.trim());
    const hasTarget = currentAgent || selectedGroups.length > 0;
    if (validCommands.length === 0 || !hasTarget || !isConnected) {
      const message = !isConnected ? 'Backend connection required' : 
                     !hasTarget ? 'Please select an agent or group' : 'Please enter commands';
      alert(message);
      return;
    }

    setIsLoading(true);
    try {
      // Get authentication token
      const token = authService.getToken() || 
                    localStorage.getItem('access_token') || 
                    sessionStorage.getItem('access_token');
      
      // If groups are selected, use the group batch command API
      if (selectedGroups.length > 0) {
        console.log('Executing batch commands on groups:', selectedGroups);
        console.log('Commands to execute:', validCommands);
        
        // Execute batch commands on each selected group using the group API
        for (const groupId of selectedGroups) {
          console.log(`Sending batch request to group ${groupId} with ${validCommands.length} commands`);
          
          const response = await fetch(`${API_BASE_URL}/groups/${groupId}/commands/batch/sequential`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              commands: validCommands,
              shell: currentShell || 'cmd',
              stop_on_failure: true,
              config: {}
            })
          });

          if (response.ok) {
            const batch = await response.json();
            console.log(`Group ${groupId} batch execution started:`, batch);
            // Reload commands immediately to show new queue entries
            loadCommands();
          } else {
            const error = await response.json();
            console.error(`Error executing batch on group ${groupId}:`, error);
            alert(`Error executing batch on group ${groupId}: ${error.detail || 'Unknown error'}`);
          }
        }
      } else {
        // Execute batch commands on single agent
        const response = await fetch(`${API_BASE_URL}/api/deployment/commands/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commands: validCommands,
            agent_id: currentAgent,
            shell: currentShell || 'cmd',
            strategy: selectedStrategy
          })
        });

        if (response.ok) {
          const newCommands = await response.json();
          setCommands(prev => [...newCommands, ...prev]);
        }
      }
      
      setBatchCommands(['']);
      setBatchMode(false);
      loadStats();
    } catch (error) {
      console.error('Error executing batch commands:', error);
      alert('Error executing batch commands: ' + error.message);
    }
    setIsLoading(false);
  };

  const pauseCommand = async (cmdId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployment/commands/${cmdId}/pause`, { method: 'POST' });
      if (response.ok) {
        setCommands(prev => prev.map(cmd => 
          cmd.id === cmdId ? { ...cmd, status: 'paused' } : cmd
        ));
        loadStats();
      }
    } catch (error) {
      console.error('Error pausing command:', error);
    }
  };

  const resumeCommand = async (cmdId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/deployment/commands/${cmdId}/resume`, { method: 'POST' });
      if (response.ok) {
        setCommands(prev => prev.map(cmd => 
          cmd.id === cmdId ? { ...cmd, status: 'pending' } : cmd
        ));
        loadStats();
      }
    } catch (error) {
      console.error('Error resuming command:', error);
    }
  };

  const deleteCommand = async (cmdId) => {
    if (!confirm('Are you sure you want to delete this command?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/deployment/commands/${cmdId}`, { method: 'DELETE' });
      if (response.ok) {
        setCommands(prev => prev.filter(cmd => cmd.id !== cmdId));
        loadStats();
      }
    } catch (error) {
      console.error('Error deleting command:', error);
    }
  };

  const clearCompleted = async () => {
    if (!confirm('Clear all completed and failed commands?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/deployment/commands/completed`, { method: 'DELETE' });
      if (response.ok) {
        loadCommands();
        loadStats();
      }
    } catch (error) {
      console.error('Error clearing commands:', error);
    }
  };

  const addBatchCommand = () => {
    setBatchCommands(prev => [...prev, '']);
  };

  const updateBatchCommand = (index, value) => {
    setBatchCommands(prev => prev.map((cmd, i) => i === index ? value : cmd));
  };

  const removeBatchCommand = (index) => {
    setBatchCommands(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to group commands by execution_id
  const groupCommandsByExecution = (commands) => {
    const grouped = {};
    const standalone = [];

    console.log('Grouping commands:', commands.length);

    commands.forEach(cmd => {
      const executionId = cmd.config?.execution_id;
      const isGroupExecution = cmd.config?.group_execution;

      console.log('Command:', cmd.id, 'isGroup:', isGroupExecution, 'execId:', executionId);

      if (isGroupExecution && executionId) {
        if (!grouped[executionId]) {
          grouped[executionId] = {
            execution_id: executionId,
            group_name: cmd.config?.group_name || 'Unknown Group',
            command: cmd.command,
            shell: cmd.shell,
            strategy: cmd.strategy,
            timestamp: cmd.timestamp,
            commands: []
          };
        }
        grouped[executionId].commands.push(cmd);
      } else {
        standalone.push(cmd);
      }
    });

    console.log('Grouped executions:', Object.keys(grouped).length);
    console.log('Standalone commands:', standalone.length);

    return { grouped: Object.values(grouped), standalone };
  };

  // Toggle expansion for a group execution
  const toggleExecution = (executionId) => {
    console.log('Toggling execution:', executionId);
    console.log('Current expanded:', expandedExecutions);
    setExpandedExecutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(executionId)) {
        newSet.delete(executionId);
        console.log('Collapsed:', executionId);
      } else {
        newSet.add(executionId);
        console.log('Expanded:', executionId);
      }
      console.log('New expanded set:', newSet);
      return newSet;
    });
  };

  // Calculate stats for a group execution
  const getExecutionStats = (commands) => {
    const total = commands.length;
    const completed = commands.filter(c => c.status === 'completed').length;
    const failed = commands.filter(c => c.status === 'failed').length;
    const running = commands.filter(c => c.status === 'running').length;
    const pending = commands.filter(c => c.status === 'pending').length;

    return { total, completed, failed, running, pending };
  };

  return (
    <div className="space-y-6">
      {/* Connection Error */}
      {connectionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Connection Error</span>
          </div>
          <p className="text-red-300 mt-1">{connectionError}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(stats).map(([status, count]) => (
          <div key={status} className="card-dark text-center">
            <div className="text-2xl font-bold text-white mb-1">{count}</div>
            <div className="text-sm text-gray-400 capitalize">{status}</div>
          </div>
        ))}
      </div>

      {/* Command Input */}
      <div className="card-dark">
        {/* Group Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Groups (Optional)</label>
          <select
            value=""
            onChange={(e) => {
              const groupId = parseInt(e.target.value);
              if (groupId && !selectedGroups.includes(groupId)) {
                setSelectedGroups([...selectedGroups, groupId]);
                // Clear single agent selection when group is selected
                if (currentAgent) {
                  onSelectAgent('');
                }
              }
            }}
            disabled={groups.length === 0 || !isConnected}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingGroups ? 'Loading...' : groups.length === 0 ? 'No groups available' : `Select Groups (${groups.length} available)`}
            </option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.group_name} ({group.devices?.length || 0} devices)
              </option>
            ))}
          </select>
          {selectedGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedGroups.map(groupId => {
                const group = groups.find(g => g.id === groupId);
                return group ? (
                  <span key={groupId} className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm">
                    {group.group_name}
                    <button 
                      onClick={() => setSelectedGroups(selectedGroups.filter(id => id !== groupId))}
                      className="hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Agent and Shell Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Agent</label>
            <select
              value={currentAgent || ''}
              onChange={(e) => {
                onSelectAgent(e.target.value);
                // Clear groups when agent is selected
                if (e.target.value && selectedGroups.length > 0) {
                  setSelectedGroups([]);
                }
              }}
              disabled={!isConnected || agents.length === 0 || selectedGroups.length > 0}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!isConnected ? 'Not connected' : agents.length === 0 ? 'No agents available' : 'Select Agent'}
              </option>
              {agents.map(agent => (
                <option key={agent.agent_id || agent} value={agent.agent_id || agent}>
                  {agent.hostname ? `${agent.hostname} (${agent.agent_id})` : (agent.agent_id || agent)}
                </option>
              ))}
            </select>
            {!isConnected && (
              <p className="text-xs text-red-400 mt-1">Backend connection required</p>
            )}
            {selectedGroups.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">Agent selection disabled when groups are selected</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Shell</label>
            <select
              value={currentShell || ''}
              onChange={(e) => onSelectShell(e.target.value)}
              disabled={!isConnected || (!currentAgent && selectedGroups.length === 0)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!isConnected ? 'Not connected' : 
                 (!currentAgent && selectedGroups.length === 0) ? 'Select agent or group first' : 
                 'Select Shell'}
              </option>
              {(selectedGroups.length > 0 ? availableShells : shells).map(shell => (
                <option key={shell} value={shell}>{shell}</option>
              ))}
            </select>
            {selectedGroups.length > 0 && availableShells.length > 0 && (
              <p className="text-xs text-green-400 mt-1">Shells from selected groups ({availableShells.length} available)</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Mode</label>
            <button
              onClick={() => setBatchMode(!batchMode)}
              className={`px-4 py-2 rounded-lg border transition-all ${
                batchMode 
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' 
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Layers className="w-4 h-4 inline mr-2" />
              Batch Mode
            </button>
          </div>
        </div>

        {/* Command Input */}
        {batchMode ? (
          <div className="space-y-4">
            {batchCommands.map((cmd, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={cmd}
                  onChange={(e) => updateBatchCommand(index, e.target.value)}
                  placeholder={`Command ${index + 1}...`}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                />
                {batchCommands.length > 1 && (
                  <button
                    onClick={() => removeBatchCommand(index)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={addBatchCommand}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Command
              </button>
              <button
                onClick={openSchedulingModal}
                disabled={batchCommands.filter(cmd => cmd.trim()).length === 0 || (!currentAgent && selectedGroups.length === 0) || !isConnected}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
              >
                <Calendar className="w-4 h-4" />
                Schedule Batch
              </button>
              <button
                onClick={executeBatchCommands}
                disabled={isLoading || (!currentAgent && selectedGroups.length === 0) || !isConnected}
                className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
              >
                <Play className="w-4 h-4" />
                {isLoading ? 'Executing...' : selectedGroups.length > 0 ? `Execute on Groups (${selectedGroups.length})` : 'Execute Batch'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              placeholder="Enter command..."
              onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            />
            <button
              onClick={openSchedulingModal}
              disabled={!newCommand.trim() || (!currentAgent && selectedGroups.length === 0) || !isConnected}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
            <button
              onClick={executeCommand}
              disabled={isLoading || (!currentAgent && selectedGroups.length === 0) || !isConnected}
              className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
            >
              <Play className="w-4 h-4" />
              {isLoading ? 'Executing...' : selectedGroups.length > 0 ? `Execute on Groups (${selectedGroups.length})` : 'Execute'}
            </button>
          </div>
        )}
      </div>

      {/* Command Queue */}
      <div className="card-dark">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">Command Queue</h3>
            {commands.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                  {commands.filter(c => c.status === 'pending').length} Pending
                </span>
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs font-medium">
                  {commands.filter(c => c.status === 'running').length} Running
                </span>
                <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium">
                  {commands.filter(c => c.status === 'completed').length} Completed
                </span>
                <span className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-medium">
                  {commands.filter(c => c.status === 'failed').length} Failed
                </span>
              </div>
            )}
          </div>
          <button
            onClick={clearCompleted}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear Completed
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {commands.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-lg font-medium mb-1">No commands in queue</div>
              <div className="text-sm">Execute a command to get started</div>
            </div>
          ) : (() => {
            const { grouped, standalone } = groupCommandsByExecution(commands);
            
            return (
              <>
                {/* Grouped Executions */}
                {grouped.map((execution) => {
                  const stats = getExecutionStats(execution.commands);
                  const isExpanded = expandedExecutions.has(execution.execution_id);
                  const hasErrors = stats.failed > 0;
                  const isRunning = stats.running > 0;
                  const isCompleted = stats.completed === stats.total;
                  
                  return (
                    <div key={execution.execution_id} className="bg-gray-800/50 rounded-lg border border-l-4 border-l-purple-500 border-gray-700 overflow-hidden">
                      {/* Group Summary - Clickable */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-800/70 transition-all select-none"
                        onClick={(e) => {
                          console.log('Clicked group execution:', execution.execution_id);
                          toggleExecution(execution.execution_id);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            toggleExecution(execution.execution_id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {/* Header with expand/collapse icon */}
                            <div className="flex items-center gap-3 mb-3">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-purple-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-purple-400 flex-shrink-0" />
                              )}
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                GROUP EXECUTION
                              </span>
                              {isRunning && (
                                <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
                              )}
                              {isCompleted && !hasErrors && (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                              )}
                              {hasErrors && (
                                <AlertCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            
                            {/* Group Name & Command */}
                            <div className="mb-3">
                              <div className="text-sm text-purple-300 mb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                <span className="font-semibold">{execution.group_name}</span>
                              </div>
                              <code className="text-cyan-400 bg-gray-900 px-3 py-1.5 rounded font-mono text-sm break-all">
                                {execution.command}
                              </code>
                            </div>
                            
                            {/* Stats */}
                            <div className="flex items-center gap-3 text-sm flex-wrap">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/70 rounded">
                                <span className="text-gray-400">Total Agents:</span>
                                <span className="text-white font-semibold">{stats.total}</span>
                              </div>
                              {stats.completed > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded">
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                  <span className="text-green-400 font-semibold">{stats.completed} Completed</span>
                                </div>
                              )}
                              {stats.failed > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded">
                                  <XCircle className="w-4 h-4 text-red-400" />
                                  <span className="text-red-400 font-semibold">{stats.failed} Failed</span>
                                </div>
                              )}
                              {stats.running > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded">
                                  <Clock className="w-4 h-4 text-yellow-400" />
                                  <span className="text-yellow-400 font-semibold">{stats.running} Running</span>
                                </div>
                              )}
                              {stats.pending > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded">
                                  <Clock className="w-4 h-4 text-blue-400" />
                                  <span className="text-blue-400 font-semibold">{stats.pending} Pending</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-400 ml-4">
                            Click to {isExpanded ? 'collapse' : 'expand'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded View - Individual Agent Results */}
                      {isExpanded && (
                        <div className="border-t border-gray-700 bg-gray-900/30">
                          <div className="p-4 space-y-3">
                            <div className="text-sm text-gray-400 mb-3 font-semibold">
                              Individual Agent Results:
                            </div>
                            {execution.commands.map((cmd) => {
                              const executionTime = cmd.completed_at && cmd.started_at 
                                ? ((new Date(cmd.completed_at) - new Date(cmd.started_at)) / 1000).toFixed(2) 
                                : null;
                              
                              return (
                                <div key={cmd.id} className="bg-gray-800/70 rounded-lg p-3 border border-gray-700">
                                  {/* Agent Header */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {STATUS_ICONS[cmd.status]}
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[cmd.status]}`}>
                                        {cmd.status.toUpperCase()}
                                      </span>
                                      <span className="text-white font-mono text-sm">{cmd.agent_id}</span>
                                      {executionTime && (
                                        <span className="text-xs text-gray-400">
                                          ⏱ {executionTime}s
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteCommand(cmd.id);
                                      }}
                                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  
                                  {/* Output */}
                                  {cmd.output && (
                                    <div className="mt-2">
                                      <div className="text-xs text-gray-400 mb-1">Output:</div>
                                      <pre className="bg-gray-900 p-2 rounded text-xs text-green-400 max-h-32 overflow-y-auto font-mono border border-gray-800 custom-scrollbar">
{cmd.output}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {/* Error */}
                                  {cmd.error && (
                                    <div className="mt-2">
                                      <div className="text-xs text-red-400 mb-1">Error:</div>
                                      <pre className="bg-red-900/20 border border-red-500/30 p-2 rounded text-xs text-red-400 font-mono">
{cmd.error}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {/* Timestamps */}
                                  <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
                                    <span>Started: {cmd.started_at ? new Date(cmd.started_at).toLocaleTimeString() : 'Pending'}</span>
                                    {cmd.completed_at && (
                                      <span>Completed: {new Date(cmd.completed_at).toLocaleTimeString()}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Standalone Commands (Non-Group) */}
                {standalone.map((cmd) => {
              const isGroupExecution = cmd.config?.group_execution;
              const groupName = cmd.config?.group_name;
              const executionTime = cmd.completed_at && cmd.started_at 
                ? ((new Date(cmd.completed_at) - new Date(cmd.started_at)) / 1000).toFixed(2) 
                : null;
              
              return (
                <div 
                  key={cmd.id} 
                  className={`bg-gray-800/50 rounded-lg p-4 border transition-all hover:border-gray-600 ${
                    isGroupExecution ? 'border-l-4 border-l-purple-500' : 'border-gray-700'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {STATUS_ICONS[cmd.status]}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[cmd.status]}`}>
                          {cmd.status.toUpperCase()}
                        </span>
                        {isGroupExecution && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            GROUP
                          </span>
                        )}
                        {executionTime && (
                          <span className="text-xs text-gray-400">
                            ⏱ {executionTime}s
                          </span>
                        )}
                      </div>
                      
                      {/* Command */}
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-cyan-400 bg-gray-900 px-3 py-1.5 rounded font-mono text-sm break-all">
                          {cmd.command}
                        </code>
                      </div>
                      
                      {/* Group Info */}
                      {isGroupExecution && groupName && (
                        <div className="text-sm text-purple-300 mb-2">
                          📦 Group: <span className="font-semibold">{groupName}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 ml-4">
                      {cmd.status === 'running' && (
                        <button
                          onClick={() => pauseCommand(cmd.id)}
                          className="p-2 text-orange-400 hover:bg-orange-500/20 rounded transition-all"
                          title="Pause Command"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      )}
                      {cmd.status === 'paused' && (
                        <button
                          onClick={() => resumeCommand(cmd.id)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                          title="Resume Command"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteCommand(cmd.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-all"
                        title="Delete Command"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-3 bg-gray-900/50 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🖥️ Agent:</span>
                      <span className="text-white font-mono text-xs truncate" title={cmd.agent_id}>
                        {cmd.agent_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">💻 Shell:</span>
                      <span className="text-cyan-300 font-medium">{cmd.shell}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">⚙️ Strategy:</span>
                      <span className="text-blue-300 font-medium">{cmd.strategy}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">🕐 Started:</span>
                      <span className="text-white">
                        {cmd.started_at ? new Date(cmd.started_at).toLocaleTimeString() : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Output */}
                  {cmd.output && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <span>📤 Output:</span>
                        <span className="text-xs text-gray-500">
                          ({cmd.output.split('\n').length} lines)
                        </span>
                      </div>
                      <pre className="bg-gray-900 p-3 rounded text-sm text-green-400 max-h-40 overflow-y-auto font-mono border border-gray-800 custom-scrollbar">
{cmd.output}
                      </pre>
                    </div>
                  )}

                  {/* Error */}
                  {cmd.error && (
                    <div className="mt-3">
                      <div className="text-sm text-red-400 mb-2 flex items-center gap-2">
                        <span>❌ Error:</span>
                      </div>
                      <pre className="bg-red-900/20 border border-red-500/30 p-3 rounded text-sm text-red-400 font-mono">
{cmd.error}
                      </pre>
                    </div>
                  )}
                  
                  {/* Completed Timestamp */}
                  {cmd.completed_at && (
                    <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                      ✅ Completed at {new Date(cmd.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
              </>
            );
          })()}
        </div>
      </div>

      {/* Snapshot Manager */}
      <SnapshotManager 
        socket={socket} 
        selectedAgent={currentAgent}
        isConnected={isConnected}
      />

      {/* Scheduling Modal */}
      {showSchedulingModal && (
        <SchedulingModal
          isOpen={showSchedulingModal}
          onClose={() => setShowSchedulingModal(false)}
          onSchedule={handleSchedule}
          onExecuteNow={handleExecuteNow}
          taskType="command"
          taskData={schedulingData?.taskData}
          targetInfo={schedulingData?.targetInfo}
        />
      )}
    </div>
  );
}