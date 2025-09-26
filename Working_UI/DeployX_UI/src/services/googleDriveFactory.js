/**
 * Google Drive Service Factory
 * Switches between real and mock implementations based on environment
 */

import realGoogleDriveService from './googleDrive';
import mockGoogleDriveService from './mockGoogleDrive';

// Use mock service in development if Google OAuth isn't verified
const USE_MOCK_GOOGLE_DRIVE = import.meta.env.VITE_USE_MOCK_GOOGLE_DRIVE === 'true' || 
                              import.meta.env.DEV; // Default to mock in development

const googleDriveService = USE_MOCK_GOOGLE_DRIVE ? mockGoogleDriveService : realGoogleDriveService;

export default googleDriveService;