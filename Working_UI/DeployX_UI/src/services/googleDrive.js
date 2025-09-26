/**
 * Google Drive Service for file operations
 * Uses Google Identity Services (GIS) and Google Picker API
 */

class GoogleDriveService {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
    this.tokenClient = null;
  }

  // Initialize Google APIs and Identity Services
  async init() {
    if (this.isInitialized) return;

    // Check for required configuration
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!apiKey || apiKey === 'your-api-key' || apiKey === 'your-actual-api-key-here' || 
        !clientId || clientId === 'your-client-id' || clientId === 'your-actual-client-id.apps.googleusercontent.com') {
      throw new Error('Google Drive API configuration missing. Please:\n1. Go to Google Cloud Console\n2. Enable Google Drive API & Google Picker API\n3. Create API Key and OAuth Client ID\n4. Set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID in .env.local');
    }

    try {
      // Load Google API and Picker scripts
      await this.loadGoogleScripts();
      
      // Initialize Google API client
      await new Promise((resolve, reject) => {
        gapi.load('client:picker', {
          callback: resolve,
          onerror: reject
        });
      });

      // Initialize the API client with minimal configuration
      await gapi.client.init({
        apiKey: apiKey
      });

      // Initialize the token client for OAuth
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
          }
        },
        error_callback: (error) => {
          console.error('OAuth error:', error);
        }
      });

      this.isInitialized = true;
      console.log('Google Drive API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      throw new Error(`Google Drive API initialization failed: ${error.message}`);
    }
  }

  // Load Google scripts
  loadGoogleScripts() {
    return new Promise((resolve, reject) => {
      // Check if scripts are already loaded
      if (window.gapi && window.google) {
        resolve();
        return;
      }
      
      // Wait for scripts to load with timeout
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      const checkScripts = () => {
        if (window.gapi && window.google) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkScripts, 100);
        } else {
          reject(new Error('Google API scripts failed to load'));
        }
      };
      
      checkScripts();
    });
  }

  // Authenticate with Google using new Identity Services
  async authenticate() {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        if (this.accessToken) {
          resolve(this.accessToken);
          return;
        }

        // Update the token client callback to resolve the promise
        this.tokenClient.callback = (response) => {
          if (response.error !== undefined) {
            console.error('OAuth callback error:', response);
            reject(new Error(`Authentication failed: ${response.error}`));
            return;
          }
          this.accessToken = response.access_token;
          console.log('Google Drive authentication successful');
          resolve(this.accessToken);
        };

        try {
          // Request access token with proper configuration
          this.tokenClient.requestAccessToken({
            prompt: '',  // Empty prompt for smoother flow
            include_granted_scopes: true
          });
        } catch (authError) {
          console.error('Token request error:', authError);
          reject(authError);
        }
      });
    } catch (error) {
      console.error('Google authentication failed:', error);
      throw error;
    }
  }

  // List files from Google Drive
  async listFiles(pageSize = 50) {
    try {
      await this.init();
      await this.authenticate();

      const response = await gapi.client.drive.files.list({
        pageSize: pageSize,
        fields: 'nextPageToken, files(id, name, size, mimeType, modifiedTime, iconLink, webViewLink)',
        q: "trashed=false"
      });

      return response.result.files.map(file => ({
        id: file.id,
        name: file.name,
        size: parseInt(file.size) || 0,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        iconUrl: file.iconLink,
        downloadUrl: file.webViewLink
      }));
    } catch (error) {
      console.error('Failed to list Google Drive files:', error);
      throw error;
    }
  }

  // Get mock files for demo purposes
  async getMockFiles() {
    return [
      {
        id: 'mock-1',
        name: 'sample-document.pdf',
        size: 2048576,
        mimeType: 'application/pdf',
        modifiedTime: new Date().toISOString(),
        iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
        downloadUrl: '#'
      },
      {
        id: 'mock-2',
        name: 'presentation.pptx',
        size: 5242880,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        modifiedTime: new Date(Date.now() - 86400000).toISOString(),
        iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.presentationml.presentation',
        downloadUrl: '#'
      },
      {
        id: 'mock-3',
        name: 'data.xlsx',
        size: 1024000,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        modifiedTime: new Date(Date.now() - 172800000).toISOString(),
        iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        downloadUrl: '#'
      },
      {
        id: 'mock-4',
        name: 'image.jpg',
        size: 3145728,
        mimeType: 'image/jpeg',
        modifiedTime: new Date(Date.now() - 259200000).toISOString(),
        iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/image/jpeg',
        downloadUrl: '#'
      },
      {
        id: 'mock-5',
        name: 'config.json',
        size: 4096,
        mimeType: 'application/json',
        modifiedTime: new Date(Date.now() - 345600000).toISOString(),
        iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/json',
        downloadUrl: '#'
      }
    ];
  }

  // Open Google Drive file picker
  async openFilePicker() {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      return new Promise((resolve, reject) => {
        const picker = new google.picker.PickerBuilder()
          .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
          .enableFeature(google.picker.Feature.NAV_HIDDEN)
          .setOAuthToken(this.accessToken)
          .addView(new google.picker.DocsView(google.picker.ViewId.DOCS)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(false))
          .addView(new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES))
          .addView(new google.picker.DocsView(google.picker.ViewId.DOCS_VIDEOS))
          .setCallback((data) => {
            if (data.action === google.picker.Action.PICKED) {
              const files = data.docs.map(doc => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes ? parseInt(doc.sizeBytes) : 0,
                modifiedTime: doc.lastEditedUtc,
                downloadUrl: doc.downloadUrl,
                thumbnailUrl: doc.thumbnailUrl,
                iconUrl: doc.iconUrl
              }));
              resolve(files);
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();

        picker.setVisible(true);
      });
    } catch (error) {
      console.error('Failed to open Google Drive picker:', error);
      throw error;
    }
  }

  // Download file content from Google Drive
  async downloadFile(fileId, fileName) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      return new File([blob], fileName, { type: blob.type });
    } catch (error) {
      console.error('Failed to download file from Google Drive:', error);
      throw error;
    }
  }

  // Get file metadata
  async getFileMetadata(fileId) {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,modifiedTime,parents,webViewLink'
      });

      return response.result;
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    if (!this.isInitialized) return false;
    
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance && authInstance.isSignedIn.get();
  }

  // Sign out user
  async signOut() {
    try {
      if (this.isInitialized) {
        const authInstance = gapi.auth2.getAuthInstance();
        await authInstance.signOut();
        this.accessToken = null;
      }
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  }

  // Fallback method for demo purposes
  openMockPicker() {
    return new Promise((resolve) => {
      // Simulate Google Drive files for demo
      const mockFiles = [
        {
          id: 'mock1',
          name: 'Project Proposal.pdf',
          mimeType: 'application/pdf',
          size: 2048000,
          modifiedTime: new Date().toISOString(),
          downloadUrl: '#',
          iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf'
        },
        {
          id: 'mock2',
          name: 'Presentation.pptx',
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          size: 5120000,
          modifiedTime: new Date().toISOString(),
          downloadUrl: '#',
          iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.presentationml.presentation'
        },
        {
          id: 'mock3',
          name: 'Data Analysis.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: 1024000,
          modifiedTime: new Date().toISOString(),
          downloadUrl: '#',
          iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        },
        {
          id: 'mock4',
          name: 'Team Photo.jpg',
          mimeType: 'image/jpeg',
          size: 3072000,
          modifiedTime: new Date().toISOString(),
          downloadUrl: '#',
          iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/image/jpeg'
        },
        {
          id: 'mock5',
          name: 'Project Archive.zip',
          mimeType: 'application/zip',
          size: 10240000,
          modifiedTime: new Date().toISOString(),
          downloadUrl: '#',
          iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/zip'
        }
      ];

      // Simulate picker dialog
      setTimeout(() => {
        resolve(mockFiles);
      }, 500);
    });
  }
}

const googleDriveService = new GoogleDriveService();
export default googleDriveService;