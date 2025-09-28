/**
 * Working Google Drive Service using direct OAuth flow
 * Bypasses iframe restrictions by using redirect-based authentication
 */

class WorkingGoogleDriveService {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
  }

  // Initialize with minimal setup
  async init() {
    if (this.isInitialized) return;

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!apiKey || !clientId) {
      throw new Error('Google Drive API configuration missing');
    }

    try {
      // Wait for Google APIs
      await this.waitForGoogleAPIs();
      
      // Load only picker - no auth initialization
      await new Promise((resolve, reject) => {
        gapi.load('picker', {
          callback: resolve,
          onerror: reject
        });
      });

      this.apiKey = apiKey;
      this.clientId = clientId;
      this.isInitialized = true;
      console.log('Working Google Drive service initialized');
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error);
      throw error;
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
      const maxAttempts = 100;
      
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

  // Get access token using direct OAuth URL
  async getAccessToken() {
    return new Promise((resolve, reject) => {
      const scope = 'https://www.googleapis.com/auth/drive.readonly';
      const redirectUri = window.location.origin + window.location.pathname;
      
      // Check if we already have a token in URL
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const tokenFromUrl = urlParams.get('access_token');
      
      if (tokenFromUrl) {
        this.accessToken = tokenFromUrl;
        // Clean up URL
        window.history.replaceState(null, null, window.location.pathname);
        resolve(tokenFromUrl);
        return;
      }

      // Create OAuth URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(this.clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=token&` +
        `include_granted_scopes=true`;

      // Open in popup
      const popup = window.open(
        authUrl,
        'googleAuth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Monitor popup
      const checkClosed = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkClosed);
            reject(new Error('Authentication cancelled'));
            return;
          }

          // Check for token in popup URL
          try {
            const popupUrl = popup.location.href;
            if (popupUrl.includes('access_token=')) {
              const params = new URLSearchParams(popupUrl.split('#')[1]);
              const token = params.get('access_token');
              if (token) {
                this.accessToken = token;
                popup.close();
                clearInterval(checkClosed);
                resolve(token);
              }
            }
          } catch (e) {
            // Cross-origin error - expected until redirect
          }
        } catch (e) {
          // Popup might be closed
          clearInterval(checkClosed);
          reject(new Error('Authentication failed'));
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!popup.closed) popup.close();
        reject(new Error('Authentication timeout'));
      }, 300000);
    });
  }

  // Simple authentication
  async authenticate() {
    try {
      await this.init();
      
      if (this.accessToken) {
        return this.accessToken;
      }

      return await this.getAccessToken();
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  // Open file picker with manual token
  async openFilePicker() {
    try {
      await this.init();

      // Get access token first
      const token = await this.authenticate();

      return new Promise((resolve, reject) => {
        try {
          const picker = new google.picker.PickerBuilder()
            .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
            .setOAuthToken(token)
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

  // Download file
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
      console.error('Failed to download file:', error);
      throw error;
    }
  }
}

export default new WorkingGoogleDriveService();