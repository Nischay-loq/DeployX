import { useState, useEffect } from 'react';

export default function ProgressModal({ progress, onRetry, onClose }) {
  const [retryIds, setRetryIds] = useState([]);

  useEffect(() => {
    const failedDevices = progress.filter(device => device.status === 'failed');
    setRetryIds(failedDevices.map(device => device.device_id));
  }, [progress]);

  const handleRetryAll = () => {
    if (retryIds.length > 0) {
      onRetry(retryIds);
    }
  };

  const handleRetryDevice = (deviceId) => {
    onRetry([deviceId]);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'in_progress':
      case 'installing':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressBarColor = (status) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'bg-green-500';
      case 'failed':
      case 'error':
        return 'bg-red-500';
      case 'in_progress':
      case 'installing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isCompleted = progress.every(device => 
    device.status === 'success' || device.status === 'completed' || device.status === 'failed'
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Deployment Progress</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Content */}
        <div className="flex-1 overflow-hidden p-6">
          {progress.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Initializing deployment...</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Device</th>
                    <th className="text-left p-3 font-medium text-gray-700">Status</th>
                    <th className="text-left p-3 font-medium text-gray-700">Progress</th>
                    <th className="text-left p-3 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {progress.map(device => (
                    <tr key={device.device_id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">
                          {device.device_name || `Device ${device.device_id}`}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {device.device_id}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(device.status)}`}
                            style={{ width: `${device.percent || 0}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600">
                          {device.percent || 0}%
                        </div>
                      </td>
                      <td className="p-3">
                        {device.status === 'failed' && (
                          <button
                            onClick={() => handleRetryDevice(device.device_id)}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {progress.length > 0 && (
              <>
                {progress.filter(d => d.status === 'success' || d.status === 'completed').length} completed, {' '}
                {progress.filter(d => d.status === 'failed').length} failed, {' '}
                {progress.filter(d => d.status === 'in_progress' || d.status === 'installing').length} in progress
              </>
            )}
          </div>
          <div className="flex space-x-3">
            {retryIds.length > 0 && (
              <button
                onClick={handleRetryAll}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Retry All Failed ({retryIds.length})
              </button>
            )}
            {isCompleted && (
              <button
                onClick={onClose}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}