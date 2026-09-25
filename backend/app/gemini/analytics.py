"""
Gemini Chat Analytics Module

Tracks user interactions with the AI assistant for:
- Quality improvement
- Common question analysis  
- Response effectiveness measurement
- Knowledge base gap identification
"""

import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from pathlib import Path

# Analytics data file
ANALYTICS_FILE = Path(__file__).parent / "analytics_data.json"

def load_analytics() -> Dict:
    """Load analytics data from file"""
    if ANALYTICS_FILE.exists():
        try:
            with open(ANALYTICS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading analytics: {e}")
    return {"conversations": [], "statistics": {}}

def save_analytics(data: Dict):
    """Save analytics data to file"""
    try:
        with open(ANALYTICS_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving analytics: {e}")

def log_conversation(
    user_message: str,
    ai_response: str,
    user_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    feedback: Optional[str] = None
):
    """
    Log a conversation for analytics
    
    Args:
        user_message: User's question/message
        ai_response: AI's response
        user_id: Optional user identifier
        context: Optional context data (page, role, etc.)
        feedback: Optional user feedback (thumbs_up/thumbs_down)
    """
    data = load_analytics()
    
    conversation_entry = {
        "timestamp": datetime.now().isoformat(),
        "user_message": user_message,
        "ai_response": ai_response,
        "user_id": user_id,
        "context": context or {},
        "feedback": feedback,
        "response_length": len(ai_response),
        "message_length": len(user_message)
    }
    
    data["conversations"].append(conversation_entry)
    
    # Update statistics
    stats = data.get("statistics", {})
    stats["total_conversations"] = stats.get("total_conversations", 0) + 1
    stats["last_conversation"] = datetime.now().isoformat()
    
    if feedback:
        feedback_key = f"feedback_{feedback}"
        stats[feedback_key] = stats.get(feedback_key, 0) + 1
    
    data["statistics"] = stats
    
    save_analytics(data)
    
    print(f"✓ Logged conversation: {len(user_message)} chars question -> {len(ai_response)} chars response")

def get_common_questions(limit: int = 10) -> List[Dict]:
    """
    Analyze conversations to find common question patterns
    
    Returns list of common questions with frequency
    """
    data = load_analytics()
    conversations = data.get("conversations", [])
    
    # Simple frequency analysis (can be enhanced with NLP)
    question_freq = {}
    for conv in conversations:
        question = conv["user_message"].lower().strip()
        question_freq[question] = question_freq.get(question, 0) + 1
    
    # Sort by frequency
    common = sorted(question_freq.items(), key=lambda x: x[1], reverse=True)[:limit]
    
    return [{"question": q, "count": c} for q, c in common]

def get_feedback_statistics() -> Dict:
    """
    Get feedback statistics (thumbs up/down ratios)
    
    Returns statistics about user satisfaction
    """
    data = load_analytics()
    stats = data.get("statistics", {})
    
    thumbs_up = stats.get("feedback_thumbs_up", 0)
    thumbs_down = stats.get("feedback_thumbs_down", 0)
    total = thumbs_up + thumbs_down
    
    return {
        "thumbs_up": thumbs_up,
        "thumbs_down": thumbs_down,
        "total_feedback": total,
        "satisfaction_rate": (thumbs_up / total * 100) if total > 0 else 0,
        "total_conversations": stats.get("total_conversations", 0)
    }

def get_unanswered_questions() -> List[str]:
    """
    Find questions where AI couldn't provide good answers
    
    Returns list of questions that got thumbs down or "I don't know" responses
    """
    data = load_analytics()
    conversations = data.get("conversations", [])
    
    unanswered = []
    for conv in conversations:
        # Check if response indicates uncertainty
        response_lower = conv["ai_response"].lower()
        is_uncertain = any(phrase in response_lower for phrase in [
            "i'm not sure",
            "i don't know",
            "not configured",
            "contact support"
        ])
        
        # Or if user gave thumbs down
        has_negative_feedback = conv.get("feedback") == "thumbs_down"
        
        if is_uncertain or has_negative_feedback:
            unanswered.append({
                "question": conv["user_message"],
                "response": conv["ai_response"][:200] + "..." if len(conv["ai_response"]) > 200 else conv["ai_response"],
                "timestamp": conv["timestamp"],
                "reason": "negative_feedback" if has_negative_feedback else "uncertain_response"
            })
    
    return unanswered

def get_response_time_stats() -> Dict:
    """
    Calculate average response length and complexity
    
    Returns statistics about response characteristics
    """
    data = load_analytics()
    conversations = data.get("conversations", [])
    
    if not conversations:
        return {"average_response_length": 0, "average_question_length": 0}
    
    total_response_length = sum(c.get("response_length", 0) for c in conversations)
    total_question_length = sum(c.get("message_length", 0) for c in conversations)
    count = len(conversations)
    
    return {
        "average_response_length": total_response_length // count,
        "average_question_length": total_question_length // count,
        "total_conversations": count
    }

def export_analytics(filepath: Optional[str] = None) -> str:
    """
    Export analytics data to JSON file
    
    Args:
        filepath: Optional custom export path
    
    Returns path to exported file
    """
    data = load_analytics()
    
    if filepath is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filepath = f"gemini_analytics_export_{timestamp}.json"
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print(f"✓ Analytics exported to: {filepath}")
    return filepath

def clear_old_analytics(days: int = 90):
    """
    Remove analytics data older than specified days
    
    Args:
        days: Number of days to keep (default 90)
    """
    data = load_analytics()
    conversations = data.get("conversations", [])
    
    cutoff_date = datetime.now().timestamp() - (days * 24 * 60 * 60)
    
    filtered_conversations = [
        c for c in conversations 
        if datetime.fromisoformat(c["timestamp"]).timestamp() > cutoff_date
    ]
    
    removed_count = len(conversations) - len(filtered_conversations)
    data["conversations"] = filtered_conversations
    
    save_analytics(data)
    
    print(f"✓ Removed {removed_count} old analytics entries (older than {days} days)")
    return removed_count

# Example usage and testing
if __name__ == "__main__":
    print("=== Gemini Analytics Module ===\n")
    
    # Test logging a conversation
    log_conversation(
        user_message="How do I upload files?",
        ai_response="To upload files, go to the Files page...",
        user_id="test_user",
        context={"page": "dashboard"},
        feedback="thumbs_up"
    )
    
    # Show statistics
    print("\n--- Feedback Statistics ---")
    stats = get_feedback_statistics()
    print(json.dumps(stats, indent=2))
    
    print("\n--- Response Time Stats ---")
    time_stats = get_response_time_stats()
    print(json.dumps(time_stats, indent=2))
    
    print("\n--- Common Questions ---")
    common = get_common_questions(limit=5)
    for i, q in enumerate(common, 1):
        print(f"{i}. {q['question']} (asked {q['count']} times)")
    
    print("\n--- Unanswered Questions ---")
    unanswered = get_unanswered_questions()
    print(f"Found {len(unanswered)} potentially problematic conversations")
    
    print("\n✓ Analytics module ready to use!")
