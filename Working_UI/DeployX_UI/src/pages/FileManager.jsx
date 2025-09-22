import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import GoogleDriveUpload from '../components/GoogleDriveUpload';
import FileDeployment from '../components/FileDeployment';
import './FileManager.css';

const FileManager = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('local');

  // Load saved files from localStorage on component mount
  useEffect(() => {
    const savedFiles = localStorage.getItem('deployX_uploadedFiles');
    if (savedFiles) {
      setUploadedFiles(JSON.parse(savedFiles));
    }
  }, []);

  // Save files to localStorage whenever uploadedFiles changes
  useEffect(() => {
    localStorage.setItem('deployX_uploadedFiles', JSON.stringify(uploadedFiles));
  }, [uploadedFiles]);

  const handleFileSelect = (file) => {
    setUploadedFiles(prev => {
      // Check if file already exists (by name and size)
      const exists = prev.some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        return [...prev, file];
      }
      return prev;
    });
  };

  const handleRemoveFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleClearAllFiles = () => {
    if (window.confirm('Are you sure you want to remove all uploaded files?')) {
      setUploadedFiles([]);
    }
  };

  const getTotalFileSize = () => {
    return uploadedFiles.reduce((total, file) => total + (file.size || 0), 0);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <div className="header-content">
          <h1>File Deployment Manager</h1>
          <p>Upload files and deploy them to your connected agents</p>
        </div>
        
        {uploadedFiles.length > 0 && (
          <div className="files-summary-header">
            <div className="summary-stats">
              <span className="file-count">{uploadedFiles.length} files</span>
              <span className="total-size">{formatFileSize(getTotalFileSize())}</span>
            </div>
            <button 
              className="clear-all-btn"
              onClick={handleClearAllFiles}
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      <div className="upload-section">
        <div className="upload-tabs">
          <button 
            className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
            onClick={() => setActiveTab('local')}
          >
            📁 Local Files
          </button>
          <button 
            className={`tab-btn ${activeTab === 'google' ? 'active' : ''}`}
            onClick={() => setActiveTab('google')}
          >
            🌐 Google Drive
          </button>
        </div>

        <div className="upload-content">
          {activeTab === 'local' && (
            <FileUpload 
              onFileSelect={handleFileSelect}
              uploadedFiles={uploadedFiles}
            />
          )}
          {activeTab === 'google' && (
            <GoogleDriveUpload 
              onFileSelect={handleFileSelect}
            />
          )}
        </div>
      </div>

      <div className="deployment-section">
        <FileDeployment uploadedFiles={uploadedFiles} />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="action-card">
          <h3>🚀 Quick Deploy</h3>
          <p>Deploy all files to all connected agents with default settings</p>
          <button className="quick-action-btn" disabled={uploadedFiles.length === 0}>
            Deploy to All
          </button>
        </div>
        
        <div className="action-card">
          <h3>📊 Deployment History</h3>
          <p>View previous deployments and their status</p>
          <button className="quick-action-btn">
            View History
          </button>
        </div>
        
        <div className="action-card">
          <h3>⚙️ Settings</h3>
          <p>Configure default deployment settings and preferences</p>
          <button className="quick-action-btn">
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileManager;