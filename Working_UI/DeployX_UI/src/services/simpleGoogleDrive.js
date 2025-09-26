/**
 * Simple Google Drive Test Service
 * Uses basic Google API without complex authentication flows
 */

class SimpleGoogleDriveService {
  constructor() {
    this.isInitialized = false;
    this.accessToken = null;
  }

  async init() {
    if (this.isInitialized) return;

    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!apiKey || !clientId) {
      throw new Error('Google API credentials missing');
    }

    try {
      await new Promise((resolve) => {
        gapi.load('client:auth2:picker', resolve);
      });

      await gapi.client.init({
        apiKey: apiKey,
        clientId: clientId,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        scope: 'https://www.googleapis.com/auth/drive.readonly'
      });

      this.isInitialized = true;
      console.log('Simple Google Drive API initialized');
    } catch (error) {
      console.error('Failed to initialize Simple Google Drive API:', error);
      throw error;
    }
  }

  async openFilePicker() {
    try {
      await this.init();
      
      const authInstance = gapi.auth2.getAuthInstance();
      const user = await authInstance.signIn();
      this.accessToken = user.getAuthResponse().access_token;

      return new Promise((resolve, reject) => {
        const picker = new google.picker.PickerBuilder()
          .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
          .setOAuthToken(this.accessToken)
          .addView(google.picker.ViewId.DOCS)
          .setCallback((data) => {
            if (data.action === google.picker.Action.PICKED) {
              const files = data.docs.map(doc => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes ? parseInt(doc.sizeBytes) : 0
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
      console.error('Failed to open picker:', error);
      throw error;
    }
  }
}

export default new SimpleGoogleDriveService();