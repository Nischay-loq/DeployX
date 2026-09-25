from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import re
from typing import Optional, Dict, Any
from datetime import datetime
from .analytics import log_conversation, get_feedback_statistics, get_common_questions
from .data_functions import execute_function, FUNCTION_DESCRIPTIONS

router = APIRouter(prefix="/gemini", tags=["gemini"])

# Note: API key is loaded at request time from environment
# This ensures the .env file is loaded before we try to access it

# Load DeployX knowledge base from multiple files
KNOWLEDGE_BASE_DIR = os.path.join(os.path.dirname(__file__), "knowledge_base")

def load_knowledge_base():
    """Load all DeployX knowledge base files for comprehensive AI training"""
    knowledge_files = {
        'complete_guide': 'complete_guide.txt',
        'ui_components': 'ui_components.txt',
        'examples': 'examples.txt'
    }
    
    combined_knowledge = ""
    
    for name, filename in knowledge_files.items():
        filepath = os.path.join(KNOWLEDGE_BASE_DIR, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                combined_knowledge += f"\n\n{'='*50}\n"
                combined_knowledge += f"SOURCE: {name.upper().replace('_', ' ')}\n"
                combined_knowledge += f"{'='*50}\n\n"
                combined_knowledge += content
                print(f"✓ Loaded knowledge base: {filename}")
        except Exception as e:
            print(f"Warning: Could not load {filename}: {e}")
    
    if combined_knowledge:
        print(f"✓ Total knowledge base size: {len(combined_knowledge)} characters")
    else:
        print("⚠ Warning: No knowledge base files loaded!")
    
    return combined_knowledge

# Cache the knowledge base at startup
DEPLOYX_KNOWLEDGE = load_knowledge_base()

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    timestamp: str

def get_context_prompt():
    """Returns the enhanced system prompt for DeployX AI Assistant"""
    base_prompt = """You are DeployX AI Assistant - a friendly expert helping users with the DeployX platform.

**YOUR ROLE**: Guide users, answer questions, and help with navigation.

**LANGUAGE RULES**:
- Use exact UI terms: "Click **Agents** in sidebar" (not technical paths)
- Be friendly and clear
- Give step-by-step instructions when needed

**KEY FEATURES TO HELP WITH**:
- Agents/Devices: Monitor and manage connected servers
- Deployments: Deploy files/code to agents
- Files: Browse and upload files to agents
- Commands: Execute commands on agents
- Groups: Organize agents into groups
- Schedules: Automate deployments
- Backups: Backup important files
- Logs: View system activity

"""
    
    # Only append a small portion of knowledge base or skip it
    # Only append a small portion of knowledge base or skip it
    # This reduces token usage significantly
    return base_prompt

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process user chat message with Gemini AI and log for analytics
    Supports function calling for fetching real user data
    """
    # Get API key from environment at request time
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503, 
            detail="Gemini API is not configured. Please add GEMINI_API_KEY to environment variables."
        )
    
    try:
        # Configure Gemini API with the key
        genai.configure(api_key=GEMINI_API_KEY)
        
        # Initialize Gemini model (using gemini-pro - stable with better quota)
        model = genai.GenerativeModel('gemini-pro')
        
        # Build contextual prompt with function descriptions
        context_info = ""
        user_id = None
        if request.context:
            context_info = f"\n\nUser Context:\n"
            for key, value in request.context.items():
                context_info += f"- {key}: {value}\n"
            user_id = request.context.get("user_id")
        
        # Debug logging
        print(f"📝 Chat request - User ID: {user_id}")
        print(f"📝 Request context: {request.context}")
        
        # Add function calling instructions (simplified)
        function_instructions = """

=== DATA ACCESS FUNCTIONS ===

When users ask about THEIR data, call these functions:

"""
        for func_name, func_info in FUNCTION_DESCRIPTIONS.items():
            function_instructions += f"- **{func_name}**: {func_info['description']}\n"
        
        function_instructions += """
**Usage**: Respond with: FUNCTION_CALL: function_name(param="value")

**Examples**:
- "Show my agents" → FUNCTION_CALL: get_user_agents()
- "Show offline agents" → FUNCTION_CALL: get_user_agents(status="offline")
- "Show my deployments" → FUNCTION_CALL: get_user_deployments()

After getting data, format it nicely with markdown and charts.
"""
        
        full_prompt = f"{get_context_prompt()}{function_instructions}{context_info}\n\nUser: {request.message}\n\nAssistant:"
        
        # Generate initial response
        response = model.generate_content(full_prompt)
        ai_response = response.text
        
        print(f"🤖 AI Response: {ai_response[:200]}...")  # First 200 chars
        
        # Check if AI wants to call a function
        if "FUNCTION_CALL:" in ai_response:
            print("🔍 Function call detected!")
            # Extract function call
            function_pattern = r"FUNCTION_CALL:\s*(\w+)\((.*?)\)"
            match = re.search(function_pattern, ai_response)
            
            if match and user_id:
                function_name = match.group(1)
                params_str = match.group(2)
                
                print(f"📞 Calling function: {function_name}({params_str})")
                
                # Parse parameters
                params = {}
                if params_str.strip():
                    # Simple parameter parsing (key="value")
                    param_pattern = r'(\w+)=(["\']?)([^"\'>,]+)\2'
                    for param_match in re.finditer(param_pattern, params_str):
                        param_name = param_match.group(1)
                        param_value = param_match.group(3)
                        # Try to convert to appropriate type
                        try:
                            param_value = int(param_value)
                        except:
                            pass
                        params[param_name] = param_value
                
                # Execute function
                try:
                    function_result = execute_function(function_name, user_id, **params)
                    print(f"✅ Function result: {len(str(function_result))} chars")
                    
                    # Generate final response with function results
                    result_prompt = f"""{full_prompt}

FUNCTION_CALL: {function_name}({params_str})

FUNCTION_RESULT:
{json.dumps(function_result, indent=2)}

Now format this data in a user-friendly way with:
1. Clear headings and sections
2. Bullet points or numbered lists
3. Status indicators (🟢 🔴 🟡)
4. A chart visualization if the data has numeric values
5. Helpful tips or next steps

Remember to use markdown formatting and include a chart block if appropriate."""
                    
                    final_response = model.generate_content(result_prompt)
                    ai_response = final_response.text
                    
                except Exception as func_error:
                    ai_response = f"I tried to fetch your data but encountered an error: {str(func_error)}\n\nPlease try again or ask me something else!"
        
        # Log conversation for analytics (non-blocking)
        try:
            log_conversation(
                user_message=request.message,
                ai_response=ai_response,
                user_id=user_id,
                context=request.context
            )
        except Exception as e:
            print(f"Warning: Could not log conversation: {e}")
        
        return ChatResponse(
            response=ai_response,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating response: {str(e)}"
        )

class FeedbackRequest(BaseModel):
    message: str
    response: str
    feedback: str  # "thumbs_up" or "thumbs_down"
    user_id: Optional[str] = None

@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit user feedback on AI response (thumbs up/down)
    """
    try:
        log_conversation(
            user_message=request.message,
            ai_response=request.response,
            user_id=request.user_id,
            feedback=request.feedback
        )
        return {
            "status": "success",
            "message": "Feedback recorded. Thank you!"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error recording feedback: {str(e)}"
        )

@router.get("/analytics")
async def get_analytics():
    """Get AI assistant analytics and statistics"""
    try:
        feedback_stats = get_feedback_statistics()
        common_questions = get_common_questions(limit=10)
        
        return {
            "feedback": feedback_stats,
            "common_questions": common_questions
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving analytics: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Check if Gemini API is configured and accessible"""
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    return {
        "status": "ok" if GEMINI_API_KEY else "not_configured",
        "configured": bool(GEMINI_API_KEY),
        "message": "Gemini API is ready" if GEMINI_API_KEY else "GEMINI_API_KEY not found in environment"
    }
