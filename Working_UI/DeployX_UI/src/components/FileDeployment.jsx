import React, { useState, useEffect } from 'react';
import './FileDeployment.css';

const FileDeployment = ({ uploadedFiles = [] }) => {
  const [agents, setAgents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [destinationPath, setDestinationPath] = useState('');
  const [deploymentMode, setDeploymentMode] = useState('agents'); // 'agents' or 'groups'
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState({});
  const [deploymentResults, setDeploymentResults] = useState([]);

  useEffect(() => {
    fetchAgents();
    fetchGroups();
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

  const handleAgentToggle = (agentId) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const selectAllAgents = () => {
    setSelectedAgents(agents.map(agent => agent.id));
  };

  const clearAgentSelection = () => {
    setSelectedAgents([]);
  };

  const selectAllGroups = () => {
    setSelectedGroups(groups.map(group => group.id));
  };

  const clearGroupSelection = () => {
    setSelectedGroups([]);
  };

  const getDefaultPath = () => {
    return '%USERPROFILE%\\Downloads';
  };

  const handleDeploy = async () => {
    if (uploadedFiles.length === 0) {
      alert('No files to deploy');
      return;
    }

    const targets = deploymentMode === 'agents' ? selectedAgents : selectedGroups;
    if (targets.length === 0) {
      alert(`Please select at least one ${deploymentMode === 'agents' ? 'agent' : 'group'}`);
      return;
    }

    setIsDeploying(true);
    setDeploymentProgress({});
    setDeploymentResults([]);

    try {
      const deploymentData = {
        files: uploadedFiles.map(file => ({ id: file.id, name: file.name })),
        destination_path: destinationPath || getDefaultPath(),
        deployment_mode: deploymentMode,
        targets: targets
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/deployments/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentData),
      });

      if (response.ok) {
        const result = await response.json();
        const deploymentId = result.deployment_id;
        
        // Start monitoring deployment progress
        monitorDeployment(deploymentId);
      } else {
        throw new Error('Deployment failed');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert('Failed to start deployment');
      setIsDeploying(false);
    }
  };

  const monitorDeployment = async (deploymentId) => {
    const checkProgress = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/deployments/${deploymentId}/status`
        );
        
        if (response.ok) {
          const status = await response.json();
          setDeploymentProgress(status.progress || {});
          setDeploymentResults(status.results || []);
          
          // Continue monitoring if deployment is still in progress
          if (status.status === 'in_progress') {
            setTimeout(checkProgress, 2000); // Check every 2 seconds
          } else {
            setIsDeploying(false);
          }
        }
      } catch (error) {
        console.error('Error checking deployment status:', error);
        setIsDeploying(false);
      }
    };

    checkProgress();
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
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'in_progress': return '⏳';
      default: return '⏳';
    }
  };

  return (
    <div className="file-deployment-container">
      {/* Files Summary */}
      <div className="files-summary">
        <h3>Files Ready for Deployment</h3>
        {uploadedFiles.length === 0 ? (
          <div className="no-files">
            <p>No files uploaded yet. Please upload files first.</p>
          </div>
        ) : (
          <div className="files-list">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="file-summary-item">
                <span className="file-icon">📄</span>
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <span className="file-source">{file.source || 'local'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Selection */}
      <div className="target-selection">
        <h3>Select Deployment Targets</h3>
        
        <div className="deployment-mode-selector">
          <button 
            className={`mode-btn ${deploymentMode === 'agents' ? 'active' : ''}`}
            onClick={() => setDeploymentMode('agents')}
          >
            Individual Agents
          </button>
          <button 
            className={`mode-btn ${deploymentMode === 'groups' ? 'active' : ''}`}
            onClick={() => setDeploymentMode('groups')}
          >
            Agent Groups
          </button>
        </div>

        {deploymentMode === 'agents' ? (
          <div className="agents-selection">
            <div className="selection-controls">
              <button onClick={selectAllAgents} className="control-btn">
                Select All
              </button>
              <button onClick={clearAgentSelection} className="control-btn">
                Clear All
              </button>
              <span className="selection-count">
                {selectedAgents.length} of {agents.length} selected
              </span>
            </div>
            
            <div className="agents-grid">
              {agents.map(agent => (
                <div 
                  key={agent.id} 
                  className={`agent-card ${selectedAgents.includes(agent.id) ? 'selected' : ''}`}
                  onClick={() => handleAgentToggle(agent.id)}
                >
                  <div className="agent-status">
                    <span className={`status-indicator ${agent.status || 'offline'}`}></span>
                  </div>
                  <div className="agent-info">
                    <h4>{agent.name || agent.hostname}</h4>
                    <p>{agent.ip_address}</p>
                    <span className="agent-os">{agent.operating_system}</span>
                  </div>
                  {selectedAgents.includes(agent.id) && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="groups-selection">
            <div className="selection-controls">
              <button onClick={selectAllGroups} className="control-btn">
                Select All
              </button>
              <button onClick={clearGroupSelection} className="control-btn">
                Clear All
              </button>
              <span className="selection-count">
                {selectedGroups.length} of {groups.length} selected
              </span>
            </div>
            
            <div className="groups-grid">
              {groups.map(group => (
                <div 
                  key={group.id} 
                  className={`group-card ${selectedGroups.includes(group.id) ? 'selected' : ''}`}
                  onClick={() => handleGroupToggle(group.id)}
                >
                  <div className="group-info">
                    <h4>{group.name}</h4>
                    <p>{group.description}</p>
                    <span className="device-count">
                      {group.device_count || 0} devices
                    </span>
                  </div>
                  {selectedGroups.includes(group.id) && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Destination Path */}
      <div className="destination-section">
        <h3>Destination Path</h3>
        <div className="path-input-container">
          <input
            type="text"
            value={destinationPath}
            onChange={(e) => setDestinationPath(e.target.value)}
            placeholder={getDefaultPath()}
            className="path-input"
          />
          <button 
            onClick={() => setDestinationPath(getDefaultPath())}
            className="default-path-btn"
          >
            Use Default
          </button>
        </div>
        <p className="path-help">
          Leave empty to use the default Downloads folder. 
          Use Windows environment variables like %USERPROFILE% for user-specific paths.
        </p>
      </div>

      {/* Deploy Button */}
      <div className="deploy-section">
        <button 
          className="deploy-btn"
          onClick={handleDeploy}
          disabled={
            isDeploying || 
            uploadedFiles.length === 0 || 
            (deploymentMode === 'agents' ? selectedAgents.length === 0 : selectedGroups.length === 0)
          }
        >
          {isDeploying ? (
            <>
              <div className="btn-spinner"></div>
              Deploying...
            </>
          ) : (
            <>
              🚀 Deploy Files
            </>
          )}
        </button>
      </div>

      {/* Deployment Progress */}
      {(isDeploying || Object.keys(deploymentProgress).length > 0) && (
        <div className="deployment-progress">
          <h3>Deployment Progress</h3>
          <div className="progress-list">
            {Object.entries(deploymentProgress).map(([targetId, progress]) => (
              <div key={targetId} className="progress-item">
                <div className="target-info">
                  <span className="target-name">
                    {deploymentMode === 'agents' 
                      ? agents.find(a => a.id === targetId)?.name || targetId
                      : groups.find(g => g.id === targetId)?.name || targetId
                    }
                  </span>
                  <span className="progress-status">{getStatusIcon(progress.status)}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${progress.percentage || 0}%` }}
                  ></div>
                </div>
                <span className="progress-text">{progress.percentage || 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment Results */}
      {deploymentResults.length > 0 && (
        <div className="deployment-results">
          <h3>Deployment Results</h3>
          <div className="results-list">
            {deploymentResults.map((result, index) => (
              <div key={index} className={`result-item ${result.status}`}>
                <span className="result-icon">{getStatusIcon(result.status)}</span>
                <div className="result-info">
                  <span className="target-name">{result.target_name}</span>
                  <span className="result-message">{result.message}</span>
                  {result.error && (
                    <span className="error-details">{result.error}</span>
                  )}
                </div>
                <span className="result-timestamp">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDeployment;