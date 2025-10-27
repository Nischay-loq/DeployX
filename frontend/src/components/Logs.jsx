import { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import io from 'socket.io-client';
import logsService from '../services/logs';
import { exportLogsToExcel, exportStatsToExcel } from '../utils/excelExport';
import Notification from './jsx/Notification';

export default function Logs() {
  // State management
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    log_type: '',
    status: '',
    search: '',
    date_from: '',
    date_to: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // UI states
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showFilters, setShowFilters] = useState(true); // Always show filters
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  const socketRef = useRef(null);
  const refreshIntervalRef = useRef(null);

  // Load logs on mount and when filters change
  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [currentPage, pageSize, filters]);

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const socket = io('http://localhost:8000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to logs socket');
    });

    // Listen for deployment status updates
    socket.on('deployment_status_update', (data) => {
      console.log('Deployment status update:', data);
      refreshLogsAndStats();
    });

    // Listen for file deployment updates
    socket.on('file_deployment_update', (data) => {
      console.log('File deployment update:', data);
      refreshLogsAndStats();
    });

    // Listen for file deployment completion
    socket.on('file_deployment_completed', (deploymentInfo) => {
      console.log('File deployment completed:', deploymentInfo);
      
      const { status, success_count, failure_count, total_count } = deploymentInfo;
      const isSuccess = status === 'completed' && failure_count === 0;
      
      if (isSuccess) {
        addNotification(`✅ All ${total_count} file deployments completed successfully!`, 'success');
      } else if (success_count > 0) {
        addNotification(`⚠️ ${success_count}/${total_count} file deployments successful (${failure_count} failed)`, 'warning');
      } else {
        addNotification(`❌ All ${total_count} file deployments failed`, 'error');
      }
      
      refreshLogsAndStats();
    });

    // Listen for software deployment completion
    socket.on('deployment_completed', (deploymentInfo) => {
      console.log('Software deployment completed:', deploymentInfo);
      
      const { deployment_name, status, success_count, failure_count, total_count } = deploymentInfo;
      const isSuccess = status === 'completed' && failure_count === 0;
      
      if (isSuccess) {
        addNotification(`✅ "${deployment_name}": All ${total_count} devices deployed successfully!`, 'success');
      } else if (success_count > 0) {
        addNotification(`⚠️ "${deployment_name}": ${success_count}/${total_count} devices deployed (${failure_count} failed)`, 'warning');
      } else {
        addNotification(`❌ "${deployment_name}": All ${total_count} devices failed`, 'error');
      }
      
      refreshLogsAndStats();
    });

    // Listen for command execution updates
    socket.on('command_result', (data) => {
      console.log('Command execution update:', data);
      refreshLogsAndStats();
    });

    // Listen for scheduled task updates
    socket.on('task_execution_update', (data) => {
      console.log('Task execution update:', data);
      refreshLogsAndStats();
    });

    // Listen for scheduled task completion
    socket.on('scheduled_task_completed', (taskInfo) => {
      console.log('Scheduled task completed:', taskInfo);
      
      const taskTypeLabel = taskInfo.task_type === 'command' ? 'Command Execution' :
                           taskInfo.task_type === 'software_deployment' ? 'Software Deployment' :
                           taskInfo.task_type === 'file_deployment' ? 'File Deployment' : 'Task';
      
      addNotification(`✅ ${taskTypeLabel} "${taskInfo.task_name}" completed successfully`, 'success');
      refreshLogsAndStats();
    });

    // Listen for scheduled task failure
    socket.on('scheduled_task_failed', (taskInfo) => {
      console.log('Scheduled task failed:', taskInfo);
      
      const taskTypeLabel = taskInfo.task_type === 'command' ? 'Command Execution' :
                           taskInfo.task_type === 'software_deployment' ? 'Software Deployment' :
                           taskInfo.task_type === 'file_deployment' ? 'File Deployment' : 'Task';
      
      addNotification(`❌ ${taskTypeLabel} "${taskInfo.task_name}" failed: ${taskInfo.error_message}`, 'error');
      refreshLogsAndStats();
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from logs socket');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        refreshLogsAndStats();
      }, 30000); // Refresh every 30 seconds
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, filters, currentPage, pageSize]);

  const refreshLogsAndStats = () => {
    fetchLogs();
    fetchStats();
    setLastUpdate(new Date());
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      const response = await logsService.getAllLogs(params);
      console.log('Logs API response:', response);
      
      // Check if response is valid
      if (!response) {
        console.error('No response from logs API');
        setLogs([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }
      
      // Handle both direct response and nested data
      const logsData = response.logs || [];
      const totalCount = response.total || 0;
      const totalPagesCount = response.total_pages || 1;
      
      console.log('Parsed logs data:', { logsData, totalCount, totalPagesCount });
      
      setLogs(logsData);
      setTotal(totalCount);
      setTotalPages(totalPagesCount);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      console.error('Error details:', err.response || err.message);
      
      // Set empty state on error
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
      
      setError('Failed to load logs. Please try again.');
      addNotification('Failed to load logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    
    try {
      const response = await logsService.getLogStats();
      console.log('Stats API response:', response);
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      console.error('Stats error details:', err.response || err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      log_type: '',
      status: '',
      search: '',
      date_from: '',
      date_to: ''
    });
    setCurrentPage(1);
  };

  const handleViewDetails = async (log) => {
    setSelectedLog(log);
    setShowDetails(true);
    setDetailsLoading(true);
    
    try {
      const details = await logsService.getLogDetails(log.id);
      setSelectedLog({ ...log, details });
    } catch (err) {
      console.error('Failed to fetch log details:', err);
      addNotification('Failed to load log details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const exportLogs = () => {
    try {
      if (logs.length === 0) {
        addNotification('No logs to export', 'warning');
        return;
      }
      
      // Export logs
      const logsFilename = exportLogsToExcel(logs, filters);
      
      // Also export stats if available
      if (stats) {
        const statsFilename = exportStatsToExcel(stats);
        addNotification(`Logs and statistics exported successfully`, 'success');
      } else {
        addNotification(`Logs exported successfully to ${logsFilename}`, 'success');
      }
    } catch (err) {
      console.error('Failed to export logs:', err);
      addNotification('Failed to export logs', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">System Logs</h2>
            <p className="text-gray-400">
              Track all deployments, executions, and scheduled tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogs}
            className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
            disabled={logs.length === 0}
            title="Export logs and statistics to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={refreshLogsAndStats}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
            title={`Last updated: ${lastUpdate.toLocaleTimeString()}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && !statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Deployments</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total_deployments}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="card-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">File Deployments</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total_executions}</p>
              </div>
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </div>
          
          <div className="card-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Scheduled Tasks</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total_scheduled}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="card-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Success Rate</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.success_rate}%</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
          <div className="flex flex-col gap-4">
            {/* Search Bar - Full Width at Top */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Log Type Filter */}
              <div className="lg:w-48">
                <select
                  value={filters.log_type}
                  onChange={(e) => handleFilterChange('log_type', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
              >
                <option value="">All Types</option>
                <option value="software_deployment">Software Deployment</option>
                <option value="file_deployment">File Deployment</option>
                <option value="command_execution">Command Execution</option>
                <option value="scheduled_task">Scheduled Task</option>
              </select>
              </div>

              {/* Status Filter */}
              <div className="lg:w-48">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Date From */}
              <div className="lg:w-56">
                <input
                  type="datetime-local"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                />
              </div>

              {/* Date To */}
              <div className="lg:w-56">
                <input
                  type="datetime-local"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-gray-700/70 transition-all"
                />
              </div>

              {/* Clear Filters */}
              {(filters.search || filters.log_type || filters.status || filters.date_from || filters.date_to) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 rounded-lg transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="text-sm text-gray-400">
              Showing {logs.length} of {total} logs
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="card-dark">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-400">{error}</p>
            <button onClick={fetchLogs} className="btn-primary btn-sm mt-4">
              Try Again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400">No logs found</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Type</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Title</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Targets</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Results</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Initiated By</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium ${logsService.getLogTypeColor(log.log_type)}`}>
                          <span>{logsService.getLogTypeIcon(log.log_type)}</span>
                          <span>{logsService.formatLogType(log.log_type)}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{log.title}</div>
                        {log.details && log.details.target_path && (
                          <div className="text-xs text-gray-400 mt-1">
                            Path: {log.details.target_path}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${logsService.getStatusColor(log.status)}`}>
                          {log.status === 'completed' || log.status === 'success' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : log.status === 'failed' || log.status === 'error' ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {log.target_count} {log.target_type || 'target'}(s)
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓ {log.success_count}</span>
                          <span className="text-red-400">✗ {log.failure_count}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {log.initiated_by || 'System'}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        <div className="text-sm">{logsService.formatDate(log.created_at)}</div>
                        <div className="text-xs text-gray-500">
                          {logsService.formatDateTime(log.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} logs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{logsService.getLogTypeIcon(selectedLog.log_type)}</span>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedLog.title}</h3>
                  <p className="text-sm text-gray-400">
                    {logsService.formatLogType(selectedLog.log_type)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Status</label>
                      <p className="text-white mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${logsService.getStatusColor(selectedLog.status)}`}>
                          {selectedLog.status}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Initiated By</label>
                      <p className="text-white mt-1">{selectedLog.initiated_by || 'System'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Started</label>
                      <p className="text-white mt-1">{logsService.formatDateTime(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Duration</label>
                      <p className="text-white mt-1">
                        {logsService.calculateDuration(selectedLog.created_at, selectedLog.completed_at)}
                      </p>
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-3">Results Summary</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Total Targets</p>
                        <p className="text-2xl font-bold text-white mt-1">{selectedLog.target_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Successful</p>
                        <p className="text-2xl font-bold text-green-400 mt-1">{selectedLog.success_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Failed</p>
                        <p className="text-2xl font-bold text-red-400 mt-1">{selectedLog.failure_count}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  {selectedLog.details && (
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-3">Additional Details</h4>
                      <pre className="text-sm text-gray-300 overflow-x-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-700">
              <button
                onClick={() => setShowDetails(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          />
        ))}
      </div>
    </div>
  );
}
