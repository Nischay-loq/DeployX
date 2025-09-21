import { useState, useEffect } from 'react';
import deploymentsService from '../services/deployments';
import groupsService from '../services/groups';
import devicesService from '../services/devices';
import ProgressModal from './ProgressModal';

export default function DeploymentsManager() {
  // Software selection
  const [availableSoftware, setAvailableSoftware] = useState([]);
  const [selectedSoftware, setSelectedSoftware] = useState([]);

  // Groups and devices
  const [groups, setGroups] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);

  // Loading states
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [deploying, setDeploying] = useState(false);

  // Progress tracking
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentDeploymentId, setCurrentDeploymentId] = useState(null);
  const [deploymentProgress, setDeploymentProgress] = useState([]);

  // Error handling
  const [error, setError] = useState('');

  useEffect(() => {
    // Load initial data
    loadSoftware();
    loadGroups();
    loadDevices();
  }, []);

  const loadSoftware = () => {
    const software = deploymentsService.getAvailableSoftware();
    setAvailableSoftware(software);
  };

  const loadGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const response = await groupsService.fetchGroups();
      setGroups(response || []);
    } catch (err) {
      console.error('Failed to load groups:', err);
      setError('Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    setError('');
    try {
      const response = await devicesService.fetchDevices();
      setDevices(response || []);
    } catch (err) {
      console.error('Failed to load devices:', err);
      setError('Failed to load devices');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSoftwareToggle = (softwareId) => {
    setSelectedSoftware(prev => 
      prev.includes(softwareId) 
        ? prev.filter(id => id !== softwareId)
        : [...prev, softwareId]
    );
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleInstall = async () => {
    if (selectedSoftware.length === 0) {
      alert('Please select at least one software to install.');
      return;
    }

    if (selectedGroups.length === 0 && selectedDevices.length === 0) {
      alert('Please select at least one group or device.');
      return;
    }

    setDeploying(true);
    setError('');

    try {
      const deploymentData = {
        software_ids: selectedSoftware,
        group_ids: selectedGroups,
        device_ids: selectedDevices,
        deployment_name: `Software Installation - ${new Date().toLocaleString()}`
      };

      const response = await deploymentsService.installSoftware(deploymentData);
      setCurrentDeploymentId(response.deployment_id);
      setShowProgressModal(true);
      
      // Start polling for progress
      pollProgress(response.deployment_id);

    } catch (err) {
      console.error('Failed to start deployment:', err);
      setError('Failed to start deployment. Please try again.');
    } finally {
      setDeploying(false);
    }
  };

  const pollProgress = async (deploymentId) => {
    try {
      const interval = setInterval(async () => {
        try {
          const progress = await deploymentsService.getDeploymentProgress(deploymentId);
          setDeploymentProgress(progress.devices || []);
          
          if (progress.completed) {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Failed to get progress:', err);
          clearInterval(interval);
        }
      }, 2000);

      // Store interval ID to clear it when component unmounts
      return () => clearInterval(interval);
    } catch (err) {
      console.error('Failed to start progress polling:', err);
    }
  };

  const handleRetry = async (deviceIds) => {
    try {
      await deploymentsService.retryFailedDeployments(deviceIds);
      if (currentDeploymentId) {
        pollProgress(currentDeploymentId);
      }
    } catch (err) {
      console.error('Failed to retry deployments:', err);
      setError('Failed to retry deployments');
    }
  };

  const closeProgressModal = () => {
    setShowProgressModal(false);
    setCurrentDeploymentId(null);
    setDeploymentProgress([]);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Software Deployments</h1>
        <div className="text-sm text-gray-500">
          Manage and deploy software across your devices
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Software Selection */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Select Software</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableSoftware.map(software => (
            <label key={software.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSoftware.includes(software.id)}
                onChange={() => handleSoftwareToggle(software.id)}
                className="text-blue-600"
              />
              <span className="text-sm font-medium">{software.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Target Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Groups */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-700">Groups</h2>
            {loadingGroups && <span className="text-sm text-blue-600">Loading...</span>}
          </div>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 w-10">
                    <input type="checkbox" className="text-blue-600" disabled />
                  </th>
                  <th className="text-left p-3">Group Name</th>
                  <th className="text-left p-3">Devices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groups.length === 0 && !loadingGroups ? (
                  <tr>
                    <td colSpan={3} className="text-center p-4 text-gray-500">
                      No groups found
                    </td>
                  </tr>
                ) : (
                  groups.map(group => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(group.id)}
                          onChange={() => handleGroupToggle(group.id)}
                          className="text-blue-600"
                        />
                      </td>
                      <td className="p-3 font-medium">{group.group_name}</td>
                      <td className="p-3 text-gray-600">{group.devices?.length || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Devices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold text-gray-700">Devices</h2>
            {loadingDevices && <span className="text-sm text-blue-600">Loading...</span>}
          </div>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 w-10">
                    <input type="checkbox" className="text-blue-600" disabled />
                  </th>
                  <th className="text-left p-3">Device Name</th>
                  <th className="text-left p-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {devices.length === 0 && !loadingDevices ? (
                  <tr>
                    <td colSpan={3} className="text-center p-4 text-gray-500">
                      No devices found
                    </td>
                  </tr>
                ) : (
                  devices.map(device => (
                    <tr key={device.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(device.id)}
                          onChange={() => handleDeviceToggle(device.id)}
                          className="text-blue-600"
                        />
                      </td>
                      <td className="p-3 font-medium">{device.device_name || `Device ${device.id}`}</td>
                      <td className="p-3 text-gray-600">{device.ip_address || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedSoftware.length} software, {selectedGroups.length} groups, {selectedDevices.length} devices selected
        </div>
        <button
          onClick={handleInstall}
          disabled={deploying || selectedSoftware.length === 0 || (selectedGroups.length === 0 && selectedDevices.length === 0)}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {deploying ? 'Starting Deployment...' : 'Install Software'}
        </button>
      </div>

      {/* Progress Modal */}
      {showProgressModal && (
        <ProgressModal
          progress={deploymentProgress}
          onRetry={handleRetry}
          onClose={closeProgressModal}
        />
      )}
    </div>
  );
}