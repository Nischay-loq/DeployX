import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Sparkles, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import geminiService from '../services/geminiService';
import DataVisualization from './charts/DataVisualization';

export default function GeminiChat({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm DeployX AI Assistant. I can help you with:\n\n• **View your data**: Agents, deployments, backups, command history\n• **Analytics**: Success rates, statistics, recent activity\n• **Navigation**: Guide you through features and workflows\n• **Troubleshooting**: Diagnose and solve problems\n\nWhat would you like to know?",
      timestamp: new Date().toISOString(),
      feedback: null
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const context = geminiService.getCurrentContext();
      const response = await geminiService.chat(input.trim(), context);
      
      const assistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Sorry, I encountered an error. Please try again.');
      
      const errorMessage = {
        role: 'assistant',
        content: '⚠️ Sorry, I encountered an error processing your request. Please make sure the Gemini API is configured correctly and try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared! How can I help you?",
        timestamp: new Date().toISOString()
      }
    ]);
    setError(null);
  };

  // Extract chart data from message content
  const parseMessageContent = (content) => {
    const parts = [];
    const chartRegex = /```json\s*(\{[\s\S]*?"chart_type"[\s\S]*?\})\s*```/g;
    let lastIndex = 0;
    let match;

    while ((match = chartRegex.exec(content)) !== null) {
      // Add text before chart
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.substring(lastIndex, match.index)
        });
      }

      // Try to parse chart data
      try {
        const chartData = JSON.parse(match[1]);
        if (chartData.chart_type && chartData.data) {
          parts.push({
            type: 'chart',
            data: chartData
          });
        }
      } catch (e) {
        console.error('Failed to parse chart data:', e);
        parts.push({
          type: 'text',
          content: match[0]
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.substring(lastIndex)
      });
    }

    // If no charts found, return all text
    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    return parts;
  };

  if (!isOpen) return null;

  // Container classes based on maximize state
  const containerClasses = isMaximized
    ? "fixed inset-4 m-0 w-auto h-auto rounded-xl z-50"
    : "fixed bottom-24 right-6 w-[450px] h-[650px] rounded-xl z-50 animate-in slide-in-from-bottom-5 duration-200";

  const messagesContainerHeight = isMaximized ? "h-[calc(100vh-200px)]" : "flex-1";

  return (
    <div className={`${containerClasses} bg-gray-900/95 backdrop-blur-xl shadow-2xl border border-gray-700/50 flex flex-col`}>
      {/* Header with glassmorphism effect */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gradient-to-r from-primary-500/90 to-accent-cyan/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-md"></div>
            <Sparkles className="w-7 h-7 text-white relative z-10" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-cyan rounded-full border-2 border-primary-600 animate-pulse"></div>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">DeployX AI</h3>
            <p className="text-xs text-cyan-100">Powered by Gemini Pro</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="text-white/80 hover:text-white transition-all text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 backdrop-blur-sm font-medium"
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="text-white/80 hover:text-white transition-all p-2 rounded-lg hover:bg-white/10 backdrop-blur-sm"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-all p-2 rounded-lg hover:bg-white/10 backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages with custom scrollbar */}
      <div className={`${messagesContainerHeight} overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900 to-gray-950 custom-scrollbar`}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-primary-500 to-accent-cyan text-white'
                  : 'bg-gray-800/80 backdrop-blur-sm text-gray-100 border border-gray-700/50'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-3">
                  {parseMessageContent(msg.content).map((part, partIdx) => {
                    if (part.type === 'chart') {
                      return <DataVisualization key={partIdx} chartData={part.data} />;
                    }
                    return (
                      <div key={partIdx} className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            // Style headings
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 text-white" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold mb-2 text-white" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-base font-bold mb-2 text-white" {...props} />,
                            // Style lists
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1.5" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1.5" {...props} />,
                            li: ({node, ...props}) => <li className="text-gray-200 leading-relaxed" {...props} />,
                            // Style paragraphs
                            p: ({node, ...props}) => <p className="mb-2 text-gray-200 leading-relaxed" {...props} />,
                            // Style code blocks
                            code: ({node, inline, ...props}) => 
                              inline ? (
                                <code className="bg-gray-700/80 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm" {...props} />
                              ) : (
                                <code className="block bg-gray-900/80 p-3 rounded-lg my-2 text-green-300 overflow-x-auto font-mono text-sm border border-gray-700/50" {...props} />
                              ),
                            // Style blockquotes
                            blockquote: ({node, ...props}) => (
                              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-500/10 rounded-r-lg" {...props} />
                            ),
                            // Style links
                            a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                            // Style bold
                            strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                            // Style emphasis
                            em: ({node, ...props}) => <em className="italic text-gray-300" {...props} />,
                          }}
                        >
                          {part.content}
                        </ReactMarkdown>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm break-words leading-relaxed">
                  {msg.content}
                </div>
              )}
              <div
                className={`text-xs mt-2 ${
                  msg.role === 'user' ? 'text-cyan-100' : 'text-gray-500'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-3 bg-red-500/10 border-t border-red-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Input with glassmorphism */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about DeployX..."
            className="flex-1 bg-gray-700/50 backdrop-blur-sm text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder-gray-400 border border-gray-600/50 transition-all"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-primary-500 to-accent-cyan text-white p-3 rounded-xl hover:from-primary-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-primary-500/50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
          <span>Press <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Enter</kbd> to send</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Shift+Enter</kbd> for new line</span>
        </p>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
}
