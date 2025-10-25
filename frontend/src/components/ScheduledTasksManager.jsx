import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Search,
  Eye,
  MoreVertical,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import schedulingService from '../services/scheduling';

const STATUS_CONFIG = {
  pending: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Clock },
  running: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: RefreshCw },
  completed: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle },
  failed: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle },
  cancelled: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: XCircle },
  paused: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: Pause }
};

const TASK_TYPE_LABELS = {
  command: 'Command',
  software_deployment: 'Software',
  file_deployment: 'File'
};

export default function ScheduledTasksManager() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedTask, setExpandedTask] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadTasks();
    loadStats();
  }, [statusFilter, typeFilter]);

  const loadTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.task_type = typeFilter;
      
      const data = await schedulingService.getTasks(params);
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await schedulingService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handlePause = async (taskId) => {
    try {
      await schedulingService.pauseTask(taskId);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResume = async (taskId) => {
    try {
      await schedulingService.resumeTask(taskId);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExecuteNow = async (taskId) => {
    try {
      await schedulingService.executeTaskNow(taskId);
      setError('');
      alert('Task execution started!');
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Are you sure you want to delete this scheduled task?')) return;
    
    try {
      await schedulingService.deleteTask(taskId);
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredTasks = tasks.filter(task =>
    task.task_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRecurrence = (type) => {
    const labels = {
      once: 'One Time',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      custom: 'Custom'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-400" />
            Scheduled Tasks
          </h2>
          <p className="text-gray-400 mt-1">Manage and monitor your scheduled tasks</p>
        </div>
        <button
          onClick={loadTasks}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-2xl font-bold text-white">{stats.total_tasks}</div>
            <div className="text-sm text-gray-400">Total Tasks</div>
          </div>
          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending_tasks}</div>
            <div className="text-sm text-gray-400">Pending</div>
          </div>
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400">{stats.running_tasks}</div>
            <div className="text-sm text-gray-400">Running</div>
          </div>
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <div className="text-2xl font-bold text-green-400">{stats.completed_tasks}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{stats.failed_tasks}</div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="paused">Paused</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="command">Command</option>
          <option value="software_deployment">Software</option>
          <option value="file_deployment">File</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading scheduled tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No scheduled tasks found</p>
          <p className="text-gray-500 text-sm mt-2">Create a schedule from the deployment pages</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const StatusIcon = STATUS_CONFIG[task.status]?.icon || Clock;
            const isExpanded = expandedTask === task.id;
            
            return (
              <div
                key={task.id}
                className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors"
              >
                {/* Task Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{task.task_name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_CONFIG[task.status]?.bg} ${STATUS_CONFIG[task.status]?.color} border ${STATUS_CONFIG[task.status]?.border}`}>
                          {task.status}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          {TASK_TYPE_LABELS[task.task_type]}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          {formatRecurrence(task.recurrence_type)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Next Run:</span>
                          <p className="text-white font-medium">{formatDateTime(task.next_execution)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Last Run:</span>
                          <p className="text-white font-medium">{task.last_execution ? formatDateTime(task.last_execution) : 'Never'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Executions:</span>
                          <p className="text-white font-medium">{task.execution_count}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Targets:</span>
                          <p className="text-white font-medium">
                            {task.device_ids.length} devices, {task.group_ids.length} groups
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {task.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handlePause(task.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Pause"
                          >
                            <Pause className="w-5 h-5 text-orange-400" />
                          </button>
                          <button
                            onClick={() => handleExecuteNow(task.id)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            title="Execute Now"
                          >
                            <Play className="w-5 h-5 text-green-400" />
                          </button>
                        </>
                      )}
                      {task.status === 'paused' && (
                        <button
                          onClick={() => handleResume(task.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Resume"
                        >
                          <Play className="w-5 h-5 text-blue-400" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                      <button
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-4 bg-gray-900/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="text-white font-semibold mb-2">Schedule Details</h4>
                        <div className="space-y-1 text-gray-400">
                          <p><span className="text-gray-500">Created:</span> {formatDateTime(task.created_at)}</p>
                          <p><span className="text-gray-500">Updated:</span> {formatDateTime(task.updated_at)}</p>
                          <p><span className="text-gray-500">Scheduled:</span> {formatDateTime(task.scheduled_time)}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-white font-semibold mb-2">Target Information</h4>
                        <div className="space-y-1 text-gray-400">
                          <p><span className="text-gray-500">Device IDs:</span> {task.device_ids.join(', ') || 'None'}</p>
                          <p><span className="text-gray-500">Group IDs:</span> {task.group_ids.join(', ') || 'None'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
