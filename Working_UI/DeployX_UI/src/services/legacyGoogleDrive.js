/**
 * Legacy Google Drive Service using older Auth2 API
 * More compatible with CORS and popup restrictions
 */

class LegacyGoogleDriveService {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
  }

  // Initialize Google APIs using legacy auth2
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
      
      // Load auth2 and picker
      await new Promise((resolve, reject) => {
        gapi.load('auth2:picker', {
          callback: resolve,
          onerror: reject
        });
      });

      // Initialize auth2
      await gapi.auth2.init({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly'
      });

      this.isInitialized = true;
      console.log('Legacy Google Drive API initialized');
    } catch (error) {
      console.error('Failed to initialize Legacy Google Drive API:', error);
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

  // Authenticate using auth2
  async authenticate() {
    try {
      await this.init();

      const authInstance = gapi.auth2.getAuthInstance();
      
      if (authInstance.isSignedIn.get()) {
        const user = authInstance.currentUser.get();
        this.accessToken = user.getAuthResponse().access_token;
        return this.accessToken;
      }

      const user = await authInstance.signIn({
        prompt: 'select_account'
      });
      
      this.accessToken = user.getAuthResponse().access_token;
      console.log('Legacy Google Drive authentication successful');
      return this.accessToken;
    } catch (error) {
      console.error('Legacy authentication failed:', error);
      throw error;
    }
  }

  // Open Google Drive file picker
  async openFilePicker() {
    try {
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

  // Download file content
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

export default new LegacyGoogleDriveService();