import React, { useState, useRef, useCallback } from 'react';
import './FileUpload.css';

const FileUpload = ({ onFileSelect, uploadedFiles = [] }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

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
    for (const file of files) {
      await uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      const response = await fetch(`${import.meta.env.VITE_API_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        onFileSelect({
          name: file.name,
          size: file.size,
          type: file.type,
          id: result.file_id,
          uploadDate: new Date().toISOString()
        });
        
        // Clear progress after 2 seconds
        setTimeout(() => {
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[file.name];
            return updated;
          });
        }, 2000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => {
        const updated = { ...prev };
        delete updated[file.name];
        return updated;
      });
      alert(`Failed to upload ${file.name}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="file-upload-container">
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="drop-zone-content">
          <div className="upload-icon">📁</div>
          <h3>Drag & Drop Files Here</h3>
          <p>or click to browse files</p>
          <div className="supported-formats">
            <small>Supports all file types</small>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="upload-progress-container">
          <h4>Uploading Files:</h4>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="upload-progress-item">
              <span className="file-name">{fileName}</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-container">
          <h4>Uploaded Files:</h4>
          <div className="uploaded-files-list">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="uploaded-file-item">
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                  <span className="upload-date">
                    {new Date(file.uploadDate).toLocaleString()}
                  </span>
                </div>
                <div className="file-status">✅</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;