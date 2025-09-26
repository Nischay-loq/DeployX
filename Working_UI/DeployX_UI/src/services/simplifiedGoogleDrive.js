/**
 * Simplified Google Drive Picker Service
 * Focuses only on file picker functionality without complex API initialization
 */

class SimplifiedGoogleDriveService {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
    this.tokenClient = null;
  }

  // Initialize Google APIs - simplified version
  async init() {
    if (this.isInitialized) return;

    // Check for required configuration
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!apiKey || apiKey === 'your-api-key' || apiKey === 'your-actual-api-key-here' || 
        !clientId || clientId === 'your-client-id' || clientId === 'your-actual-client-id.apps.googleusercontent.com') {
      throw new Error('Google Drive API configuration missing. Please set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID in .env.local');
    }

    try {
      // Wait for Google APIs to load
      await this.waitForGoogleAPIs();
      
      // Load only the picker API - no complex client initialization
      await new Promise((resolve, reject) => {
        gapi.load('picker', {
          callback: resolve,
          onerror: reject
        });
      });

      // Initialize the token client for OAuth with updated configuration
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        ux_mode: 'popup',
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
      console.log('Simplified Google Drive Picker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive Picker:', error);
      throw new Error(`Google Drive Picker initialization failed: ${error.message}`);
    }
  }

  // Wait for Google APIs to load
  waitForGoogleAPIs() {
    return new Promise((resolve, reject) => {
      if (window.gapi && window.google) {
        resolve();
        return;
      }
      
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max wait
      
      const checkAPIs = () => {
        if (window.gapi && window.google) {
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkAPIs, 100);
        } else {
          reject(new Error('Google APIs failed to load'));
        }
      };
      
      checkAPIs();
    });
  }

  // Authenticate with Google using Identity Services
  async authenticate() {
    try {
      await this.init();

      return new Promise((resolve, reject) => {
        if (this.accessToken) {
          resolve(this.accessToken);
          return;
        }

        // Update the token client callback
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
          // Request access token
          this.tokenClient.requestAccessToken({
            prompt: '',
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

  // Open Google Drive file picker
  async openFilePicker() {
    try {
      // Ensure we have an access token
      if (!this.accessToken) {
        await this.authenticate();
      }

      return new Promise((resolve, reject) => {
        try {
          const picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
            .setOAuthToken(this.accessToken)
            .addView(new google.picker.DocsView(google.picker.ViewId.DOCS))
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
        } catch (pickerError) {
          console.error('Picker creation error:', pickerError);
          reject(pickerError);
        }
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
}

export default new SimplifiedGoogleDriveService();