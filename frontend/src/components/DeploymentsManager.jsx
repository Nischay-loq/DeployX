import { useState, useEffect } from 'react';
import { Calendar, Play } from 'lucide-react';
import deploymentsService from '../services/deployments';
import groupsService from '../services/groups';
import devicesService from '../services/devices';
import schedulingService from '../services/scheduling';
import ProgressModal from './ProgressModal';
import ConfirmDialog from './ConfirmDialog';
import SchedulingModal from './SchedulingModal';

export default function DeploymentsManager() {
  // Software selection
  const [availableSoftware, setAvailableSoftware] = useState([]);
  const [selectedSoftware, setSelectedSoftware] = useState([]);
  const [customSoftware, setCustomSoftware] = useState('');
  const [useCustomSoftware, setUseCustomSoftware] = useState(false);
  const [softwareFilter, setSoftwareFilter] = useState('all');
  const [softwareSearch, setSoftwareSearch] = useState('');

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
  
  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Error handling
  const [error, setError] = useState('');

  // Tab management and deployments list
  const [activeTab, setActiveTab] = useState('deployments');
  const [deployments, setDeployments] = useState([]);
  
  // Deployment Details Modal State
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [selectedDeploymentDetails, setSelectedDeploymentDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Scheduling state
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingData, setSchedulingData] = useState(null);

  useEffect(() => {
    // Load initial data
    loadSoftware();
    loadGroups();
    loadDevices();
    loadDeployments();
  }, []);

  const loadSoftware = async () => {
    setError('');
    try {
      const response = await deploymentsService.fetchSoftware();
      setAvailableSoftware(response || []);
    } catch (err) {
      console.error('Failed to load software:', err);
      // Fallback to hardcoded software
      const fallbackSoftware = deploymentsService.getAvailableSoftware();
      setAvailableSoftware(fallbackSoftware);
    }
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
      
      // Provide more specific error messages
      if (err.message.includes('Unable to connect') || err.message.includes('Failed to fetch')) {
        setError('Unable to connect to the server. Please check if the backend is running on port 8000.');
      } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        setError('Authentication required. Please log in again.');
      } else if (err.message.includes('CORS')) {
        setError('Network access blocked. Please check server configuration.');
      } else {
        setError(`Failed to load deployments: ${err.message}`);
      }
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

  // Get all target devices (from selected groups and individual devices)
  const getTargetDevices = () => {
    // Return empty array if data is still loading
    if (loadingGroups || loadingDevices) {
      return [];
    }
    
    // Get devices from selected groups
    const groupDevices = groups
      .filter(group => selectedGroups.includes(group.id))
      .flatMap(group => (group.devices || []).map(device => device.id));
    
    // Combine with individually selected devices and remove duplicates
    const allTargetDeviceIds = [...new Set([...groupDevices, ...selectedDevices])];
    
    // Return actual device objects
    return devices.filter(device => allTargetDeviceIds.includes(device.id));
  };

  // Scheduling functions
  const openSchedulingModal = () => {
    const hasSoftware = useCustomSoftware ? 
      customSoftware.trim().length > 0 : 
      selectedSoftware.length > 0;
    
    if (!hasSoftware) {
      alert('Please select software to install or enter custom software.');
      return;
    }

    if (getTargetDevices().length === 0) {
      alert('Please select at least one group or device.');
      return;
    }

    const taskData = {
      device_ids: selectedDevices,
      group_ids: selectedGroups,
      software_payload: {
        software_ids: useCustomSoftware ? [] : selectedSoftware,
        custom_software: useCustomSoftware ? customSoftware.trim() : null,
        deployment_name: useCustomSoftware ? 
          `Custom Software: ${customSoftware.trim()}` : 
          `Software Installation - ${new Date().toLocaleString()}`
      }
    };

    const targetDevices = getTargetDevices();
    const targetInfo = `${targetDevices.length} devices (${selectedGroups.length} groups, ${selectedDevices.length} individual devices)`;

    setSchedulingData({ taskData, targetInfo });
    setShowSchedulingModal(true);
  };

  const handleSchedule = async (schedulePayload) => {
    try {
      await schedulingService.createScheduledTask(schedulePayload);
      alert('Software deployment scheduled successfully!');
      setShowSchedulingModal(false);
    } catch (error) {
      console.error('Scheduling error:', error);
      throw error;
    }
  };

  const handleExecuteNow = async () => {
    setShowSchedulingModal(false);
    await handleInstall();
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

    // Check if we have target devices (using the accurate function)
    if (getTargetDevices().length === 0) {
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
    // Check if deployment is still in progress
    const inProgress = deploymentProgress.some(
      device => device.status === 'in_progress' || device.status === 'downloading' || device.status === 'installing'
    );
    
    if (inProgress) {
      setShowConfirmDialog(true);
    } else {
      // No in-progress deployments, close directly
      setShowProgressModal(false);
      setCurrentDeploymentId(null);
      setDeploymentProgress([]);
    }
  };
  
  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    setShowProgressModal(false);
    setCurrentDeploymentId(null);
    setDeploymentProgress([]);
  };
  
  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const handleDeploymentClick = async (deployment) => {
    setModalLoading(true);
    setShowDeploymentModal(true);
    
    try {
      // Fetch detailed deployment information
      const [deploymentDetails, targetDevices, targetGroups] = await Promise.all([
        deploymentsService.getDeploymentDetails(deployment.id),
        deploymentsService.getDeploymentDevices(deployment.id),
        deploymentsService.getDeploymentGroups(deployment.id)
      ]);

      setSelectedDeploymentDetails({
        ...deployment,
        ...deploymentDetails,
        targetDevices: targetDevices || [],
        targetGroups: targetGroups || [],
        software: deploymentDetails.software || []
      });
    } catch (error) {
      console.error('Error fetching deployment details:', error);
      setSelectedDeploymentDetails({
        ...deployment,
        targetDevices: [],
        targetGroups: [],
        software: []
      });
    } finally {
      setModalLoading(false);
    }
  };

  const closeDeploymentModal = () => {
    setShowDeploymentModal(false);
    setSelectedDeploymentDetails(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-nowrap">
        <div className="flex items-center gap-3 flex-nowrap min-w-0">
          <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
            <Play className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white whitespace-nowrap">Software Deployments</h2>
          <span className="text-gray-400 whitespace-nowrap">•</span>
          <p className="text-gray-400 whitespace-nowrap">Install and manage software across your fleet</p>
        </div>
        <div className="text-sm text-gray-500 flex-shrink-0 whitespace-nowrap">
          {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
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
                  <div 
                    key={deployment.id} 
                    className="bg-black/40 border border-gray-600/30 rounded-lg p-4 hover:border-electricBlue/50 transition-all cursor-pointer transform hover:scale-[1.02]"
                    onClick={() => handleDeploymentClick(deployment)}
                  >
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
                    {deployment.software && deployment.software.length > 0 && (
                      <div className="text-sm text-gray-400 mt-1">
                        Software: {deployment.software.map(sw => sw.name).join(', ')}
                      </div>
                    )}
                    {deployment.custom_software && (
                      <div className="text-sm text-gray-400 mt-1">
                        Custom: {deployment.custom_software.length > 50 ? deployment.custom_software.substring(0, 50) + '...' : deployment.custom_software}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-electricBlue/70">
                      Click to view deployment details →
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

        {/* Search and Filter */}
        {!useCustomSoftware && (
          <div className="mb-4 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={softwareSearch}
                onChange={(e) => setSoftwareSearch(e.target.value)}
                placeholder="Search software..."
                className="w-full px-4 py-2 pl-10 bg-black/40 border border-gray-600/30 rounded-lg text-softWhite placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electricBlue focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {['all', 'browsers', 'development', 'communication', 'utilities', 'productivity', 'media', 'security'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSoftwareFilter(category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    softwareFilter === category
                      ? 'bg-electricBlue text-white'
                      : 'bg-black/40 text-gray-400 hover:bg-black/60 hover:text-softWhite border border-gray-600/30'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Selected Count */}
            {selectedSoftware.length > 0 && (
              <div className="flex items-center justify-between bg-electricBlue/10 border border-electricBlue/30 rounded-lg px-4 py-2">
                <span className="text-sm text-electricBlue font-medium">
                  {selectedSoftware.length} software selected
                </span>
                <button
                  onClick={() => setSelectedSoftware([])}
                  className="text-xs text-gray-400 hover:text-softWhite transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Predefined Software Grid */}
        {!useCustomSoftware && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {availableSoftware
              .filter(software => {
                // Category filter
                if (softwareFilter !== 'all' && software.category !== softwareFilter) {
                  return false;
                }
                // Search filter
                if (softwareSearch && !software.name.toLowerCase().includes(softwareSearch.toLowerCase())) {
                  return false;
                }
                return true;
              })
              .map(software => (
              <div 
                key={software.id}
                onClick={() => handleSoftwareToggle(software.id)}
                className={`group relative p-4 bg-gradient-to-br from-black/40 to-black/20 border rounded-xl cursor-pointer transition-all transform hover:scale-105 ${
                  selectedSoftware.includes(software.id)
                    ? 'border-electricBlue shadow-lg shadow-electricBlue/20 bg-electricBlue/10'
                    : 'border-gray-600/30 hover:border-electricBlue/50'
                }`}
              >
                {/* Logo */}
                <div className="flex items-center justify-center h-16 mb-3">
                  {software.icon_url ? (
                    <img 
                      src={software.icon_url} 
                      alt={software.name}
                      className="h-14 w-14 object-contain"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>';
                      }}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-electricBlue/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-2xl font-bold text-electricBlue">
                        {software.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Software Name */}
                <div className="text-center">
                  <h4 className="text-sm font-semibold text-softWhite mb-1 line-clamp-2">
                    {software.name}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {software.version}
                  </p>
                  {software.category && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-electricBlue/10 text-electricBlue border border-electricBlue/30">
                      {software.category}
                    </span>
                  )}
                </div>
                
                {/* Selected Indicator */}
                {selectedSoftware.includes(software.id) && (
                  <div className="absolute top-2 right-2">
                    <div className="h-6 w-6 rounded-full bg-electricBlue flex items-center justify-center">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                
                {/* Hover Tooltip */}
                {software.description && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-xl border border-electricBlue/30">
                      {software.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
          <div className="space-y-1">
            <div className="text-sm text-gray-400">
              {useCustomSoftware ? 
                `Custom software: ${customSoftware || 'none'}` :
                `${selectedSoftware.length} software selected`
              }
            </div>
            <div className="text-sm font-medium text-electricBlue">
              Target: {getTargetDevices().length} total devices
              {selectedGroups.length > 0 && selectedDevices.length > 0 && 
                ` (${selectedGroups.length} groups + ${selectedDevices.length} individual)`
              }
              {selectedGroups.length > 0 && selectedDevices.length === 0 && 
                ` (from ${selectedGroups.length} groups)`
              }
              {selectedGroups.length === 0 && selectedDevices.length > 0 && 
                ` (${selectedDevices.length} individual)`
              }
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={openSchedulingModal}
              disabled={
                deploying || 
                (useCustomSoftware ? !customSoftware.trim() : selectedSoftware.length === 0) ||
                getTargetDevices().length === 0
              }
              className="flex items-center gap-2 px-6 py-2 bg-blue-600/30 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-600/40 disabled:bg-gray-600/20 disabled:text-gray-500 disabled:border-gray-600/50 transition-all font-medium"
            >
              <Calendar className="w-4 h-4" />
              Schedule Installation
            </button>
            <button
              onClick={handleInstall}
              disabled={
                deploying || 
                (useCustomSoftware ? !customSoftware.trim() : selectedSoftware.length === 0) ||
                getTargetDevices().length === 0
              }
              className="flex items-center gap-2 px-6 py-2 bg-electricBlue/20 border border-electricBlue/50 rounded-lg text-electricBlue hover:bg-electricBlue/30 disabled:bg-gray-600/20 disabled:text-gray-500 disabled:border-gray-600/50 transition-all font-medium"
            >
              {deploying ? 'Starting Deployment...' : 'Install Now'}
            </button>
          </div>
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

      {/* Deployment Details Modal */}
      {showDeploymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 border border-electricBlue/30 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-purple-400 text-2xl">🚀</span>
                <h2 className="text-xl font-bold text-electricBlue">Deployment Details</h2>
              </div>
              <button
                onClick={closeDeploymentModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {modalLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electricBlue"></div>
                <span className="ml-3 text-gray-400">Loading deployment details...</span>
              </div>
            ) : selectedDeploymentDetails ? (
              <div className="space-y-6">
                {/* Deployment Overview */}
                <div className="bg-black/60 border border-electricBlue/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-electricBlue mb-3">Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Deployment Name</p>
                      <p className="font-medium text-softWhite">{selectedDeploymentDetails.deployment_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        selectedDeploymentDetails.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        selectedDeploymentDetails.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {selectedDeploymentDetails.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Started At</p>
                      <p className="font-medium text-softWhite">
                        {new Date(selectedDeploymentDetails.started_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Device Count</p>
                      <p className="font-medium text-softWhite">{selectedDeploymentDetails.device_count}</p>
                    </div>
                  </div>
                </div>

                {/* Software Details */}
                {selectedDeploymentDetails.software && selectedDeploymentDetails.software.length > 0 && (
                  <div className="bg-black/60 border border-electricBlue/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-electricBlue mb-3">Installed Software</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedDeploymentDetails.software.map((software, index) => (
                        <div key={index} className="bg-black/40 border border-gray-600/30 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-softWhite">{software.name || software}</h4>
                              {software.version && (
                                <p className="text-sm text-gray-400">Version: {software.version}</p>
                              )}
                              {software.installation_path && (
                                <p className="text-xs text-electricBlue/70 mt-1">
                                  Path: {software.installation_path}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-green-400">✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Software */}
                {selectedDeploymentDetails.custom_software && (
                  <div className="bg-black/60 border border-electricBlue/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-electricBlue mb-3">Custom Software</h3>
                    <div className="bg-black/40 border border-gray-600/30 rounded-lg p-3">
                      <p className="font-medium text-softWhite">{selectedDeploymentDetails.custom_software}</p>
                    </div>
                  </div>
                )}

                {/* Target Devices */}
                {selectedDeploymentDetails.targetDevices && selectedDeploymentDetails.targetDevices.length > 0 && (
                  <div className="bg-black/60 border border-electricBlue/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-electricBlue mb-3">
                      Target Devices ({selectedDeploymentDetails.targetDevices.length})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600/30">
                            <th className="text-left py-2 text-gray-400">Device Name</th>
                            <th className="text-left py-2 text-gray-400">IP Address</th>
                            <th className="text-left py-2 text-gray-400">Status</th>
                            <th className="text-left py-2 text-gray-400">Deployment Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDeploymentDetails.targetDevices.map((device, index) => (
                            <tr key={index} className="border-b border-gray-700/30">
                              <td className="py-2 text-softWhite">{device.device_name || `Device ${device.id}`}</td>
                              <td className="py-2 text-gray-400">{device.ip_address || 'N/A'}</td>
                              <td className="py-2">
                                <span className={`text-xs ${device.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                                  {device.status || 'unknown'}
                                </span>
                              </td>
                              <td className="py-2">
                                <span className={`text-xs ${
                                  device.deployment_status === 'success' ? 'text-green-400' :
                                  device.deployment_status === 'failed' ? 'text-red-400' :
                                  'text-yellow-400'
                                }`}>
                                  {device.deployment_status || 'pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Target Groups */}
                {selectedDeploymentDetails.targetGroups && selectedDeploymentDetails.targetGroups.length > 0 && (
                  <div className="bg-black/60 border border-electricBlue/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-electricBlue mb-3">
                      Target Groups ({selectedDeploymentDetails.targetGroups.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedDeploymentDetails.targetGroups.map((group, index) => (
                        <div key={index} className="bg-black/40 border border-gray-600/30 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: group.color || '#6c63ff' }}
                            ></div>
                            <div>
                              <h4 className="font-medium text-softWhite">{group.group_name}</h4>
                              <p className="text-sm text-gray-400">
                                {group.device_count || 0} devices
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Target Information */}
                {(!selectedDeploymentDetails.targetDevices || selectedDeploymentDetails.targetDevices.length === 0) &&
                 (!selectedDeploymentDetails.targetGroups || selectedDeploymentDetails.targetGroups.length === 0) && (
                  <div className="bg-black/60 border border-electricBlue/20 rounded-lg p-4">
                    <div className="text-center py-6">
                      <div className="text-4xl mb-2">📋</div>
                      <h3 className="text-lg font-semibold text-gray-400 mb-2">No Target Information</h3>
                      <p className="text-gray-500">Target devices and groups information is not available for this deployment.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">❌</div>
                <h4 className="text-lg font-semibold text-gray-400 mb-2">Failed to Load</h4>
                <p className="text-gray-500">Could not load deployment details. Please try again.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Confirmation Dialog for Closing Progress Modal */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Deployment in Progress"
        message="Deployment is still in progress. Are you sure you want to close this window?

Note: The deployment will continue running in the background."
        confirmText="Close Anyway"
        cancelText="Keep Open"
        type="warning"
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />

      {/* Scheduling Modal */}
      {showSchedulingModal && (
        <SchedulingModal
          isOpen={showSchedulingModal}
          onClose={() => setShowSchedulingModal(false)}
          onSchedule={handleSchedule}
          onExecuteNow={handleExecuteNow}
          taskType="software_deployment"
          taskData={schedulingData?.taskData}
          targetInfo={schedulingData?.targetInfo}
        />
      )}
    </div>
  );
}