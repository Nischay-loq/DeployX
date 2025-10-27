import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  Play,
  Pause,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Terminal as TerminalIcon,
  Package
} from 'lucide-react';
import authService from '../services/auth.js';

// Helper function to get API URL from environment
const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

// Helper function to format dates in IST
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  
  // Convert to IST (Indian Standard Time - UTC+5:30)
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const ManageSchedules = ({
  showAlert = (msg) => alert(msg),
  showConfirm = (msg, title, onConfirm) => window.confirm(msg) && onConfirm(),
  showError = (msg) => alert(msg),
  showSuccess = (msg) => alert(msg)
}) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('next_execution');
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchDevices();
    fetchGroups();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [currentPage, pageSize, filterStatus, filterType]);

  const getAuthHeaders = () => {
    const token = authService.getToken() || 
                   localStorage.getItem('access_token') || 
                   localStorage.getItem('token') ||
                   sessionStorage.getItem('access_token') ||
                   sessionStorage.getItem('token');
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl();
      
      // Build query parameters for pagination and filters
      const params = new URLSearchParams({
        skip: ((currentPage - 1) * pageSize).toString(),
        limit: pageSize.toString()
      });
      
      // Add status filter if not 'all'
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      // Add type filter if not 'all'
      if (filterType !== 'all') {
        params.append('task_type', filterType);
      }
      
      const response = await fetch(`${apiUrl}/api/schedule/tasks?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Please log in again');
        }
        throw new Error(`Failed to fetch schedules: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle both old format (array) and new format (object with pagination)
      if (Array.isArray(data)) {
        // Old format - no pagination
        setSchedules(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        // New format with pagination
        setSchedules(data.tasks || []);
        setTotal(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/devices/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  const fetchGroups = async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/groups/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    showConfirm(
      'Are you sure you want to delete this scheduled task?',
      'Delete Schedule',
      async () => {
        try {
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/api/schedule/tasks/${scheduleId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });

          if (!response.ok) throw new Error('Failed to delete schedule');

          await fetchSchedules();
        } catch (err) {
          console.error('Error deleting schedule:', err);
          showError('Failed to delete schedule: ' + err.message);
        }
      }
    );
  };

  const handlePauseResume = async (schedule) => {
    try {
      const newStatus = schedule.status === 'paused' ? 'pending' : 'paused';
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/schedule/tasks/${schedule.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!response.ok) throw new Error('Failed to update schedule');

      await fetchSchedules();
    } catch (err) {
      console.error('Error updating schedule:', err);
      showError('Failed to update schedule: ' + err.message);
    }
  };

  const handleEditSchedule = (schedule) => {
    // Prevent editing completed schedules
    if (schedule.status === 'completed') {
      showAlert('Completed tasks cannot be edited. You can delete and create a new schedule if needed.', 'Cannot Edit Completed Task', 'info');
      return;
    }
    // Prevent editing failed schedules (they should use retry instead)
    if (schedule.status === 'failed') {
      showAlert('Failed tasks cannot be edited directly. Please use the Retry button to reschedule this task.', 'Cannot Edit Failed Task', 'info');
      return;
    }
    setEditingSchedule(schedule);
    setShowEditModal(true);
  };

  const handleRetrySchedule = (schedule) => {
    // Allow editing for retry - set status to pending and open edit modal
    // Add a flag to track this is a retry operation
    setEditingSchedule({
      ...schedule,
      status: 'pending', // Will be updated when user saves
      _isRetrying: true  // Internal flag to track retry mode
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock },
      running: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Play },
      completed: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
      paused: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Pause },
      cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getTaskTypeIcon = (taskType) => {
    switch (taskType) {
      case 'command':
        return <TerminalIcon className="w-4 h-4" />;
      case 'software_deployment':
        return <Package className="w-4 h-4" />;
      case 'file_deployment':
        return <FileText className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getRecurrenceText = (schedule) => {
    if (schedule.recurrence_type === 'once') return 'One-time';
    
    try {
      const config = typeof schedule.recurrence_config === 'string' 
        ? JSON.parse(schedule.recurrence_config || '{}')
        : schedule.recurrence_config || {};
      
      switch (schedule.recurrence_type) {
        case 'daily':
          return `Daily at ${config.time || '00:00'}`;
        case 'weekly':
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
          const selectedDays = (config.days_of_week || [0]).map(d => days[d]).join(', ');
          return `Weekly on ${selectedDays} at ${config.time || '00:00'}`;
        case 'monthly':
          return `Monthly on day ${config.day_of_month || 1} at ${config.time || '00:00'}`;
        case 'custom':
          return `Custom: ${config.cron_expression || 'N/A'}`;
        default:
          return schedule.recurrence_type;
      }
    } catch {
      return schedule.recurrence_type;
    }
  };

  // Client-side filtering only for search term (status and type are server-side filtered)
  const filteredSchedules = schedules
    .filter(schedule => {
      const matchesSearch = schedule.task_name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'next_execution':
          // Handle null/undefined next_execution times
          const aTime = a.next_execution ? new Date(a.next_execution).getTime() : Infinity;
          const bTime = b.next_execution ? new Date(b.next_execution).getTime() : Infinity;
          
          // If both are null, sort by created_at (latest first)
          if (aTime === Infinity && bTime === Infinity) {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
          }
          
          return aTime - bTime; // Ascending order (soonest first)
        case 'last_execution':
          const aLast = a.last_execution ? new Date(a.last_execution).getTime() : 0;
          const bLast = b.last_execution ? new Date(b.last_execution).getTime() : 0;
          return bLast - aLast; // Descending order (most recent first)
        case 'name':
          return a.task_name.localeCompare(b.task_name);
        default:
          // Default to latest created schedules first (descending by created_at)
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading schedules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-400">
          <XCircle className="w-12 h-12 mx-auto mb-4" />
          <p>Error loading schedules: {error}</p>
          <button
            onClick={fetchSchedules}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Manage Schedules</h2>
          <p className="text-gray-400 mt-1">View and manage all scheduled tasks</p>
        </div>
        <button
          onClick={fetchSchedules}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search schedules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Types</option>
              <option value="command">Command</option>
              <option value="software_deployment">Software</option>
              <option value="file_deployment">File</option>
            </select>
          </div>
        </div>

        {/* Sort and Results Count */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Sort by:</span>
            <button
              onClick={() => setSortBy('next_execution')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'next_execution' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Next Execution
            </button>
            <button
              onClick={() => setSortBy('last_execution')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'last_execution' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Last Execution
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'name' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              Name
            </button>
          </div>
          
          {/* Results Count */}
          <div className="text-sm text-gray-400">
            Showing {schedules.length} of {total} schedules
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        {filteredSchedules.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">No scheduled tasks found</p>
          </div>
        ) : (
          filteredSchedules.map(schedule => (
            <div
              key={schedule.id}
              className={`bg-gray-800 rounded-xl border overflow-hidden hover:border-gray-600 transition-colors ${
                schedule.status === 'failed' 
                  ? 'border-red-500/50 shadow-lg shadow-red-500/10' 
                  : 'border-gray-700'
              }`}
            >
              {/* Failed Schedule Banner */}
              {schedule.status === 'failed' && (
                <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400 font-medium">Task Failed - Click Retry to reschedule</span>
                  </div>
                  <button
                    onClick={() => handleRetrySchedule(schedule)}
                    className="flex items-center gap-1 px-3 py-1 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded text-orange-400 text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              )}
              
              {/* Schedule Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
                        {getTaskTypeIcon(schedule.task_type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{schedule.task_name}</h3>
                        <p className="text-sm text-gray-400 capitalize">
                          {schedule.task_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        {getStatusBadge(schedule.status)}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Recurrence</p>
                        <p className="text-sm text-gray-300">{getRecurrenceText(schedule)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          {schedule.next_execution ? 'Next Execution' : 'Scheduled Time'}
                        </p>
                        <p className="text-sm text-gray-300">
                          {schedule.next_execution 
                            ? formatDate(schedule.next_execution) 
                            : formatDate(schedule.scheduled_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Executions</p>
                        <p className="text-sm text-gray-300">{schedule.execution_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setExpandedSchedule(expandedSchedule === schedule.id ? null : schedule.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="View Details"
                    >
                      {expandedSchedule === schedule.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    
                    {/* Retry button - only shown for failed schedules */}
                    {schedule.status === 'failed' && (
                      <button
                        onClick={() => {
                          console.log('Retry clicked for schedule:', schedule);
                          handleRetrySchedule(schedule);
                        }}
                        className="p-2 hover:bg-gray-700 rounded-lg text-orange-400 hover:text-orange-300 transition-colors border border-orange-500/30"
                        title="Retry - Edit and reschedule this task"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    )}
                    
                    {/* Edit button - disabled for completed and failed */}
                    <button
                      onClick={() => handleEditSchedule(schedule)}
                      className={`p-2 rounded-lg transition-colors ${
                        schedule.status === 'completed' || schedule.status === 'failed'
                          ? 'text-gray-600 cursor-not-allowed opacity-50'
                          : 'hover:bg-gray-700 text-blue-400 hover:text-blue-300'
                      }`}
                      title={
                        schedule.status === 'completed'
                          ? 'Completed tasks cannot be edited'
                          : schedule.status === 'failed'
                          ? 'Use Retry button for failed tasks'
                          : 'Edit'
                      }
                      disabled={schedule.status === 'completed' || schedule.status === 'failed'}
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    
                    {/* Pause/Resume button */}
                    <button
                      onClick={() => handlePauseResume(schedule)}
                      className={`p-2 rounded-lg transition-colors ${
                        schedule.status === 'completed' || schedule.status === 'failed'
                          ? 'text-gray-600 cursor-not-allowed opacity-50'
                          : 'hover:bg-gray-700 text-yellow-400 hover:text-yellow-300'
                      }`}
                      title={
                        schedule.status === 'completed' || schedule.status === 'failed'
                          ? 'Cannot pause/resume completed or failed tasks'
                          : schedule.status === 'paused' ? 'Resume' : 'Pause'
                      }
                      disabled={schedule.status === 'completed' || schedule.status === 'failed'}
                    >
                      {schedule.status === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </button>
                    
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedSchedule === schedule.id && (
                <div className="border-t border-gray-700 p-4 bg-gray-750">
                  <ScheduleDetails schedule={schedule} devices={devices} groups={groups} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && schedules.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} schedules
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  setExpandedSchedule(null); // Close any expanded schedule when changing pages
                }}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-gray-400 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  setExpandedSchedule(null); // Close any expanded schedule when changing pages
                }}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSchedule && (
        <EditScheduleModal
          schedule={editingSchedule}
          devices={devices}
          groups={groups}
          onClose={() => {
            setShowEditModal(false);
            setEditingSchedule(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setEditingSchedule(null);
            fetchSchedules();
          }}
          showAlert={showAlert}
          showError={showError}
          showSuccess={showSuccess}
        />
      )}
    </div>
  );
};

// Schedule Details Component
const ScheduleDetails = ({ schedule, devices, groups }) => {
  const payload = typeof schedule.payload === 'string' ? JSON.parse(schedule.payload || '{}') : schedule.payload || {};
  const deviceIds = Array.isArray(schedule.device_ids) ? schedule.device_ids : JSON.parse(schedule.device_ids || '[]');
  const groupIds = Array.isArray(schedule.group_ids) ? schedule.group_ids : JSON.parse(schedule.group_ids || '[]');

  const selectedDevices = devices.filter(d => deviceIds.includes(d.id));
  const selectedGroups = groups.filter(g => groupIds.includes(g.id));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Details */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">Task Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Created:</span>
              <span className="text-gray-300">{new Date(schedule.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            {schedule.scheduled_time && (
              <div className="flex justify-between">
                <span className="text-gray-400">Scheduled Time:</span>
                <span className="text-gray-300">{formatDate(schedule.scheduled_time)}</span>
              </div>
            )}
            {schedule.next_execution && (
              <div className="flex justify-between">
                <span className="text-gray-400">Next Execution:</span>
                <span className="text-primary-400 font-semibold">{formatDate(schedule.next_execution)}</span>
              </div>
            )}
            {schedule.last_execution && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Run:</span>
                <span className="text-gray-300">{new Date(schedule.last_execution).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
              </div>
            )}
            {schedule.error_message && (
              <div>
                <span className="text-gray-400">Error:</span>
                <p className="text-red-400 text-xs mt-1">{schedule.error_message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payload Details */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-2">
            {schedule.task_type === 'command' ? 'Command Details' :
             schedule.task_type === 'software_deployment' ? 'Software Details' :
             'File Details'}
          </h4>
          <div className="space-y-2 text-sm">
            {schedule.task_type === 'command' && (
              <div>
                <span className="text-gray-400">Command:</span>
                <pre className="bg-gray-800 p-2 rounded mt-1 text-xs text-gray-300 overflow-x-auto">
                  {payload.command || 'N/A'}
                </pre>
              </div>
            )}
            {schedule.task_type === 'software_deployment' && (
              <div>
                <span className="text-gray-400">Software IDs:</span>
                <p className="text-gray-300 mt-1">{payload.software_ids?.join(', ') || 'N/A'}</p>
              </div>
            )}
            {schedule.task_type === 'file_deployment' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">File IDs:</span>
                  <span className="text-gray-300">{payload.file_ids?.join(', ') || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Path:</span>
                  <span className="text-gray-300 font-mono text-xs">{payload.target_path || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Target Devices and Groups */}
      <div>
        <h4 className="text-sm font-semibold text-white mb-2">Target Devices & Groups</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Devices */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Devices ({selectedDevices.length})</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedDevices.length > 0 ? (
                selectedDevices.map(device => (
                  <div key={device.id} className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">
                    {device.device_name || device.agent_id}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No devices selected</p>
              )}
            </div>
          </div>

          {/* Groups */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Groups ({selectedGroups.length})</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedGroups.length > 0 ? (
                selectedGroups.map(group => (
                  <div key={group.id} className="text-sm text-gray-300 bg-gray-800 px-2 py-1 rounded">
                    {group.group_name}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No groups selected</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit Schedule Modal Component
const EditScheduleModal = ({ 
  schedule, 
  devices, 
  groups, 
  onClose, 
  onSave,
  showAlert = (msg) => alert(msg),
  showError = (msg) => alert(msg),
  showSuccess = (msg) => alert(msg)
}) => {
  // Helper function to convert UTC to local datetime-local format
  const getLocalDateTimeString = (utcDateString) => {
    if (!utcDateString) return '';
    const date = new Date(utcDateString);
    // Get local time components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    task_name: schedule.task_name,
    // For recurring tasks or pending one-time tasks: use next_execution or scheduled_time
    // For completed one-time tasks: use scheduled_time (since next_execution is null)
    scheduled_time: getLocalDateTimeString(
      schedule.recurrence_type === 'once' && schedule.status === 'completed'
        ? schedule.scheduled_time
        : (schedule.next_execution || schedule.scheduled_time)
    ),
    recurrence_type: schedule.recurrence_type,
    recurrence_config: schedule.recurrence_config,
    device_ids: Array.isArray(schedule.device_ids) ? schedule.device_ids : JSON.parse(schedule.device_ids || '[]'),
    group_ids: Array.isArray(schedule.group_ids) ? schedule.group_ids : JSON.parse(schedule.group_ids || '[]'),
    payload: typeof schedule.payload === 'string' ? JSON.parse(schedule.payload || '{}') : schedule.payload || {}
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = authService.getToken() || 
                     localStorage.getItem('access_token') || 
                     localStorage.getItem('token') ||
                     sessionStorage.getItem('access_token') ||
                     sessionStorage.getItem('token');

      // Validate scheduled time
      if (!formData.scheduled_time) {
        showAlert('Please select a scheduled time', 'Missing Information', 'warning');
        setSaving(false);
        return;
      }

      // Convert the local datetime to UTC ISO string
      const scheduledTimeUTC = new Date(formData.scheduled_time).toISOString();

      // Check if this is a retry operation (either from _isRetrying flag or original status was failed)
      const isRetry = schedule._isRetrying === true || schedule.status === 'failed';
      
      // Build the update payload based on task type
      const updateData = {
        task_name: formData.task_name,
        scheduled_time: scheduledTimeUTC,
        device_ids: formData.device_ids,
        group_ids: formData.group_ids,
        // If this is a retry (from failed status), reset status to pending
        // The backend will automatically calculate next_execution via reschedule_task()
        status: isRetry ? 'pending' : undefined
      };

      // Add task-specific payload
      if (schedule.task_type === 'command') {
        if (!formData.payload.command) {
          showAlert('Please enter a command', 'Missing Information', 'warning');
          setSaving(false);
          return;
        }
        updateData.command_payload = {
          command: formData.payload.command,
          shell: formData.payload.shell || 'cmd'
        };
      } else if (schedule.task_type === 'file_deployment') {
        if (!formData.payload.target_path) {
          showAlert('Please enter a target path', 'Missing Information', 'warning');
          setSaving(false);
          return;
        }
        updateData.file_payload = {
          file_ids: formData.payload.file_ids || [],
          target_path: formData.payload.target_path,
          create_path_if_not_exists: formData.payload.create_path_if_not_exists ?? true
        };
      } else if (schedule.task_type === 'software_deployment') {
        updateData.software_payload = {
          software_ids: formData.payload.software_ids || []
        };
      }

      console.log('Sending update:', updateData);

      const response = await fetch(`${apiUrl}/api/schedule/tasks/${schedule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to update schedule: ${response.status}`);
      }

      // Show appropriate success message
      const successMessage = isRetry 
        ? 'Schedule retried successfully! Task has been rescheduled and will execute at the scheduled time.'
        : 'Schedule updated successfully!';
      
      showSuccess(successMessage);
      onSave();
    } catch (err) {
      console.error('Error updating schedule:', err);
      showError('Failed to update schedule: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Check if this is a retry operation (either from _isRetrying flag or original status was failed)
  const isRetrying = schedule._isRetrying === true || schedule.status === 'failed';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {isRetrying ? (
                <>
                  <RefreshCw className="w-6 h-6 text-orange-400" />
                  Retry Failed Schedule
                </>
              ) : (
                'Edit Schedule'
              )}
            </h2>
            <p className="text-gray-400 mt-1">
              {isRetrying 
                ? 'Update details and reschedule this failed task to run again' 
                : 'Update scheduled task configuration'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Retry Notice */}
        {isRetrying && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-orange-400 font-semibold mb-1">Retrying Failed Task</h3>
                <p className="text-gray-300 text-sm">
                  This task previously failed. You can update the schedule details below and retry. 
                  The task will be rescheduled with status 'pending' and will execute at the new scheduled time.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Name
            </label>
            <input
              type="text"
              value={formData.task_name}
              onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          {/* Scheduled Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Scheduled Time (Your Local Time)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The time will be converted to UTC for the server
            </p>
          </div>

          {/* Task-specific fields */}
          {schedule.task_type === 'command' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Command
              </label>
              <textarea
                value={formData.payload.command || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  payload: { ...formData.payload, command: e.target.value }
                })}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          )}

          {schedule.task_type === 'file_deployment' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Path
              </label>
              <input
                type="text"
                value={formData.payload.target_path || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  payload: { ...formData.payload, target_path: e.target.value }
                })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          )}

          {/* Device Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Devices
            </label>
            <div className="max-h-48 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
              {devices.map(device => (
                <label key={device.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.device_ids.includes(device.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          device_ids: [...formData.device_ids, device.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          device_ids: formData.device_ids.filter(id => id !== device.id)
                        });
                      }
                    }}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-white text-sm">{device.device_name || device.agent_id}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Group Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Groups
            </label>
            <div className="max-h-48 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
              {groups.map(group => (
                <label key={group.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.group_ids.includes(group.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          group_ids: [...formData.group_ids, group.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          group_ids: formData.group_ids.filter(id => id !== group.id)
                        });
                      }
                    }}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-white text-sm">{group.group_name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            {isRetrying && (
              <button
                type="button"
                onClick={async () => {
                  // Set scheduled time to now for immediate execution
                  const now = new Date();
                  formData.scheduled_time = now.toISOString().slice(0, 16);
                  await handleSubmit({ preventDefault: () => {} });
                }}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Execute Now
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                isRetrying 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {isRetrying ? 'Retrying...' : 'Saving...'}
                </>
              ) : (
                <>
                  {isRetrying && <RefreshCw className="w-4 h-4" />}
                  {isRetrying ? 'Retry Schedule' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageSchedules;
