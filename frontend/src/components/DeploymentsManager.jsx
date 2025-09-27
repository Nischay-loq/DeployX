import { useState, useEffect } from 'react';
import deploymentsService from '../services/deployments';
import groupsService from '../services/groups';
import devicesService from '../services/devices';
import ProgressModal from './ProgressModal';

export default function DeploymentsManager() {
  // Software selection
  const [availableSoftware, setAvailableSoftware] = useState([]);
  const [selectedSoftware, setSelectedSoftware] = useState([]);
  const [customSoftware, setCustomSoftware] = useState('');
  const [useCustomSoftware, setUseCustomSoftware] = useState(false);

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

  // Tab management and deployments list
  const [activeTab, setActiveTab] = useState('deployments');
  const [deployments, setDeployments] = useState([]);

  useEffect(() => {
    // Load initial data
    loadSoftware();
    loadGroups();
    loadDevices();
    loadDeployments();
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

  const loadDeployments = async () => {
    setError('');
    try {
      const response = await deploymentsService.fetchDeployments();
      setDeployments(response || []);
    } catch (err) {
      console.error('Failed to load deployments:', err);
      setError('Failed to load deployments');
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
    // Check if we have software selected (either predefined or custom)
    const hasSoftware = useCustomSoftware ? 
      customSoftware.trim().length > 0 : 
      selectedSoftware.length > 0;
    
    if (!hasSoftware) {
      alert('Please select software to install or enter custom software.');
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
        software_ids: useCustomSoftware ? [] : selectedSoftware,
        group_ids: selectedGroups,
        device_ids: selectedDevices,
        deployment_name: useCustomSoftware ? 
          `Custom Software: ${customSoftware.trim()}` : 
          `Software Installation - ${new Date().toLocaleString()}`,
        custom_software: useCustomSoftware ? customSoftware.trim() : null
      };

      const response = await deploymentsService.installSoftware(deploymentData);
      setCurrentDeploymentId(response.deployment_id);
      setShowProgressModal(true);
      
      // Start polling for progress
      pollProgress(response.deployment_id);

      // Reset form
      setSelectedSoftware([]);
      setSelectedGroups([]);
      setSelectedDevices([]);
      setCustomSoftware('');
      setUseCustomSoftware(false);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-purple-400 text-2xl">●</span>
          <h2 className="text-xl font-bold">Software Deployments</h2>
          <span className="text-sm text-gray-400">({deployments.length} deployments)</span>
        </div>
        <div className="text-sm text-gray-500">
          Manage and deploy software across your devices
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 text-red-300 hover:text-red-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-black/40 border border-electricBlue/30 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('deployments')}
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === 'deployments'
              ? 'bg-electricBlue/20 text-electricBlue border border-electricBlue/50'
              : 'text-gray-400 hover:text-softWhite'
          }`}
        >
          Deployments
        </button>
        <button
          onClick={() => setActiveTab('install')}
          className={`px-4 py-2 rounded-md transition-all ${
            activeTab === 'install'
              ? 'bg-electricBlue/20 text-electricBlue border border-electricBlue/50'
              : 'text-gray-400 hover:text-softWhite'
          }`}
        >
          Install Software
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'deployments' && (
        <div className="space-y-4">
          {/* Deployments List */}
          <div className="bg-black/60 border border-electricBlue/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-electricBlue mb-4">Your Deployments</h3>
            {deployments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🚀</div>
                <h4 className="text-lg font-semibold text-gray-400 mb-2">No Deployments Yet</h4>
                <p className="text-gray-500 mb-4">Create your first deployment to get started</p>
                <button
                  onClick={() => setActiveTab('install')}
                  className="px-4 py-2 bg-electricBlue/20 border border-electricBlue/50 rounded-lg text-electricBlue hover:bg-electricBlue/30 transition-all"
                >
                  Start Deployment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {deployments.map(deployment => (
                  <div key={deployment.id} className="bg-black/40 border border-gray-600/30 rounded-lg p-4 hover:border-electricBlue/50 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-softWhite">{deployment.deployment_name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        deployment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        deployment.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {deployment.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Started: {new Date(deployment.started_at).toLocaleString()} • 
                      Devices: {deployment.device_count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'install' && (
        <div className="space-y-6">
          {/* Software Selection */}
          <div className="bg-black/60 border border-electricBlue/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-electricBlue mb-4">Select Software</h3>
        
        {/* Software Selection Method */}
        <div className="mb-4 flex space-x-6">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              name="softwareMethod"
              checked={!useCustomSoftware}
              onChange={() => setUseCustomSoftware(false)}
              className="w-4 h-4 text-electricBlue bg-black/40 border-electricBlue/50 focus:ring-electricBlue focus:ring-2"
            />
            <span className="font-medium text-softWhite">Predefined Software</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              name="softwareMethod"
              checked={useCustomSoftware}
              onChange={() => setUseCustomSoftware(true)}
              className="w-4 h-4 text-electricBlue bg-black/40 border-electricBlue/50 focus:ring-electricBlue focus:ring-2"
            />
            <span className="font-medium text-softWhite">Custom Software</span>
          </label>
        </div>

        {/* Predefined Software Grid */}
        {!useCustomSoftware && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableSoftware.map(software => (
              <label key={software.id} className="flex items-center space-x-3 p-3 bg-black/40 border border-gray-600/30 rounded-lg hover:border-electricBlue/50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={selectedSoftware.includes(software.id)}
                  onChange={() => handleSoftwareToggle(software.id)}
                  className="w-4 h-4 text-electricBlue bg-black/40 border-electricBlue/50 rounded focus:ring-electricBlue focus:ring-2"
                />
                <span className="text-sm font-medium text-softWhite">{software.name}</span>
              </label>
            ))}
          </div>
        )}

        {/* Custom Software Input */}
        {useCustomSoftware && (
          <div className="bg-black/40 border border-gray-600/30 rounded-lg p-4">
            <label className="block text-sm font-medium text-electricBlue mb-2">
              Enter Custom Software Name:
            </label>
            <input
              type="text"
              value={customSoftware}
              onChange={(e) => setCustomSoftware(e.target.value)}
              placeholder="e.g., Adobe Photoshop, Microsoft Office, etc."
              className="w-full px-3 py-2 bg-black/60 border border-electricBlue/30 rounded-lg text-softWhite placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electricBlue focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the name of software you want to deploy that's not in the predefined list.
            </p>
          </div>
        )}
      </div>

      {/* Target Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups */}
        <div className="bg-black/60 border border-electricBlue/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-electricBlue">Groups</h3>
            {loadingGroups && <span className="text-sm text-gray-400">Loading...</span>}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {groups.length === 0 && !loadingGroups ? (
              <div className="text-center p-4 text-gray-400">
                No groups found
              </div>
            ) : (
              groups.map(group => (
                <label key={group.id} className="flex items-center justify-between bg-black/40 border border-gray-600/30 rounded-lg p-3 hover:border-electricBlue/50 cursor-pointer transition-all">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      className="w-4 h-4 text-electricBlue bg-black/40 border-electricBlue/50 rounded focus:ring-electricBlue focus:ring-2"
                    />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color || '#6c63ff' }}
                      ></div>
                      <span className="font-medium text-softWhite">{group.group_name}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {group.devices?.length || 0} devices
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Devices */}
        <div className="bg-black/60 border border-electricBlue/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-electricBlue">Devices</h3>
            {loadingDevices && <span className="text-sm text-gray-400">Loading...</span>}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {devices.length === 0 && !loadingDevices ? (
              <div className="text-center p-4 text-gray-400">
                No devices found
              </div>
            ) : (
              devices.map(device => (
                <label key={device.id} className="flex items-center justify-between bg-black/40 border border-gray-600/30 rounded-lg p-3 hover:border-electricBlue/50 cursor-pointer transition-all">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleDeviceToggle(device.id)}
                      className="w-4 h-4 text-electricBlue bg-black/40 border-electricBlue/50 rounded focus:ring-electricBlue focus:ring-2"
                    />
                    <div>
                      <div className="font-medium text-softWhite">{device.device_name || `Device ${device.id}`}</div>
                      <div className="text-sm text-gray-400">{device.ip_address || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    <span className={device.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                      {device.status || 'unknown'}
                    </span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-black/60 border border-electricBlue/30 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {useCustomSoftware ? 
              `Custom software: ${customSoftware || 'none'}, ` :
              `${selectedSoftware.length} software, `
            }
            {selectedGroups.length} groups, {selectedDevices.length} devices selected
          </div>
          <button
            onClick={handleInstall}
            disabled={
              deploying || 
              (useCustomSoftware ? !customSoftware.trim() : selectedSoftware.length === 0) ||
              (selectedGroups.length === 0 && selectedDevices.length === 0)
            }
            className="px-6 py-2 bg-electricBlue/20 border border-electricBlue/50 rounded-lg text-electricBlue hover:bg-electricBlue/30 disabled:bg-gray-600/20 disabled:text-gray-500 disabled:border-gray-600/50 transition-all font-medium"
          >
            {deploying ? 'Starting Deployment...' : 'Install Software'}
          </button>
        </div>
      </div>
        </div>
      )}

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