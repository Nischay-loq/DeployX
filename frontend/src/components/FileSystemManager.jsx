import { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FolderOpen, 
  File, 
  Download, 
  Trash2, 
  Plus, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Monitor, 
  Users, 
  HardDrive,
  Clock,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Settings,
  Cloud,
  Link,
  ExternalLink
} from 'lucide-react';
import groupsService from '../services/groups';
import devicesService from '../services/devices';
import filesService from '../services/files';
import googleDriveService from '../services/manualGoogleDrive';
import Notification from './jsx/Notification';

export default function FileSystemManager() {
  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  // Target selection states
  const [groups, setGroups] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Deployment states
  const [customPath, setCustomPath] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResults, setDeploymentResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [currentDeploymentId, setCurrentDeploymentId] = useState(null);

  // UI states
  const [currentStep, setCurrentStep] = useState(0); // 0: upload, 1: targets, 2: deploy
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  
  // File preview states
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Refs
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    loadGroups();
    loadDevices();
  }, []);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    const newNotification = { id, message, type };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, type === 'error' ? 6000 : 4000);
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

  // File upload handlers
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    addFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const addFiles = (files) => {
    const newFiles = [];
    
    for (const file of files) {
      const validation = filesService.validateFile(file);
      
      if (validation.isValid) {
        newFiles.push({
          id: Date.now() + Math.random(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          status: 'ready',
          icon: filesService.getFileIcon(file.name),
          source: 'local'
        });
      } else {
        addNotification(`${file.name}: ${validation.errors.join(', ')}`, 'error');
      }
    }
    
    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
      addNotification(`Added ${newFiles.length} file(s)`, 'success');
    }
  };

  // File preview functions
  const handleFilePreview = async (uploadedFile) => {
    setPreviewFile(uploadedFile);
    setShowFilePreview(true);
    setPreviewLoading(true);
    setPreviewContent('');

    try {
      // Check if file can be previewed
      const fileType = uploadedFile.type || 'application/octet-stream';
      const fileName = uploadedFile.name.toLowerCase();
      
      if (fileType.startsWith('text/') || 
          fileName.endsWith('.txt') || 
          fileName.endsWith('.json') || 
          fileName.endsWith('.xml') ||
          fileName.endsWith('.csv') ||
          fileName.endsWith('.md') ||
          fileName.endsWith('.log') ||
          fileName.endsWith('.yaml') ||
          fileName.endsWith('.yml') ||
          fileName.endsWith('.js') ||
          fileName.endsWith('.css') ||
          fileName.endsWith('.html') ||
          fileName.endsWith('.py') ||
          fileName.endsWith('.sh') ||
          fileName.endsWith('.bat')) {
        
        // Read text content
        const text = await readFileAsText(uploadedFile.file);
        setPreviewContent(text);
      } else if (fileType.startsWith('image/')) {
        // For images, create data URL
        const dataUrl = await readFileAsDataURL(uploadedFile.file);
        setPreviewContent(dataUrl);
      } else {
        setPreviewContent('Preview not available for this file type.');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      setPreviewContent('Error loading file preview.');
      addNotification('Failed to load file preview', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const downloadFile = (uploadedFile) => {
    if (uploadedFile.file) {
      const url = URL.createObjectURL(uploadedFile.file);
      const a = document.createElement('a');
      a.href = url;
      a.download = uploadedFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addNotification(`Downloaded ${uploadedFile.name}`, 'success');
    }
  };

  // Google Drive integration functions
  const handleGoogleDriveUpload = async () => {
    try {
      setIsUploading(true);
      addNotification('Opening Google Drive integration...', 'info');
      
      // Use the manual Google Drive process
      const selectedFiles = await googleDriveService.openFilePicker();
      
      if (selectedFiles && selectedFiles.length > 0) {
        handleSelectGoogleDriveFiles(selectedFiles);
        addNotification(`Selected ${selectedFiles.length} file(s) from Google Drive`, 'success');
      } else {
        // User will manually upload files using the upload button
        addNotification('Google Drive opened! Download your files and use "Upload Files" button when ready.', 'success');
      }
    } catch (error) {
      console.error('Google Drive integration error:', error);
      addNotification('Google Drive integration not available. Please use the Upload Files button instead.', 'info');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectGoogleDriveFiles = (selectedFiles) => {
    const newFiles = selectedFiles.map(driveFile => ({
      id: Date.now() + Math.random() + Math.random(),
      file: null, // Will be downloaded when needed
      name: driveFile.name,
      size: driveFile.size || 0,
      type: driveFile.mimeType || 'application/octet-stream',
      lastModified: new Date(driveFile.modifiedTime || Date.now()).getTime(),
      status: 'ready',
      icon: filesService.getFileIcon(driveFile.name),
      source: 'google-drive',
      driveId: driveFile.id,
      downloadUrl: driveFile.downloadUrl,
      iconUrl: driveFile.iconUrl
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    addNotification(`Added ${newFiles.length} file(s) from Google Drive`, 'success');
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
    addNotification('All files cleared', 'info');
  };

  // Target selection handlers
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
    const groupDevices = groups
      .filter(group => selectedGroups.includes(group.id))
      .flatMap(group => (group.devices || []).map(device => device.id));
    
    const allTargetDeviceIds = [...new Set([...groupDevices, ...selectedDevices])];
    return devices.filter(device => allTargetDeviceIds.includes(device.id));
  };

  // Deployment handler
  const handleDeploy = async () => {
    if (uploadedFiles.length === 0) {
      addNotification('Please upload files first', 'error');
      return;
    }

    const targetDevices = getTargetDevices();
    if (targetDevices.length === 0) {
      addNotification('Please select at least one device or group', 'error');
      return;
    }

    // Use default path if none specified
    const deploymentPath = customPath.trim() || '/tmp/deployed_files';

    setIsDeploying(true);
    setDeploymentResults([]);
    
    try {
      // First, upload files to server (including Google Drive files)
      const uploadResponse = await filesService.uploadFiles(uploadedFiles);
      
      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || 'Failed to upload files to server');
      }

      // Prepare deployment data
      const deploymentData = {
        file_ids: uploadResponse.file_ids,
        target_path: deploymentPath,
        device_ids: targetDevices.map(d => d.id),
        group_ids: selectedGroups,
        create_path_if_not_exists: true
      };

      // Start deployment
      const deploymentResponse = await filesService.deployFiles(deploymentData);
      
      if (deploymentResponse.success) {
        // Poll for progress
        const deploymentId = deploymentResponse.deployment_id;
        setCurrentDeploymentId(deploymentId);
        
        // Simulate real-time progress updates
        const pollProgress = async () => {
          try {
            const progressResponse = await filesService.getDeploymentProgress(deploymentId);
            setDeploymentResults(progressResponse.results || []);
            
            // Check if deployment is complete
            const isComplete = progressResponse.results?.every(r => 
              r.status === 'success' || r.status === 'error'
            );
            
            if (!isComplete) {
              setTimeout(pollProgress, 2000); // Poll every 2 seconds
            } else {
              // Deployment complete - re-enable button and show results
              setIsDeploying(false);
              setShowResults(true);
              
              const successCount = progressResponse.results.filter(r => r.status === 'success').length;
              const totalCount = progressResponse.results.length;
              
              if (successCount === totalCount) {
                addNotification(`✅ All ${totalCount} deployments completed successfully!`, 'success');
              } else if (successCount === 0) {
                addNotification(`❌ All ${totalCount} deployments failed`, 'error');
              } else {
                addNotification(`⚠️ ${successCount}/${totalCount} deployments successful`, 'warning');
              }
            }
          } catch (error) {
            console.error('Failed to get progress:', error);
            setIsDeploying(false);
            addNotification('Failed to fetch deployment progress', 'error');
          }
        };
        
        pollProgress();
        addNotification('Deployment started successfully', 'success');
        
      } else {
        throw new Error(deploymentResponse.message || 'Deployment failed to start');
      }
      
    } catch (error) {
      console.error('Deployment error:', error);
      // Better error message handling
      const errorMessage = typeof error === 'string' ? error : (error?.message || 'Deployment failed');
      addNotification(`Deployment failed: ${errorMessage}`, 'error');
      setIsDeploying(false);
    }
  };

  // Fallback simulation function
  const simulateDeployment = async (targetDevices) => {
    const results = [];
    
    for (const device of targetDevices) {
      for (const uploadedFile of uploadedFiles) {
        try {
          // Simulate deployment delay
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          
          // Simulate different outcomes
          const success = Math.random() > 0.2; // 80% success rate
          const pathExists = Math.random() > 0.3; // 70% path exists
          
          if (success) {
            results.push({
              deviceId: device.id,
              deviceName: device.name || device.hostname,
              fileName: uploadedFile.name,
              status: 'success',
              message: pathExists 
                ? `File deployed to existing path: ${customPath}`
                : `Path created and file deployed: ${customPath}`,
              pathCreated: !pathExists
            });
          } else {
            const errorReasons = [
              'Permission denied',
              'Disk space insufficient',
              'Path creation failed - invalid characters',
              'Network connection lost',
              'File already exists and is locked'
            ];
            results.push({
              deviceId: device.id,
              deviceName: device.name || device.hostname,
              fileName: uploadedFile.name,
              status: 'error',
              message: errorReasons[Math.floor(Math.random() * errorReasons.length)]
            });
          }
        } catch (error) {
          results.push({
            deviceId: device.id,
            deviceName: device.name || device.hostname,
            fileName: uploadedFile.name,
            status: 'error',
            message: `Deployment failed: ${error.message}`
          });
        }
      }
    }
    
    setDeploymentResults(results);
    setShowResults(true);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      addNotification(`All ${totalCount} deployments completed successfully!`, 'success');
    } else {
      addNotification(`${successCount}/${totalCount} deployments successful`, 'warning');
    }
  };

  const formatFileSize = (bytes) => {
    return filesService.formatFileSize(bytes);
  };

  const filteredGroups = groups.filter(group => 
    group.group_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDevices = devices.filter(device => 
    (device.device_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (device.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <HardDrive className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">File System Deployment</h2>
            <p className="text-gray-400">Upload and deploy files to remote devices</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResults(!showResults)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              showResults 
                ? 'bg-primary-500/20 border-primary-500/30 text-primary-400'
                : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Results
          </button>
        </div>
      </div>

      {/* Navigation Steps */}
      <div className="flex items-center justify-center space-x-8 mb-8">
        {[
          { id: 0, name: 'Upload Files', icon: Upload, description: 'Add files to deploy' },
          { id: 1, name: 'Select Targets', icon: Monitor, description: 'Choose devices' },
          { id: 2, name: 'Deploy & Monitor', icon: ArrowRight, description: 'Start deployment' }
        ].map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex flex-col items-center ${
              currentStep >= step.id ? 'text-primary-400' : 'text-gray-500'
            }`}>
              <div className={`p-3 rounded-full border-2 transition-all ${
                currentStep >= step.id
                  ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                  : 'bg-gray-800 border-gray-600 text-gray-500'
              }`}>
                <step.icon className="w-6 h-6" />
              </div>
              <div className="mt-2 text-center">
                <div className="font-medium text-sm">{step.name}</div>
                <div className="text-xs text-gray-400">{step.description}</div>
              </div>
            </div>
            {index < 2 && (
              <div className={`w-16 h-0.5 mx-4 mt-6 transition-all ${
                currentStep > step.id ? 'bg-primary-500' : 'bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 0 && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div className="card-dark">
            <h3 className="text-lg font-semibold text-white mb-4">Upload Files</h3>
            
            {/* Upload Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Local Upload */}
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-white mb-2">
                  Local Files
                </h4>
                <p className="text-gray-400 mb-3">
                  Drop files here or click to browse
                </p>
                <button className="btn-primary btn-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Choose Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Google Drive Upload */}
              <div
                className="relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer border-gray-600 hover:border-gray-500"
                onClick={handleGoogleDriveUpload}
              >
                <Cloud className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-white mb-2">
                  Google Drive
                </h4>
                <p className="text-gray-400 mb-3">
                  Browse & download files from Drive
                </p>
                <button className="btn-secondary btn-sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Drive
                </button>
              </div>
            </div>

            <div className="text-center text-sm text-gray-400 mb-4">
              Support for all file types • Maximum 100MB per file
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-white">
                    Files Ready for Deployment ({uploadedFiles.length})
                  </h4>
                  <button
                    onClick={clearAllFiles}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {uploadedFiles.map((uploadedFile) => (
                    <div
                      key={uploadedFile.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <File className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          {uploadedFile.source === 'google-drive' && (
                            <Cloud className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">
                            {uploadedFile.name}
                          </div>
                          <div className="text-sm text-gray-400">
                            {formatFileSize(uploadedFile.size)} • {uploadedFile.source === 'google-drive' ? 'Google Drive' : 'Local'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFilePreview(uploadedFile)}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                          title="Preview file"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadFile(uploadedFile)}
                          className="text-green-400 hover:text-green-300 transition-colors p-1"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFile(uploadedFile.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Next Step Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="btn-primary"
                  >
                    Next: Select Targets
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(0)}
              className="btn-secondary"
            >
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Back to Upload
            </button>
            <div className="text-sm text-gray-400">
              {uploadedFiles.length} file(s) ready for deployment
            </div>
          </div>

          {/* Search */}
          <div className="card-dark">
            <div className="flex items-center gap-3 mb-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search devices and groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Groups */}
            <div className="card-dark">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                Device Groups ({selectedGroups.length} selected)
              </h3>
              
              {loadingGroups ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchQuery ? 'No groups match your search' : 'No groups available'}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedGroups.includes(group.id)
                          ? 'bg-orange-500/20 border-orange-500/30'
                          : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                      }`}
                      onClick={() => handleGroupToggle(group.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{group.group_name}</div>
                          <div className="text-sm text-gray-400">
                            {group.devices?.length || 0} devices
                          </div>
                        </div>
                        {selectedGroups.includes(group.id) && (
                          <CheckCircle className="w-5 h-5 text-orange-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Individual Devices */}
            <div className="card-dark">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                Individual Devices ({selectedDevices.length} selected)
              </h3>
              
              {loadingDevices ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {searchQuery ? 'No devices match your search' : 'No devices available'}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedDevices.includes(device.id)
                          ? 'bg-blue-500/20 border-blue-500/30'
                          : 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50'
                      }`}
                      onClick={() => handleDeviceToggle(device.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">
                            {device.device_name || `Device ${device.id}`}
                          </div>
                          <div className="text-sm text-gray-400">
                            {device.ip_address} • {device.os || 'Unknown OS'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Status: {device.status} • {device.connection_type || 'Unknown'}
                          </div>
                        </div>
                        {selectedDevices.includes(device.id) && (
                          <CheckCircle className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {(selectedGroups.length > 0 || selectedDevices.length > 0) && (
            <div className="card-dark">
              <h4 className="text-lg font-medium text-white mb-3">Deployment Summary</h4>
              <div className="text-sm text-gray-300 mb-4">
                Files will be deployed to <span className="text-primary-400 font-medium">
                  {getTargetDevices().length} device(s)
                </span>
                {selectedGroups.length > 0 && (
                  <span> from {selectedGroups.length} group(s)</span>
                )}
                {selectedDevices.length > 0 && (
                  <span> and {selectedDevices.length} individual device(s)</span>
                )}
              </div>
              
              {/* Next Step Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="btn-primary"
                >
                  Next: Configure Deployment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="btn-secondary"
            >
              <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
              Back to Targets
            </button>
            <div className="text-sm text-gray-400">
              Ready to deploy to {getTargetDevices().length} device(s)
            </div>
          </div>

          {/* Deployment Configuration */}
          <div className="card-dark">
            <h3 className="text-lg font-semibold text-white mb-4">Deployment Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Path <span className="text-gray-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="/path/to/destination (leave empty for default: /tmp/deployed_files)"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Path will be created automatically if it doesn't exist. Default: /tmp/deployed_files
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-800/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Files to deploy:</span>
                  <span className="text-white font-medium">{uploadedFiles.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Target devices:</span>
                  <span className="text-white font-medium">{getTargetDevices().length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Target path:</span>
                  <span className="text-white font-medium">
                    {customPath.trim() || '/tmp/deployed_files'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total operations:</span>
                  <span className="text-white font-medium">
                    {uploadedFiles.length * getTargetDevices().length}
                  </span>
                </div>
              </div>

              <button
                onClick={handleDeploy}
                disabled={isDeploying || uploadedFiles.length === 0 || getTargetDevices().length === 0}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeploying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Start Deployment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Results Modal */}
      {showResults && deploymentResults.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">File Deployment Results</h3>
                  <p className="text-gray-400">
                    {deploymentResults.filter(r => r.status === 'success').length} of {deploymentResults.length} operations completed successfully
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden p-6">
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="text-2xl font-bold text-white">
                      {deploymentResults.length}
                    </div>
                    <div className="text-sm text-gray-400">Total Operations</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">
                      {deploymentResults.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-green-300">Successful</div>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-400">
                      {deploymentResults.filter(r => r.status === 'error' || r.status === 'failed').length}
                    </div>
                    <div className="text-sm text-red-300">Failed</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400">
                      {deploymentResults.filter(r => r.pathCreated).length}
                    </div>
                    <div className="text-sm text-blue-300">Paths Created</div>
                  </div>
                </div>

                {/* Detailed Results Table */}
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-blue-400" />
                      Deployment Details ({deploymentResults.length} operations)
                    </h4>
                  </div>
                  
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50 sticky top-0">
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">File Name</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Device</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">IP Address</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Path Created</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Message</th>
                          <th className="text-left py-3 px-4 text-gray-300 font-medium">Deployed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deploymentResults.map((result, index) => {
                          const device = devices.find(d => d.id === result.deviceId);
                          return (
                            <tr key={index} className="border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <File className="w-4 h-4 text-blue-400" />
                                  <span className="text-white font-medium">{result.fileName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-white">
                                {result.deviceName || device?.device_name || `Device ${result.deviceId}`}
                              </td>
                              <td className="py-3 px-4 text-gray-400">
                                {device?.ip_address || 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                  result.status === 'success' 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                  {result.status === 'success' ? (
                                    <CheckCircle className="w-3 h-3" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3" />
                                  )}
                                  {result.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {result.pathCreated ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    <Plus className="w-3 h-3" />
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs">No</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className={`text-sm ${
                                  result.status === 'success' ? 'text-green-300' : 'text-red-300'
                                }`}>
                                  {result.message}
                                </div>
                                {result.errorDetails && (
                                  <div className="text-xs text-red-400 mt-1 opacity-75">
                                    {result.errorDetails}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-gray-400 text-sm">
                                {result.deployedAt ? new Date(result.deployedAt).toLocaleString() : 
                                 result.status === 'success' ? 'Just now' : 'N/A'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                  <div className="text-sm text-gray-400">
                    Target Path: <span className="text-white font-mono">{customPath.trim() || '/tmp/deployed_files'}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        // Clear current results and prepare for new deployment
                        setDeploymentResults([]);
                        setShowResults(false);
                        setCurrentStep(0);
                        setUploadedFiles([]);
                        setSelectedGroups([]);
                        setSelectedDevices([]);
                        setCustomPath('');
                      }}
                      className="btn-secondary"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Deployment
                    </button>
                    <button
                      onClick={() => setShowResults(false)}
                      className="btn-primary"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showFilePreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {previewFile?.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(previewFile?.size || 0)} • {previewFile?.type || 'Unknown type'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFile(previewFile)}
                  className="btn-secondary btn-sm"
                  title="Download file"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setShowFilePreview(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                  <span className="ml-3 text-gray-400">Loading preview...</span>
                </div>
              ) : previewContent ? (
                <div className="space-y-4">
                  {previewFile?.type?.startsWith('image/') && previewContent.startsWith('data:') ? (
                    // Image preview
                    <div className="text-center">
                      <img
                        src={previewContent}
                        alt={previewFile.name}
                        className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                      />
                    </div>
                  ) : (
                    // Text content preview
                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                        {previewContent.length > 10000 
                          ? previewContent.slice(0, 10000) + '\n\n... (Content truncated. Download file to view complete content)'
                          : previewContent
                        }
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <File className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p>Preview not available for this file type.</p>
                  <p className="text-sm mt-2">You can still download the file to view it.</p>
                </div>
              )}
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