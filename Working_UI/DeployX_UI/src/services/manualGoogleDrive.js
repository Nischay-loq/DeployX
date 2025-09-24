/**
 * Manual Google Drive Integration Instructions
 * Since Google's OAuth is being restrictive, here's a simple workaround
 */

class ManualGoogleDriveService {
  constructor() {
    this.isInitialized = true;
  }

  async init() {
    console.log('Manual Google Drive service ready');
  }

  async authenticate() {
    console.log('Manual authentication - no OAuth needed');
    return 'manual-mode';
  }

  // Show instructions instead of picker
  async openFilePicker() {
    const instructions = `
MANUAL GOOGLE DRIVE INTEGRATION:

Since Google OAuth is being restrictive, here's how to manually add files:

1. Go to drive.google.com in another tab
2. Find and download the files you want to deploy
3. Come back to this tab
4. Use the "Upload Files" button to select your downloaded files
5. Proceed with deployment as normal

This manual method works just as well and bypasses all OAuth restrictions!
    `;

    // Show instructions in console and alert
    console.log(instructions);
    
    // Create a custom modal-like experience
    const userWantsToTryAnyway = confirm(
      "Google OAuth is restricted for new apps. Would you like to:\n\n" +
      "✅ Click OK to manually upload files (recommended)\n" +
      "❌ Click Cancel to try OAuth anyway (might fail)"
    );

    if (userWantsToTryAnyway) {
      // Return empty array to let user upload manually
      return [];
    } else {
      // Try to open drive.google.com in new tab
      window.open('https://drive.google.com', '_blank');
      return [];
    }
  }

  async downloadFile(fileId, fileName) {
    console.log(`Manual download: ${fileName}`);
    throw new Error('Manual mode - please download from drive.google.com');
  }
}

export default new ManualGoogleDriveService();