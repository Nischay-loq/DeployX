/**
 * Mock Google Drive Service for Development
 * Simulates Google Drive picker without requiring OAuth verification
 */

class MockGoogleDriveService {
  constructor() {
    this.isInitialized = false;
  }

  async init() {
    this.isInitialized = true;
    console.log('Mock Google Drive API initialized');
  }

  async authenticate() {
    console.log('Mock Google Drive authentication successful');
    return 'mock-access-token';
  }

  async openFilePicker() {
    try {
      await this.init();
      
      console.log('Opening mock Google Drive picker...');
      
      // Simulate file selection with a simple dialog
      return new Promise((resolve) => {
        const mockFiles = [
          {
            id: 'mock-1',
            name: 'sample-document.pdf',
            mimeType: 'application/pdf',
            size: 2048576,
            modifiedTime: new Date().toISOString(),
            downloadUrl: '#',
            iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf'
          },
          {
            id: 'mock-2',
            name: 'presentation.pptx',
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            size: 5242880,
            modifiedTime: new Date(Date.now() - 86400000).toISOString(),
            downloadUrl: '#',
            iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.presentationml.presentation'
          },
          {
            id: 'mock-3',
            name: 'data.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            size: 1024000,
            modifiedTime: new Date(Date.now() - 172800000).toISOString(),
            downloadUrl: '#',
            iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          },
          {
            id: 'mock-4',
            name: 'image.jpg',
            mimeType: 'image/jpeg',
            size: 3145728,
            modifiedTime: new Date(Date.now() - 259200000).toISOString(),
            downloadUrl: '#',
            iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/image/jpeg'
          },
          {
            id: 'mock-5',
            name: 'config.json',
            mimeType: 'application/json',
            size: 4096,
            modifiedTime: new Date(Date.now() - 345600000).toISOString(),
            downloadUrl: '#',
            iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/json'
          }
        ];

        // Simulate user selection after a short delay
        setTimeout(() => {
          const selectedCount = Math.floor(Math.random() * 3) + 1;
          const selectedFiles = mockFiles.slice(0, selectedCount);
          console.log(`Mock picker: Selected ${selectedCount} files`, selectedFiles);
          resolve(selectedFiles);
        }, 1000);
      });
    } catch (error) {
      console.error('Mock Google Drive picker error:', error);
      throw error;
    }
  }

  async downloadFile(fileId, fileName) {
    console.log(`Mock download: ${fileName} (${fileId})`);
    // Create a mock file blob
    const mockContent = `Mock content for ${fileName}`;
    const blob = new Blob([mockContent], { type: 'text/plain' });
    return new File([blob], fileName, { type: 'text/plain' });
  }

  async listFiles() {
    return [
      {
        id: 'mock-1',
        name: 'sample-document.pdf',
        size: 2048576,
        mimeType: 'application/pdf',
        modifiedTime: new Date().toISOString(),
        iconUrl: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
        downloadUrl: '#'
      }
    ];
  }
}

export default new MockGoogleDriveService();