import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
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

const DEPLOYMENT_STRATEGIES = [
  { value: 'transactional', label: 'Transactional', icon: '🔄', description: 'Package manager transactions with rollback' },
  { value: 'blue_green', label: 'Blue-Green', icon: '🔵', description: 'Zero-downtime deployments' },
  { value: 'snapshot', label: 'Snapshot', icon: '📸', description: 'System snapshots for critical changes' },
  { value: 'canary', label: 'Canary', icon: '🐤', description: 'Gradual rollout with monitoring' }
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
  const [selectedStrategy, setSelectedStrategy] = useState('transactional');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, running: 0, completed: 0, failed: 0, paused: 0 });
  const [batchMode, setBatchMode] = useState(false);
  const [batchCommands, setBatchCommands] = useState(['']);

  // API base URL - adjust as needed
  const API_BASE = 'https://deployx-server.onrender.com/api/deployment';

  useEffect(() => {
    // Initialize socket.io connection
    const newSocket = io('https://deployx-server.onrender.com');
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
      const response = await fetch(`${API_BASE}/commands`);
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
      const response = await fetch(`${API_BASE}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const executeCommand = async () => {
    if (!newCommand.trim() || !currentAgent || !isConnected) {
      const message = !isConnected ? 'Backend connection required' : 
                     !currentAgent ? 'Please select an agent' : 'Please enter a command';
      alert(message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/commands`, {
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
        setNewCommand('');
        loadStats();
      } else {
        alert('Failed to execute command');
      }
    } catch (error) {
      console.error('Error executing command:', error);
      alert('Error executing command: ' + error.message);
    }
    setIsLoading(false);
  };

  const executeBatchCommands = async () => {
    const validCommands = batchCommands.filter(cmd => cmd.trim());
    if (validCommands.length === 0 || !currentAgent || !isConnected) {
      const message = !isConnected ? 'Backend connection required' : 
                     !currentAgent ? 'Please select an agent' : 'Please enter commands';
      alert(message);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/commands/batch`, {
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
        setBatchCommands(['']);
        setBatchMode(false);
        loadStats();
      } else {
        alert('Failed to execute batch commands');
      }
    } catch (error) {
      console.error('Error executing batch commands:', error);
      alert('Error executing batch commands: ' + error.message);
    }
    setIsLoading(false);
  };

  const pauseCommand = async (cmdId) => {
    try {
      const response = await fetch(`${API_BASE}/commands/${cmdId}/pause`, { method: 'POST' });
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
      const response = await fetch(`${API_BASE}/commands/${cmdId}/resume`, { method: 'POST' });
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

  const rollbackCommand = async (cmdId) => {
    if (!confirm('Are you sure you want to rollback this command?')) return;

    try {
      const response = await fetch(`${API_BASE}/commands/${cmdId}/rollback`, { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        loadCommands(); // Reload to show rollback command
        loadStats();
      }
    } catch (error) {
      console.error('Error rolling back command:', error);
    }
  };

  const deleteCommand = async (cmdId) => {
    if (!confirm('Are you sure you want to delete this command?')) return;

    try {
      const response = await fetch(`${API_BASE}/commands/${cmdId}`, { method: 'DELETE' });
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
      const response = await fetch(`${API_BASE}/commands/completed`, { method: 'DELETE' });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Command className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Deployment Manager</h2>
            <p className="text-gray-400">Execute commands with deployment strategies and rollback capabilities</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          </div>
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
          <button
            onClick={loadCommands}
            className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

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
        <div className="flex items-center gap-3 mb-4">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-white">
            {batchMode ? 'Batch Command Execution' : 'Command Execution'}
          </h3>
        </div>

        {/* Agent and Shell Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Agent</label>
            <select
              value={currentAgent || ''}
              onChange={(e) => onSelectAgent(e.target.value)}
              disabled={!isConnected || agents.length === 0}
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Shell</label>
            <select
              value={currentShell || ''}
              onChange={(e) => onSelectShell(e.target.value)}
              disabled={!isConnected || !currentAgent || shells.length === 0}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {!isConnected ? 'Not connected' : !currentAgent ? 'Select agent first' : shells.length === 0 ? 'No shells available' : 'Select Shell'}
              </option>
              {shells.map(shell => (
                <option key={shell} value={shell}>{shell}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
            >
              {DEPLOYMENT_STRATEGIES.map(strategy => (
                <option key={strategy.value} value={strategy.value}>
                  {strategy.icon} {strategy.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Strategy Description */}
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400">
            <strong className="text-white">Selected Strategy:</strong> {' '}
            {DEPLOYMENT_STRATEGIES.find(s => s.value === selectedStrategy)?.description}
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
                disabled={isLoading || !currentAgent || !isConnected}
                className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
              >
                <Play className="w-4 h-4" />
                {isLoading ? 'Executing...' : 'Execute Batch'}
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
              disabled={isLoading || !currentAgent || !isConnected}
              className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-all"
            >
              <Play className="w-4 h-4" />
              {isLoading ? 'Executing...' : 'Execute'}
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
                    {cmd.status === 'completed' && (
                      <button
                        onClick={() => rollbackCommand(cmd.id)}
                        className="p-1 text-yellow-400 hover:bg-yellow-500/20 rounded transition-all"
                        title="Rollback"
                      >
                        <RotateCcw className="w-4 h-4" />
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
    </div>
  );
}