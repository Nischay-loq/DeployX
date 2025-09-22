import React, { useState, useEffect } from 'react';
import './GoogleDriveUpload.css';

const GoogleDriveUpload = ({ onFileSelect }) => {
  const [isGoogleApiLoaded, setIsGoogleApiLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

  useEffect(() => {
    loadGoogleAPI();
  }, []);

  const loadGoogleAPI = async () => {
    try {
      // Load Google API
      if (!window.gapi) {
        await loadScript('https://apis.google.com/js/api.js');
      }

      // Load Google Identity Services
      if (!window.google) {
        await loadScript('https://accounts.google.com/gsi/client');
      }

      await window.gapi.load('client', initializeGapiClient);
    } catch (error) {
      console.error('Error loading Google APIs:', error);
    }
  };

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const initializeGapiClient = async () => {
    try {
      await window.gapi.client.init({
        apiKey: GOOGLE_API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });

      setIsGoogleApiLoaded(true);

      // Initialize Google Identity Services
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
        });
      }
    } catch (error) {
      console.error('Error initializing Google API client:', error);
    }
  };

  const handleCredentialResponse = async (response) => {
    try {
      setIsLoading(true);
      // Set the access token for API requests
      window.gapi.client.setToken({
        access_token: response.credential
      });
      
      setIsSignedIn(true);
    } catch (error) {
      console.error('Error handling credential response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setIsLoading(true);
      
      // Use OAuth 2.0 flow for Drive API access
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.access_token) {
            window.gapi.client.setToken(response);
            setIsSignedIn(true);
          }
          setIsLoading(false);
        },
      });

      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Error signing in:', error);
      setIsLoading(false);
    }
  };

  const signOut = () => {
    window.gapi.client.setToken(null);
    setIsSignedIn(false);
    setSelectedFiles([]);
  };

  const openFilePicker = async () => {
    try {
      setIsLoading(true);
      
      // Create and show the file picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(window.gapi.client.getToken().access_token)
        .setCallback(handlePickerCallback)
        .build();
      
      picker.setVisible(true);
    } catch (error) {
      console.error('Error opening file picker:', error);
      setIsLoading(false);
    }
  };

  const handlePickerCallback = async (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const files = data.docs;
      setIsLoading(true);
      
      try {
        for (const file of files) {
          await downloadAndUploadFile(file);
        }
      } catch (error) {
        console.error('Error processing picked files:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const downloadAndUploadFile = async (driveFile) => {
    try {
      // Get file metadata
      const fileResponse = await window.gapi.client.drive.files.get({
        fileId: driveFile.id,
        fields: 'id,name,size,mimeType'
      });

      const fileMetadata = fileResponse.result;

      // Download file content
      const downloadResponse = await window.gapi.client.drive.files.get({
        fileId: driveFile.id,
        alt: 'media'
      });

      // Convert response to blob
      const blob = new Blob([downloadResponse.body], { 
        type: fileMetadata.mimeType 
      });

      // Create FormData and upload to your server
      const formData = new FormData();
      formData.append('file', blob, fileMetadata.name);
      formData.append('source', 'google_drive');
      formData.append('drive_file_id', fileMetadata.id);

      const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        const fileData = {
          name: fileMetadata.name,
          size: parseInt(fileMetadata.size) || 0,
          type: fileMetadata.mimeType,
          id: result.file_id,
          uploadDate: new Date().toISOString(),
          source: 'google_drive'
        };
        
        setSelectedFiles(prev => [...prev, fileData]);
        onFileSelect(fileData);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error downloading/uploading file:', error);
      alert(`Failed to upload ${driveFile.name}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (fileId) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Check if credentials are configured
  if (!GOOGLE_CLIENT_ID || !GOOGLE_API_KEY) {
    return (
      <div className="google-drive-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Google Drive Not Configured</h3>
          <p>Google Drive integration requires API credentials to be configured.</p>
          <div className="config-steps">
            <h4>Setup Steps:</h4>
            <ol>
              <li>Create a project in Google Cloud Console</li>
              <li>Enable the Google Drive API</li>
              <li>Create OAuth 2.0 credentials</li>
              <li>Add your credentials to .env file</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!isGoogleApiLoaded) {
    return (
      <div className="google-drive-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading Google Drive integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="google-drive-container">
      <div className="google-drive-header">
        <div className="google-drive-icon">🌐</div>
        <h3>Google Drive Integration</h3>
        <p>Access and upload files directly from your Google Drive</p>
      </div>

      {!isSignedIn ? (
        <div className="sign-in-section">
          <button 
            className="google-sign-in-btn"
            onClick={signIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="btn-spinner"></div>
                Connecting...
              </>
            ) : (
              <>
                <img 
                  src="https://developers.google.com/identity/images/g-logo.png" 
                  alt="Google"
                  className="google-logo"
                />
                Sign in with Google
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="signed-in-section">
          <div className="user-controls">
            <button 
              className="pick-files-btn"
              onClick={openFilePicker}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="btn-spinner"></div>
                  Processing...
                </>
              ) : (
                <>
                  📁 Select Files from Drive
                </>
              )}
            </button>
            <button 
              className="sign-out-btn"
              onClick={signOut}
            >
              Sign Out
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="selected-files">
              <h4>Files from Google Drive:</h4>
              <div className="files-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-icon">📄</div>
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => removeFile(file.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleDriveUpload;