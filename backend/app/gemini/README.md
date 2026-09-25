# Google Gemini AI Integration for DeployX

This directory contains the Google Gemini AI integration for DeployX, providing an intelligent chat assistant to help users navigate and use the platform.

## Features

### What the AI Assistant Can Do:
- **Explain deployment status and metrics** in plain language
- **Guide users through features** step-by-step
- **Troubleshoot errors** and suggest solutions
- **Answer questions** about agents, servers, and deployments
- **Provide contextual help** based on current page and user data
- **Analyze logs and errors** to identify root causes

### What the AI Assistant Will NOT Do:
- Reveal internal system architecture or backend implementation
- Share information about other users
- Answer questions unrelated to DeployX
- Expose sensitive credentials or tokens
- Bypass security or authentication

## Setup Instructions

**Note**: This integration uses the `gemini-1.5-flash` model, which is Google's latest fast and efficient model.

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Configure Backend

Add the API key to your backend `.env` file:

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Install Dependencies

Backend:
```bash
cd backend
pip install -r requirements.txt
```

The `google-generativeai` package is now included in requirements.txt.

### 4. Restart Server

Restart your backend server to load the new environment variable:

```bash
cd backend
python start_server.py
```

### 5. Test the Integration

The AI chat button will appear in the bottom-right corner of the screen when you're logged in. Click it to start chatting!

## API Endpoints

### POST `/gemini/chat`
Send a message to the AI assistant.

**Request Body:**
```json
{
  "message": "Why did my deployment fail?",
  "context": {
    "page": "/dashboard/deployments",
    "userRole": "admin",
    "userId": "123"
  }
}
```

**Response:**
```json
{
  "response": "Your deployment failed because...",
  "timestamp": "2025-12-27T10:30:00"
}
```

### GET `/gemini/health`
Check if Gemini API is configured and ready.

**Response:**
```json
{
  "status": "ok",
  "configured": true,
  "message": "Gemini API is ready"
}
```

## Architecture

### Backend (`backend/app/gemini/`)
- **`routes.py`**: FastAPI endpoints for chat and health check
- **Context Prompt**: Defines AI assistant's role and boundaries

### Frontend
- **`services/geminiService.js`**: API client for Gemini endpoints
- **`components/GeminiChat.jsx`**: Chat interface component
- **`components/GeminiChatButton.jsx`**: Floating chat button

## Usage Examples

### Example Conversations:

**User:** "What's the status of my deployments?"
**AI:** "You have 12 total deployments: 10 successful, 1 in progress (45% complete), and 1 failed. The failed deployment needs attention due to a port conflict."

**User:** "Why is my agent offline?"
**AI:** "Your Production-Server agent last responded 15 minutes ago. This could be due to: 1) Network connectivity issue, 2) Agent service stopped, 3) Server restarted. Would you like to troubleshoot?"

**User:** "How do I deploy a React app?"
**AI:** "To deploy a React app: 1) Create application with type 'React', 2) Configure port (I see 3000 and 8080 are taken, use 3001), 3) Select server, 4) Click deploy. I'll guide you through each step."

## Privacy & Security

The AI assistant:
- ✅ Only accesses the user's own data
- ✅ Does not share information across users
- ✅ Does not expose system internals
- ✅ Does not reveal credentials
- ✅ Filters responses for safety

All conversations are contextual and personalized to the logged-in user.

## Troubleshooting

### "Gemini API is not configured"
- Ensure `GEMINI_API_KEY` is set in `.env`
- Restart the backend server
- Verify the API key is valid

### Chat button not appearing
- Make sure you're logged in
- Check browser console for errors
- Verify frontend is connecting to backend

### Responses are generic
- Check that context is being passed correctly
- Verify user data is accessible from endpoints
- Review browser console for context errors

## Future Enhancements

Potential improvements:
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Conversation history persistence
- [ ] Smart suggestions based on user patterns
- [ ] Proactive alerts and notifications
- [ ] Integration with deployment analytics
- [ ] Code generation for scripts and configs

## Support

For issues or questions:
1. Check that GEMINI_API_KEY is properly configured
2. Review backend logs for errors
3. Test the `/gemini/health` endpoint
4. Ensure user is authenticated

## License

Part of the DeployX project.
