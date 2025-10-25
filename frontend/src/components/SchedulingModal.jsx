import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Repeat, 
  Save, 
  Play,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const RECURRENCE_TYPES = [
  { value: 'once', label: 'One Time', icon: Clock },
  { value: 'daily', label: 'Daily', icon: Repeat },
  { value: 'weekly', label: 'Weekly', icon: Repeat },
  { value: 'monthly', label: 'Monthly', icon: Repeat },
  { value: 'custom', label: 'Custom (Cron)', icon: Repeat }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Mon', short: 'M' },
  { value: 1, label: 'Tue', short: 'T' },
  { value: 2, label: 'Wed', short: 'W' },
  { value: 3, label: 'Thu', short: 'T' },
  { value: 4, label: 'Fri', short: 'F' },
  { value: 5, label: 'Sat', short: 'S' },
  { value: 6, label: 'Sun', short: 'S' }
];

export default function SchedulingModal({
  isOpen,
  onClose,
  onSchedule,
  onExecuteNow,
  taskType, // 'command', 'software_deployment', 'file_deployment'
  taskData, // The payload data for the task
  targetInfo // Information about selected devices/groups for display
}) {
  const [taskName, setTaskName] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('once');
  const [dailyTime, setDailyTime] = useState('03:00');
  const [weeklyDays, setWeeklyDays] = useState([0]); // Monday by default
  const [weeklyTime, setWeeklyTime] = useState('03:00');
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [monthlyTime, setMonthlyTime] = useState('00:00');
  const [cronExpression, setCronExpression] = useState('0 3 * * *');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      const now = new Date();
      now.setHours(now.getHours() + 1); // Default to 1 hour from now
      
      const date = now.toISOString().split('T')[0];
      const time = now.toTimeString().slice(0, 5);
      
      setScheduledDate(date);
      setScheduledTime(time);
      setTaskName(generateDefaultName());
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, taskType, taskData]);

  const generateDefaultName = () => {
    const timestamp = new Date().toLocaleString();
    switch (taskType) {
      case 'command':
        return `Command Task - ${timestamp}`;
      case 'software_deployment':
        return `Software Deployment - ${timestamp}`;
      case 'file_deployment':
        return `File Deployment - ${timestamp}`;
      default:
        return `Scheduled Task - ${timestamp}`;
    }
  };

  const handleWeeklyDayToggle = (day) => {
    setWeeklyDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const validateForm = () => {
    if (!taskName.trim()) {
      setError('Please enter a task name');
      return false;
    }

    if (recurrenceType === 'once') {
      if (!scheduledDate || !scheduledTime) {
        setError('Please select date and time');
        return false;
      }
      
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        setError('Scheduled time must be in the future');
        return false;
      }
    }

    if (recurrenceType === 'weekly' && weeklyDays.length === 0) {
      setError('Please select at least one day of the week');
      return false;
    }

    if (recurrenceType === 'custom' && !cronExpression.trim()) {
      setError('Please enter a cron expression');
      return false;
    }

    setError('');
    return true;
  };

  const buildSchedulePayload = () => {
    let scheduledDateTime;
    
    if (recurrenceType === 'once') {
      // Create a Date object from the local date/time and convert to ISO string
      const localDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      scheduledDateTime = localDateTime.toISOString();
    } else {
      // For recurring, use current time as starting point
      scheduledDateTime = new Date().toISOString();
    }

    const payload = {
      task_name: taskName,
      task_type: taskType,
      scheduled_time: scheduledDateTime,
      recurrence_type: recurrenceType,
      ...taskData // Include device_ids, group_ids, and type-specific payload
    };

    // Add recurrence configuration
    if (recurrenceType !== 'once') {
      const recurrenceConfig = {
        type: recurrenceType
      };

      switch (recurrenceType) {
        case 'daily':
          recurrenceConfig.time = dailyTime;
          break;
        case 'weekly':
          recurrenceConfig.days_of_week = weeklyDays;
          recurrenceConfig.time = weeklyTime;
          break;
        case 'monthly':
          recurrenceConfig.day_of_month = monthlyDay;
          recurrenceConfig.time = monthlyTime;
          break;
        case 'custom':
          recurrenceConfig.cron_expression = cronExpression;
          break;
      }

      payload.recurrence_config = recurrenceConfig;
    }

    return payload;
  };

  const handleSchedule = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildSchedulePayload();
      console.log('SchedulingModal - Sending payload to backend:', payload);
      await onSchedule(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteNow = async () => {
    setIsSubmitting(true);
    try {
      await onExecuteNow();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to execute task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSchedulePreview = () => {
    switch (recurrenceType) {
      case 'once':
        return `Execute once on ${scheduledDate} at ${scheduledTime}`;
      case 'daily':
        return `Execute daily at ${dailyTime}`;
      case 'weekly':
        const dayNames = weeklyDays.map(d => DAYS_OF_WEEK[d].label).join(', ');
        return `Execute every ${dayNames} at ${weeklyTime}`;
      case 'monthly':
        return `Execute on day ${monthlyDay} of each month at ${monthlyTime}`;
      case 'custom':
        return `Custom schedule: ${cronExpression}`;
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Schedule Task</h2>
              <p className="text-sm text-gray-400">
                {taskType === 'command' && 'Schedule command execution'}
                {taskType === 'software_deployment' && 'Schedule software deployment'}
                {taskType === 'file_deployment' && 'Schedule file deployment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Target Info */}
          {targetInfo && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">Target Summary:</p>
                  <p>{targetInfo}</p>
                </div>
              </div>
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Name
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter a descriptive name for this task"
            />
          </div>

          {/* Recurrence Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Schedule Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {RECURRENCE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setRecurrenceType(type.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    recurrenceType === type.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <type.icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* One-Time Schedule */}
          {recurrenceType === 'once' && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Daily Schedule */}
          {recurrenceType === 'daily' && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={dailyTime}
                  onChange={(e) => setDailyTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Task will execute every day at this time
                </p>
              </div>
            </div>
          )}

          {/* Weekly Schedule */}
          {recurrenceType === 'weekly' && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Days of Week
                </label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => handleWeeklyDayToggle(day.value)}
                      className={`flex-1 py-2 rounded-lg border-2 transition-all ${
                        weeklyDays.includes(day.value)
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-sm font-medium">{day.short}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={weeklyTime}
                  onChange={(e) => setWeeklyTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Monthly Schedule */}
          {recurrenceType === 'monthly' && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Day of Month
                </label>
                <select
                  value={monthlyDay}
                  onChange={(e) => setMonthlyDay(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      Day {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={monthlyTime}
                  onChange={(e) => setMonthlyTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Custom Cron */}
          {recurrenceType === 'custom' && (
            <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-mono focus:ring-2 focus:ring-blue-500"
                  placeholder="0 3 * * *"
                />
                <p className="text-xs text-gray-400 mt-2">
                  Format: minute hour day month day-of-week
                </p>
                <div className="mt-3 p-3 bg-gray-900/50 rounded border border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Examples:</p>
                  <ul className="text-xs text-gray-400 space-y-1 font-mono">
                    <li>• 0 2 * * * - Daily at 2 AM</li>
                    <li>• 0 2 * * 1 - Every Monday at 2 AM</li>
                    <li>• 0 0 1 * * - First day of month at midnight</li>
                    <li>• 0 9 * * 1-5 - Weekdays at 9 AM</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Preview */}
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-400 mb-1">Schedule Preview</p>
                <p className="text-sm text-green-400/80">{getSchedulePreview()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {onExecuteNow && (
              <button
                onClick={handleExecuteNow}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                Execute Now
              </button>
            )}
            <button
              onClick={handleSchedule}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Scheduling...' : 'Schedule Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
