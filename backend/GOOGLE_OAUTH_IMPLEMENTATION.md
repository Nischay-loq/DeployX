# Google OAuth Backend Implementation Plan

## Overview
This document outlines the implementation of Google OAuth authentication for the DeployX backend API using FastAPI.

## Database Schema Updates

### Users Table Enhancement
Add a new column to the existing users table:
```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
```

### Optional: OAuth Providers Table
For future extensibility, consider creating a separate table:
```sql
CREATE TABLE oauth_providers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);
```

## Backend Dependencies
Add these packages to `requirements.txt`:
```
google-auth==2.17.3
google-auth-oauthlib==1.0.0
google-api-python-client==2.88.0
```

## API Endpoints

### 1. Google OAuth Verification Endpoint
- **Route**: `POST /auth/google`
- **Purpose**: Verify Google ID token and create/authenticate user
- **Request Body**:
  ```json
  {
    "credential": "google-id-token-here"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "jwt-token",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "user@gmail.com",
      "email": "user@gmail.com",
      "google_id": "google-user-id"
    }
  }
  ```

### 2. Link Google Account Endpoint
- **Route**: `POST /auth/link-google`
- **Purpose**: Link Google account to existing user
- **Authentication**: Required (JWT token)
- **Request Body**:
  ```json
  {
    "credential": "google-id-token-here"
  }
  ```

## Implementation Steps

### Step 1: Environment Configuration
Add to backend `.env` file:
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Step 2: Google OAuth Service
Create `app/auth/google_oauth.py`:
- Token verification function
- User profile extraction
- Error handling for invalid tokens

### Step 3: Database Models Update
Update `app/auth/models.py`:
- Add `google_id` field to User model
- Add indexes for performance

### Step 4: Authentication Routes Update
Update `app/auth/routes.py`:
- Add `/auth/google` endpoint
- Add `/auth/link-google` endpoint
- Handle user creation/authentication logic

### Step 5: Security Considerations
- Validate Google client ID matches your app
- Implement rate limiting
- Add proper error handling
- Secure token storage
- CORS configuration for frontend

## Error Handling
- Invalid Google token
- User already exists with different auth method
- Database connection errors
- Google API service errors

## Testing Strategy
- Unit tests for token verification
- Integration tests for auth flow
- Error scenario testing
- Security testing

## Frontend Integration
- Environment variable for Google Client ID
- Token handling and storage
- Error state management
- Logout functionality with Google session cleanup