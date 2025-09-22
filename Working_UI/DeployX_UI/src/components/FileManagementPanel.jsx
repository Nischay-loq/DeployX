import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Cloud, FolderOpen, Users, Monitor, Rocket, CheckCircle, AlertCircle, Loader, 
         History, Settings, Play, Pause, RefreshCw, Trash2, Download, Eye, Server, 
         Activity, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import GoogleDriveUpload from './GoogleDriveUpload';

const FileManagementPanel = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [deploymentProgress, setDeploymentProgress] = useState({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [bulkDeployConfig, setBulkDeployConfig] = useState({
    agents: [],
    groups: [],
    destinationPath: ''
  });
  const [activeSection, setActiveSection] = useState('upload');
  const [agentDetails, setAgentDetails] = useState({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAgents();
    fetchGroups();
    fetchDeploymentHistory();
    fetchAgentDetails();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/devices/`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/groups/`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchDeploymentHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/deployments/history`);
      if (response.ok) {
        const data = await response.json();
        setDeploymentHistory(data);
      }
    } catch (error) {
      console.error('Error fetching deployment history:', error);
      // Mock data for demonstration
      setDeploymentHistory([
        {
          id: 1,
          fileName: 'app.zip',
          agents: ['Agent-001', 'Agent-002'],
          status: 'completed',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          duration: '2m 34s'
        },
        {
          id: 2,
          fileName: 'config.json',
          agents: ['Agent-003'],
          status: 'failed',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          duration: '45s'
        },
        {
          id: 3,
          fileName: 'update.tar.gz',
          agents: ['Agent-001', 'Agent-003', 'Agent-004'],
          status: 'completed',
          timestamp: new Date(Date.now() - 259200000).toISOString(),
          duration: '5m 12s'
        }
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchAgentDetails = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/agents/details`);
      if (response.ok) {
        const data = await response.json();
        setAgentDetails(data);
      }
    } catch (error) {
      console.error('Error fetching agent details:', error);
      // Mock data for demonstration
      setAgentDetails({
        'Agent-001': { 
          status: 'online', 
          lastSeen: new Date(Date.now() - 300000), 
          deployments: 12,
          cpuUsage: 45,
          memoryUsage: 67
        },
        'Agent-002': { 
          status: 'online', 
          lastSeen: new Date(Date.now() - 150000), 
          deployments: 8,
          cpuUsage: 23,
          memoryUsage: 34
        },
        'Agent-003': { 
          status: 'offline', 
          lastSeen: new Date(Date.now() - 1800000), 
          deployments: 15,
          cpuUsage: 0,
          memoryUsage: 0
        },
        'Agent-004': { 
          status: 'online', 
          lastSeen: new Date(Date.now() - 60000), 
          deployments: 23,
          cpuUsage: 78,
          memoryUsage: 89
        }
      });
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = async (files) => {
    setIsUploading(true);
    
    for (const file of files) {
      await uploadFile(file);
    }
    
    setIsUploading(false);
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newFile = {
          id: result.file_id,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString(),
          selectedAgents: [],
          selectedGroups: [],
          destinationPath: '',
          status: 'uploaded'
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload ${file.name}`);
    }
  };

  const handleGoogleDriveFiles = (googleFiles) => {
    const newFiles = googleFiles.map(gFile => ({
      id: `gd_${gFile.id}`,
      name: gFile.name,
      size: gFile.size || 0,
      type: gFile.mimeType,
      uploadDate: new Date().toISOString(),
      selectedAgents: [],
      selectedGroups: [],
      destinationPath: '',
      status: 'from_google_drive',
      googleDriveId: gFile.id,
      googleDriveUrl: gFile.webViewLink
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setShowGoogleDriveModal(false);
  };

  const updateFileConfig = (fileId, field, value) => {
    setUploadedFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, [field]: value } : file
      )
    );
  };

  const canDeploy = (file) => {
    return (file.selectedAgents.length > 0 || file.selectedGroups.length > 0);
  };

  const deployFile = async (file) => {
    if (!canDeploy(file)) {
      alert('Please select at least one agent or group for deployment');
      return;
    }

    setIsDeploying(true);
    
    try {
      const deploymentData = {
        files: [{ id: file.id, name: file.name }],
        destination_path: file.destinationPath || '%USERPROFILE%\\Downloads',
        deployment_mode: file.selectedAgents.length > 0 ? 'agents' : 'groups',
        targets: file.selectedAgents.length > 0 ? file.selectedAgents : file.selectedGroups
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/files/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData),
      });

      if (response.ok) {
        const result = await response.json();
        updateFileConfig(file.id, 'status', 'deploying');
        // Start monitoring deployment progress
        monitorDeployment(result.deployment_id, file.id);
      } else {
        throw new Error('Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert('Failed to start deployment');
    } finally {
      setIsDeploying(false);
    }
  };

  const monitorDeployment = async (deploymentId, fileId) => {
    const checkProgress = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/files/deployments/${deploymentId}/status`
        );
        
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'completed') {
            updateFileConfig(fileId, 'status', 'deployed');
          } else if (status.status === 'failed') {
            updateFileConfig(fileId, 'status', 'failed');
          } else {
            setTimeout(checkProgress, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking deployment status:', error);
        updateFileConfig(fileId, 'status', 'failed');
      }
    };

    checkProgress();
  };

  // Bulk Operations Functions
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    const allFileIds = uploadedFiles.map(file => file.id);
    setSelectedFiles(allFileIds);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const bulkDeploy = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to deploy');
      return;
    }

    if (bulkDeployConfig.agents.length === 0 && bulkDeployConfig.groups.length === 0) {
      alert('Please select target agents or groups');
      return;
    }

    setIsDeploying(true);

    try {
      const selectedFileObjects = uploadedFiles.filter(file => selectedFiles.includes(file.id));
      
      const deploymentData = {
        files: selectedFileObjects.map(file => ({ id: file.id, name: file.name })),
        destination_path: bulkDeployConfig.destinationPath || '%USERPROFILE%\\Downloads',
        deployment_mode: bulkDeployConfig.agents.length > 0 ? 'agents' : 'groups',
        targets: bulkDeployConfig.agents.length > 0 ? bulkDeployConfig.agents : bulkDeployConfig.groups
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/files/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData),
      });

      if (response.ok) {
        const result = await response.json();
        // Update status for all selected files
        selectedFiles.forEach(fileId => {
          updateFileConfig(fileId, 'status', 'deploying');
        });
        
        // Monitor bulk deployment
        monitorBulkDeployment(result.deployment_id, selectedFiles);
        clearSelection();
      } else {
        throw new Error('Bulk deployment failed');
      }
    } catch (error) {
      console.error('Bulk deployment error:', error);
      alert('Failed to start bulk deployment');
    } finally {
      setIsDeploying(false);
    }
  };

  const monitorBulkDeployment = async (deploymentId, fileIds) => {
    const checkProgress = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/files/deployments/${deploymentId}/status`
        );
        
        if (response.ok) {
          const status = await response.json();
          
          if (status.status === 'completed') {
            fileIds.forEach(fileId => updateFileConfig(fileId, 'status', 'deployed'));
          } else if (status.status === 'failed') {
            fileIds.forEach(fileId => updateFileConfig(fileId, 'status', 'failed'));
          } else {
            setTimeout(checkProgress, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking bulk deployment status:', error);
        fileIds.forEach(fileId => updateFileConfig(fileId, 'status', 'failed'));
      }
    };

    checkProgress();
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedFiles.length} file(s)?`)) {
      return;
    }

    try {
      for (const fileId of selectedFiles) {
        await fetch(`${import.meta.env.VITE_API_URL}/files/${fileId}`, {
          method: 'DELETE',
        });
      }
      
      setUploadedFiles(prev => prev.filter(file => !selectedFiles.includes(file.id)));
      clearSelection();
    } catch (error) {
      console.error('Error deleting files:', error);
      alert('Failed to delete some files');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'deployed': return <CheckCircle className="w-4 h-4 text-[#81c784]" />;
      case 'deploying': return <Loader className="w-4 h-4 text-[#4dd0e1] animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <FolderOpen className="w-4 h-4 text-[#e0e0e0]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#4dd0e1]/20 rounded-lg">
          <FolderOpen className="w-6 h-6 text-[#4dd0e1]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#e0e0e0]">File Management</h2>
          <p className="text-[#a0a0a0]">Upload, deploy, and manage files across connected agents</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[#232338] border border-[#3a3a4c] rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveSection('upload')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
            activeSection === 'upload'
              ? 'bg-[#4dd0e1] text-[#1a1a2e]'
              : 'text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#3a3a4c]'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload Files
        </button>
        <button
          onClick={() => setActiveSection('agents')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
            activeSection === 'agents'
              ? 'bg-[#4dd0e1] text-[#1a1a2e]'
              : 'text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#3a3a4c]'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Agents Overview
        </button>
        <button
          onClick={() => setActiveSection('bulk')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
            activeSection === 'bulk'
              ? 'bg-[#4dd0e1] text-[#1a1a2e]'
              : 'text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#3a3a4c]'
          }`}
        >
          <Play className="w-4 h-4" />
          Bulk Operations
        </button>
        <button
          onClick={() => setActiveSection('history')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
            activeSection === 'history'
              ? 'bg-[#4dd0e1] text-[#1a1a2e]'
              : 'text-[#a0a0a0] hover:text-[#e0e0e0] hover:bg-[#3a3a4c]'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Upload Files Section */}
      {activeSection === 'upload' && (
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="bg-[#232338] border border-[#3a3a4c] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#e0e0e0] mb-4">Upload Files</h3>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-[#4dd0e1] hover:bg-[#4dd0e1]/80 rounded-lg text-[#1a1a2e] font-medium transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
          
          <button 
            onClick={() => setShowGoogleDriveModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#232338] border border-[#4dd0e1] hover:bg-[#4dd0e1]/10 rounded-lg text-[#4dd0e1] font-medium transition-all"
          >
            <Cloud className="w-4 h-4" />
            Connect Google Drive
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragOver 
              ? 'border-[#4dd0e1] bg-[#4dd0e1]/5 shadow-lg shadow-[#4dd0e1]/20' 
              : 'border-[#3a3a4c] hover:border-[#4dd0e1]/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-12 h-12 ${isDragOver ? 'text-[#4dd0e1]' : 'text-[#6a6a80]'}`} />
            <div>
              <p className="text-[#e0e0e0] font-medium">Drag & Drop files here</p>
              <p className="text-[#a0a0a0] text-sm">or click the Upload File button above</p>
            </div>
          </div>
          
          {isUploading && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Loader className="w-4 h-4 text-[#4dd0e1] animate-spin" />
              <span className="text-[#4dd0e1] text-sm">Uploading...</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File & Deployment Configuration */}
      {uploadedFiles.length > 0 && (
        <div className="bg-[#232338] border border-[#3a3a4c] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-[#e0e0e0] mb-4">File Deployment Configuration</h3>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(file.status)}
                    <div>
                      <p className="text-[#e0e0e0] font-medium">{file.name}</p>
                      <p className="text-[#a0a0a0] text-sm">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    file.status === 'deployed' ? 'bg-[#81c784]/20 text-[#81c784]' :
                    file.status === 'deploying' ? 'bg-[#4dd0e1]/20 text-[#4dd0e1]' :
                    file.status === 'failed' ? 'bg-red-400/20 text-red-400' :
                    'bg-[#6a6a80]/20 text-[#6a6a80]'
                  }`}>
                    {file.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[#e0e0e0] text-sm font-medium mb-2">
                      Select Agent(s)
                    </label>
                    <select
                      multiple
                      value={file.selectedAgents}
                      onChange={(e) => updateFileConfig(file.id, 'selectedAgents', Array.from(e.target.selectedOptions, option => option.value))}
                      className="w-full bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg px-3 py-2 text-[#e0e0e0] focus:border-[#4dd0e1] focus:outline-none"
                      disabled={file.status === 'deploying' || file.status === 'deployed'}
                    >
                      {agents.map(agent => (
                        <option key={agent.id} value={agent.id} className="bg-[#1a1a2e] text-[#e0e0e0]">
                          {agent.name || agent.hostname} ({agent.ip_address})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#e0e0e0] text-sm font-medium mb-2">
                      Select Group(s)
                    </label>
                    <select
                      multiple
                      value={file.selectedGroups}
                      onChange={(e) => updateFileConfig(file.id, 'selectedGroups', Array.from(e.target.selectedOptions, option => option.value))}
                      className="w-full bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg px-3 py-2 text-[#e0e0e0] focus:border-[#4dd0e1] focus:outline-none"
                      disabled={file.status === 'deploying' || file.status === 'deployed'}
                    >
                      {groups.map(group => (
                        <option key={group.id} value={group.id} className="bg-[#1a1a2e] text-[#e0e0e0]">
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-[#e0e0e0] text-sm font-medium mb-2">
                    Destination Path
                  </label>
                  <input
                    type="text"
                    value={file.destinationPath}
                    onChange={(e) => updateFileConfig(file.id, 'destinationPath', e.target.value)}
                    placeholder="e.g., C:\Users\user\Downloads"
                    className="w-full bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg px-3 py-2 text-[#e0e0e0] placeholder-[#6a6a80] focus:border-[#4dd0e1] focus:outline-none"
                    disabled={file.status === 'deploying' || file.status === 'deployed'}
                  />
                  <p className="text-[#a0a0a0] text-xs mt-1">Default: Downloads folder</p>
                </div>

                <button
                  onClick={() => deployFile(file)}
                  disabled={!canDeploy(file) || file.status === 'deploying' || file.status === 'deployed' || isDeploying}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    canDeploy(file) && file.status === 'uploaded' && !isDeploying
                      ? 'bg-[#4dd0e1] hover:bg-[#4dd0e1]/80 text-[#1a1a2e]'
                      : 'bg-[#3a3a4c] text-[#6a6a80] cursor-not-allowed'
                  }`}
                >
                  <Rocket className="w-4 h-4" />
                  {file.status === 'deploying' ? 'Deploying...' : 
                   file.status === 'deployed' ? 'Deployed' : 'Deploy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
        </div>
      )}

      {/* Agents Overview Section */}
      {activeSection === 'agents' && (
        <div className="space-y-6">
          <div className="bg-[#232338] border border-[#3a3a4c] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#e0e0e0] mb-4">Connected Agents</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => {
                const details = agentDetails[agent.name] || {};
                return (
                  <div key={agent.id} className="bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[#e0e0e0] font-medium">{agent.name}</h4>
                      <div className={`w-3 h-3 rounded-full ${
                        details.status === 'online' ? 'bg-[#81c784]' : 'bg-red-400'
                      }`}></div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#a0a0a0]">Status:</span>
                        <span className={details.status === 'online' ? 'text-[#81c784]' : 'text-red-400'}>
                          {details.status || 'unknown'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#a0a0a0]">Deployments:</span>
                        <span className="text-[#e0e0e0]">{details.deployments || 0}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#a0a0a0]">CPU:</span>
                        <span className="text-[#e0e0e0]">{details.cpuUsage || 0}%</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-[#a0a0a0]">Memory:</span>
                        <span className="text-[#e0e0e0]">{details.memoryUsage || 0}%</span>
                      </div>
                      
                      {details.lastSeen && (
                        <div className="flex justify-between">
                          <span className="text-[#a0a0a0]">Last Seen:</span>
                          <span className="text-[#e0e0e0]">
                            {new Date(details.lastSeen).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-[#3a3a4c]">
                      <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#4dd0e1]/20 hover:bg-[#4dd0e1]/30 rounded-lg text-[#4dd0e1] text-sm font-medium transition-all">
                        <Activity className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {agents.length === 0 && (
              <div className="text-center py-8">
                <Monitor className="w-12 h-12 text-[#6a6a80] mx-auto mb-3" />
                <p className="text-[#a0a0a0]">No agents connected</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Operations Section */}
      {activeSection === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-[#232338] border border-[#3a3a4c] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#e0e0e0] mb-4">Bulk Operations</h3>
            
            {uploadedFiles.length > 0 ? (
              <div className="space-y-6">
                {/* File Selection */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[#e0e0e0] font-medium">Select Files</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllFiles}
                        className="px-3 py-1 bg-[#4dd0e1]/20 hover:bg-[#4dd0e1]/30 rounded text-[#4dd0e1] text-sm font-medium transition-all"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="px-3 py-1 bg-[#6a6a80]/20 hover:bg-[#6a6a80]/30 rounded text-[#6a6a80] text-sm font-medium transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-3 p-3 bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => toggleFileSelection(file.id)}
                          className="w-4 h-4 text-[#4dd0e1] bg-[#1a1a2e] border-[#3a3a4c] rounded focus:ring-[#4dd0e1]"
                        />
                        <div className="flex-1">
                          <p className="text-[#e0e0e0] font-medium">{file.name}</p>
                          <p className="text-[#a0a0a0] text-sm">{formatFileSize(file.size)}</p>
                        </div>
                        {getStatusIcon(file.status)}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Bulk Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#e0e0e0] font-medium mb-2">Target Agents</label>
                    <select
                      multiple
                      value={bulkDeployConfig.agents}
                      onChange={(e) => setBulkDeployConfig(prev => ({
                        ...prev,
                        agents: Array.from(e.target.selectedOptions, option => option.value)
                      }))}
                      className="w-full p-3 bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg text-[#e0e0e0] focus:border-[#4dd0e1] focus:ring-1 focus:ring-[#4dd0e1]"
                      size="4"
                    >
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.name}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[#e0e0e0] font-medium mb-2">Target Groups</label>
                    <select
                      multiple
                      value={bulkDeployConfig.groups}
                      onChange={(e) => setBulkDeployConfig(prev => ({
                        ...prev,
                        groups: Array.from(e.target.selectedOptions, option => option.value)
                      }))}
                      className="w-full p-3 bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg text-[#e0e0e0] focus:border-[#4dd0e1] focus:ring-1 focus:ring-[#4dd0e1]"
                      size="4"
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.name}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-[#e0e0e0] font-medium mb-2">Destination Path</label>
                  <input
                    type="text"
                    value={bulkDeployConfig.destinationPath}
                    onChange={(e) => setBulkDeployConfig(prev => ({
                      ...prev,
                      destinationPath: e.target.value
                    }))}
                    placeholder="%USERPROFILE%\\Downloads"
                    className="w-full p-3 bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg text-[#e0e0e0] placeholder-[#6a6a80] focus:border-[#4dd0e1] focus:ring-1 focus:ring-[#4dd0e1]"
                  />
                </div>
                
                {/* Bulk Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={bulkDeploy}
                    disabled={selectedFiles.length === 0 || isDeploying}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedFiles.length > 0 && !isDeploying
                        ? 'bg-[#4dd0e1] hover:bg-[#4dd0e1]/80 text-[#1a1a2e]'
                        : 'bg-[#3a3a4c] text-[#6a6a80] cursor-not-allowed'
                    }`}
                  >
                    <Rocket className="w-4 h-4" />
                    {isDeploying ? 'Deploying...' : `Deploy ${selectedFiles.length} Files`}
                  </button>
                  
                  <button
                    onClick={deleteSelectedFiles}
                    disabled={selectedFiles.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedFiles.length > 0
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                        : 'bg-[#3a3a4c] text-[#6a6a80] cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="w-12 h-12 text-[#6a6a80] mx-auto mb-3" />
                <p className="text-[#a0a0a0]">Upload files first to use bulk operations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deployment History Section */}
      {activeSection === 'history' && (
        <div className="space-y-6">
          <div className="bg-[#232338] border border-[#3a3a4c] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#e0e0e0]">Deployment History</h3>
              <button
                onClick={fetchDeploymentHistory}
                disabled={isLoadingHistory}
                className="flex items-center gap-2 px-3 py-2 bg-[#4dd0e1]/20 hover:bg-[#4dd0e1]/30 rounded-lg text-[#4dd0e1] text-sm font-medium transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-[#4dd0e1] animate-spin" />
              </div>
            ) : deploymentHistory.length > 0 ? (
              <div className="space-y-3">
                {deploymentHistory.map((deployment) => (
                  <div key={deployment.id} className="bg-[#1a1a2e] border border-[#3a3a4c] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {deployment.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-[#81c784]" />
                        ) : deployment.status === 'failed' ? (
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-[#4dd0e1]" />
                        )}
                        <div>
                          <p className="text-[#e0e0e0] font-medium">{deployment.fileName}</p>
                          <p className="text-[#a0a0a0] text-sm">
                            {new Date(deployment.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          deployment.status === 'completed' ? 'bg-[#81c784]/20 text-[#81c784]' :
                          deployment.status === 'failed' ? 'bg-red-400/20 text-red-400' :
                          'bg-[#4dd0e1]/20 text-[#4dd0e1]'
                        }`}>
                          {deployment.status}
                        </div>
                        <p className="text-[#a0a0a0] text-xs mt-1">{deployment.duration}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#6a6a80]" />
                      <span className="text-[#a0a0a0] text-sm">
                        Deployed to: {deployment.agents.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-[#6a6a80] mx-auto mb-3" />
                <p className="text-[#a0a0a0]">No deployment history</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google Drive Upload Modal */}
      {showGoogleDriveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#232338] border border-[#3a3a4c] rounded-xl p-6 w-full max-w-4xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#e0e0e0]">Select Files from Google Drive</h3>
              <button
                onClick={() => setShowGoogleDriveModal(false)}
                className="text-[#a0a0a0] hover:text-[#e0e0e0] text-xl font-bold"
              >
                ×
              </button>
            </div>
            <GoogleDriveUpload onFileSelect={handleGoogleDriveFiles} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManagementPanel;