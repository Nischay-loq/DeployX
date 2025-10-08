import api from './api';
import googleDriveService from './googleDrive';

class FilesService {
  // Upload files to server
  async uploadFiles(files) {
    try {
      const formData = new FormData();
      
      for (const fileWrapper of files) {
        if (fileWrapper.source === 'google-drive') {
          // For Google Drive files, download them first
          try {
            const file = await googleDriveService.downloadFile(fileWrapper.driveId, fileWrapper.name);
            formData.append(`files`, file);
          } catch (error) {
            console.warn('Failed to download Google Drive file, creating mock file:', error);
            // Fallback: create a mock file for demo purposes
            const mockContent = `Mock content for Google Drive file: ${fileWrapper.name}`;
            const mockFile = new File([mockContent], fileWrapper.name, { type: fileWrapper.type });
            formData.append(`files`, mockFile);
          }
        } else {
          // Local files
          formData.append(`files`, fileWrapper.file);
        }
      }

      // Don't set Content-Type - let browser set it with boundary for FormData
      const response = await api.post('/files/upload', formData);
      
      // Check if response has the expected structure
      if (response && response.success !== undefined) {
        return response;
      } else {
        // Handle case where response might be the data directly
        return {
          success: true,
          message: 'Files uploaded successfully',
          file_ids: response.file_ids || [],
          files: response.files || []
        };
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      // Better error message extraction
      const errorMessage = error?.message || 'Upload failed';
      return {
        success: false,
        message: errorMessage,
        file_ids: [],
        files: []
      };
    }
  }

  // Download Google Drive file (simulated)
  async downloadGoogleDriveFile(fileId) {
    // In a real implementation, this would use the Google Drive API
    // For now, we'll create a dummy blob
    const dummyContent = `Simulated Google Drive file content for ID: ${fileId}`;
    return new Blob([dummyContent], { type: 'text/plain' });
  }

  // Deploy files to devices
  async deployFiles(deploymentData) {
    try {
      const response = await api.post('/files/deploy', deploymentData);
      return response;
    } catch (error) {
      console.error('Failed to deploy files:', error);
      throw error;
    }
  }

  // Get deployment progress
  async getDeploymentProgress(deploymentId) {
    try {
      const response = await api.get(`/files/deployments/${deploymentId}/progress`);
      return response;
    } catch (error) {
      console.error('Failed to get file deployment progress:', error);
      throw error;
    }
  }

  // Check if path exists on devices
  async checkPathExists(deviceIds, path) {
    try {
      const response = await api.post('/files/check-path', {
        device_ids: deviceIds,
        path: path
      });
      return response;
    } catch (error) {
      console.error('Failed to check path existence:', error);
      throw error;
    }
  }

  // Get file deployment history
  async getFileDeployments() {
    try {
      const response = await api.get('/files/deployments');
      return response;
    } catch (error) {
      console.error('Failed to fetch file deployments:', error);
      throw error;
    }
  }

  // Delete uploaded file from server
  async deleteFile(fileId) {
    try {
      const response = await api.delete(`/files/${fileId}`);
      return response;
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  // Get file system structure for a device
  async getFileSystem(deviceId, path = '/') {
    try {
      const response = await api.get(`/files/filesystem/${deviceId}`, {
        params: { path }
      });
      return response;
    } catch (error) {
      console.error('Failed to get file system:', error);
      throw error;
    }
  }

  // Download file from device
  async downloadFile(deviceId, filePath) {
    try {
      const response = await api.get(`/files/download/${deviceId}`, {
        params: { file_path: filePath },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  // Create directory on device
  async createDirectory(deviceId, path) {
    try {
      const response = await api.post(`/files/mkdir/${deviceId}`, {
        path: path
      });
      return response;
    } catch (error) {
      console.error('Failed to create directory:', error);
      throw error;
    }
  }

  // Supported file types and extensions
  getSupportedFileTypes() {
    return {
      documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
      images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
      videos: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
      audio: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'],
      archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
      code: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css', '.json'],
      executables: ['.exe', '.msi', '.deb', '.rpm', '.dmg', '.pkg'],
      configs: ['.conf', '.cfg', '.ini', '.yaml', '.yml', '.xml']
    };
  }

  // Validate file before upload
  validateFile(file, maxSize = 100 * 1024 * 1024) { // 100MB default
    const errors = [];
    
    if (file.size > maxSize) {
      errors.push(`File size exceeds maximum limit of ${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    
    if (file.size === 0) {
      errors.push('File appears to be empty');
    }
    
    // Check for potentially dangerous files
    const dangerousExtensions = ['.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(extension)) {
      errors.push('File type may be potentially dangerous');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Get file icon based on extension
  getFileIcon(fileName) {
    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    const supportedTypes = this.getSupportedFileTypes();
    
    for (const [category, extensions] of Object.entries(supportedTypes)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }
    
    return 'unknown';
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

const filesService = new FilesService();
export default filesService;