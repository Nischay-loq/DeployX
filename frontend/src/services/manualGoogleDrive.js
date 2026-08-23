/**
 * Manual Google Drive Integration Instructions
 * Since Google's OAuth is being restrictive, here's a simple workaround
 */

class ManualGoogleDriveService {
  constructor() {
    this.isInitialized = true;
  }

  async init() {
  }

  async authenticate() {
    return 'manual-mode';
  }

  // Show instructions and open Google Drive
  async openFilePicker() {
    return new Promise((resolve) => {
      // Create a more user-friendly modal experience
      const userChoice = confirm(
        "🔗 Google Drive Integration\n\n" +
        "Due to Google's OAuth restrictions for new applications, we'll use a simple manual process:\n\n" +
        "1️⃣ Click OK to open Google Drive in a new tab\n" +
        "2️⃣ Browse and download the files you want to deploy\n" +
        "3️⃣ Return here and use the 'Upload Files' button\n" +
        "4️⃣ Select your downloaded files and proceed\n\n" +
        "✅ This method is actually faster and more reliable!\n\n" +
        "Click OK to open Google Drive, or Cancel to continue with local files only."
      );

      if (userChoice) {
        // Open Google Drive in new tab
        const driveWindow = window.open('https://drive.google.com', '_blank', 'noopener,noreferrer');
        
        if (driveWindow) {
          
          // Show success message after a short delay
          setTimeout(() => {
            if (window.confirm("Google Drive opened! 🎉\n\nAfter downloading your files:\n• Return to this tab\n• Click 'Upload Files' to select them\n• Continue with deployment\n\nClick OK when you're ready to continue.")) {
              resolve([]);
            } else {
              resolve([]);
            }
          }, 1000);
        } else {
          // Popup blocked or failed
          alert("⚠️ Popup blocked!\n\nPlease manually go to: https://drive.google.com\n\nThen return here and use 'Upload Files' button.");
          resolve([]);
        }
      } else {
        // User cancelled
        resolve([]);
      }
    });
  }

  async downloadFile(fileId, fileName) {
    throw new Error('Manual mode - please download from drive.google.com');
  }
}

export default new ManualGoogleDriveService();