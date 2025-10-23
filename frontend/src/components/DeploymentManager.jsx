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
  Layers
} from 'lucide-react';
import io from 'socket.io-client';
import SnapshotManager from './SnapshotManager';
import groupsService from '../services/groups';
import devicesService from '../services/devices';

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
    } catch (error) {
      console.error('Failed to load devices:', error);
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

    // Load initial data
    loadCommands();
    loadStats();

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const updateCommandOutput = (commandId, output) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === commandId 
        ? { ...cmd, output: (cmd.output || '') + output }
        : cmd
    ));
  };

  const updateCommandStatus = (commandId, status, output, error) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === commandId 
        ? { 
            ...cmd, 
            status, 
            output: output || cmd.output,
            error: error || cmd.error,
            completed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : cmd.completed_at
          }
        : cmd
    ));
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
      // Get target agents from groups if groups are selected
      const targetAgents = selectedGroups.length > 0 
        ? getTargetAgentsFromGroups() 
        : [currentAgent];

      if (targetAgents.length === 0) {
        alert('No online agents found in selected groups');
        setIsLoading(false);
        return;
      }

      // Execute command on all target agents
      for (const agentId of targetAgents) {
        const response = await fetch(`${API_BASE_URL}/api/deployment/commands`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: newCommand,
            agent_id: agentId,
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
      // Get target agents from groups if groups are selected
      const targetAgents = selectedGroups.length > 0 
        ? getTargetAgentsFromGroups() 
        : [currentAgent];

      if (targetAgents.length === 0) {
        alert('No online agents found in selected groups');
        setIsLoading(false);
        return;
      }

      // Execute batch commands on all target agents
      for (const agentId of targetAgents) {
        const response = await fetch(`${API_BASE_URL}/api/deployment/commands/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commands: validCommands,
            agent_id: agentId,
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
          <h3 className="text-lg font-semibold text-white">Command Queue</h3>
          <button
            onClick={clearCompleted}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-all text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear Completed
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {commands.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No commands in queue. Execute a command to get started.
            </div>
          ) : (
            commands.map((cmd) => (
              <div key={cmd.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[cmd.status]}
                    <code className="text-cyan-400 bg-gray-900 px-2 py-1 rounded text-sm">
                      {cmd.command}
                    </code>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[cmd.status]}`}>
                      {cmd.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cmd.status === 'running' && (
                      <button
                        onClick={() => pauseCommand(cmd.id)}
                        className="p-1 text-orange-400 hover:bg-orange-500/20 rounded transition-all"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    {cmd.status === 'paused' && (
                      <button
                        onClick={() => resumeCommand(cmd.id)}
                        className="p-1 text-blue-400 hover:bg-blue-500/20 rounded transition-all"
                        title="Resume"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteCommand(cmd.id)}
                      className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-400">Agent:</span>
                    <span className="text-white ml-2">{cmd.agent_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Shell:</span>
                    <span className="text-white ml-2">{cmd.shell}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Strategy:</span>
                    <span className="text-white ml-2">{cmd.strategy}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Started:</span>
                    <span className="text-white ml-2">
                      {cmd.started_at ? new Date(cmd.started_at).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>

                {cmd.output && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-400 mb-2">Output:</div>
                    <pre className="bg-gray-900 p-3 rounded text-sm text-green-400 max-h-32 overflow-y-auto">
                      {cmd.output}
                    </pre>
                  </div>
                )}

                {cmd.error && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-400 mb-2">Error:</div>
                    <pre className="bg-red-900/20 border border-red-500/30 p-3 rounded text-sm text-red-400">
                      {cmd.error}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Snapshot Manager */}
      <SnapshotManager 
        socket={socket} 
        selectedAgent={currentAgent}
        isConnected={isConnected}
      />
    </div>
  );
}