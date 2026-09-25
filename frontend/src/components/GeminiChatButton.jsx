import { useState, useEffect } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import GeminiChat from './GeminiChat';
import geminiService from '../services/geminiService';

export default function GeminiChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    // Check if Gemini API is configured
    checkGeminiHealth();
    
    // Stop pulsing after 5 seconds
    const timer = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const checkGeminiHealth = async () => {
    try {
      const health = await geminiService.checkHealth();
      setIsConfigured(health.configured);
    } catch (error) {
      console.error('Failed to check Gemini health:', error);
      setIsConfigured(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setPulse(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 p-4 bg-gradient-to-r from-primary-500 to-accent-cyan text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-40 group ${
          pulse ? 'animate-pulse' : ''
        }`}
        title="Chat with DeployX AI"
      >
        <div className="relative">
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <MessageCircle className="w-6 h-6" />
              {/* Sparkle effect */}
              <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-yellow-300 animate-ping" />
            </>
          )}
          
          {/* Status indicator */}
          {!isOpen && (
            <div
              className={`absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white ${
                isConfigured ? 'bg-green-400' : 'bg-yellow-400'
              }`}
              title={isConfigured ? 'AI Ready' : 'AI Configuration Required'}
            ></div>
          )}
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {isOpen ? 'Close Chat' : 'Ask DeployX AI'}
          <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1"></div>
        </div>
      </button>

      {/* Chat Window */}
      <GeminiChat isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
