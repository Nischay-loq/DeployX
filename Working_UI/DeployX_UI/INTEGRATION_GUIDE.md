# DeployX New Frontend Integration

This document outlines the steps to run and test the new frontend (Working_UI/DeployX_UI) with the existing backend.

## Setup Instructions

### 1. Backend Setup
First, ensure the FastAPI backend is running:

```bash
# Navigate to the backend directory
cd backend

# Install dependencies (if not already done)
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend should be available at: `http://localhost:8000`

### 2. Frontend Setup
In a new terminal, navigate to the new frontend directory:

```bash
# Navigate to the new frontend directory
cd Working_UI/DeployX_UI

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend should be available at: `http://localhost:5173`

## Testing Authentication

### Test Signup:
1. Go to `http://localhost:5173`
2. Navigate to the signup page
3. Fill in the form with:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. Click "Create Account"
5. You should see a success message and be redirected to login

### Test Login:
1. On the login page, enter:
   - Username: `testuser` (or the username you created)
   - Password: `password123`
2. Optionally check "Remember me"
3. Click "Sign In"
4. You should be redirected to the dashboard

### Test Logout:
1. On the dashboard, click the "Logout" button
2. You should be redirected to the home page

## API Integration Details

The new frontend connects to the backend using:

- **API Base URL**: `http://localhost:8000` (configurable via `.env`)
- **Authentication Endpoints**:
  - `POST /auth/signup` - User registration
  - `POST /auth/login` - User login
  - `POST /auth/send-otp` - Send OTP for password reset
  - `POST /auth/verify-otp` - Verify OTP

## Key Features Implemented

1. **API Client** (`src/services/api.js`):
   - Centralized API request handling
   - Automatic token management
   - Error handling

2. **Authentication Service** (`src/services/auth.js`):
   - Login/logout functionality
   - Token persistence (localStorage/sessionStorage)
   - Authentication state management

3. **Protected Routes**:
   - Automatic redirect to login if not authenticated
   - Automatic redirect to dashboard if already authenticated

4. **Form Validation**:
   - Password confirmation
   - Email validation
   - Username uniqueness checking

## Environment Configuration

Create a `.env` file in `Working_UI/DeployX_UI/` with:

```
VITE_API_URL=http://localhost:8000
```

## Troubleshooting

1. **CORS Issues**: Ensure the backend has CORS properly configured for the frontend URL
2. **Backend Not Running**: Make sure the FastAPI server is running on port 8000
3. **Database Issues**: Ensure the database is properly set up and the auth tables exist

## Next Steps

After successful testing, consider:
1. Implementing password reset functionality
2. Adding form validation improvements
3. Implementing session management
4. Adding loading states and better error handling
5. Implementing the remaining dashboard features