import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import '../css/Terminal.css';

const Terminal = () => {
  const [socket, setSocket] = useState(null);
  const [output, setOutput] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [currentPath, setCurrentPath] = useState('~');
  
  const terminalRef = useRef(null);
  const hiddenInputRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io('http://localhost:8000', {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setOutput(prev => [...prev, { type: 'system', content: 'Connected to remote terminal' }]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setOutput(prev => [...prev, { type: 'system', content: 'Disconnected from remote terminal' }]);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setOutput(prev => [...prev, { type: 'error', content: 'Connection error' }]);
    });

    // Terminal message handler
    newSocket.on('terminal_message', (message) => {
      if (message.type === 'output') {
        const content = message.data;
        
        // Extract path from output if it looks like a path update
        if (content.includes('Current directory:') || content.includes('Changed directory to:')) {
          const pathMatch = content.match(/(?:Current directory:|Changed directory to:)\s*(.+)/);
          if (pathMatch) {
            setCurrentPath(pathMatch[1].trim());
          }
        }
        
        // Don't add the prompt if it's just "$ " or path prompt
        if (content.trim() !== '$' && content.trim() !== '>' && !content.match(/^[^>]*>\s*$/)) {
          setOutput(prev => [...prev, { type: 'output', content: content }]);
        }
        
        // Check if output suggests waiting for input
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('press any key') || 
            lowerContent.includes('continue?') || 
            lowerContent.includes('[y/n]') ||
            lowerContent.includes('password:') ||
            lowerContent.includes('enter')) {
          setWaitingForInput(true);
        }
      } else if (message.type === 'clear') {
        setOutput([]);
      } else if (message.type === 'path_update') {
        setCurrentPath(message.data);
      } else if (message.type === 'error') {
        setOutput(prev => [...prev, { type: 'error', content: message.data }]);
      }
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new output is added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, currentInput]);

  useEffect(() => {
    // Update cursor position when input changes
    setCursorPosition(currentInput.length);
  }, [currentInput]);

  const sendCommand = (command) => {
    if (socket && socket.connected) {
      // Add the command to output before sending
      const prompt = waitingForInput ? '' : `${currentPath}> `;
      setOutput(prev => [...prev, { 
        type: 'input', 
        content: `${prompt}${command}` 
      }]);

      // Send command via Socket.IO
      socket.emit('terminal_command', {
        type: waitingForInput ? 'input' : 'command',
        data: command
      });
      
      // Update path for cd commands
      if (command.trim().startsWith('cd ')) {
        const newPath = command.trim().substring(3).trim();
        if (newPath) {
          setCurrentPath(newPath);
        }
      }
      
      if (!waitingForInput && command.trim() !== '') {
        // Add to command history
        setCommandHistory(prev => {
          const newHistory = [command, ...prev.filter(cmd => cmd !== command)];
          return newHistory.slice(0, 100);
        });
        setHistoryIndex(-1);
      }
      
      setWaitingForInput(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      const command = currentInput;
      sendCommand(command);
      setCurrentInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCursorPosition(Math.max(0, cursorPosition - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCursorPosition(Math.min(currentInput.length, cursorPosition + 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setCursorPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setCursorPosition(currentInput.length);
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (socket && socket.connected) {
        socket.emit('terminal_command', {
          type: 'interrupt',
          data: ''
        });
        setOutput(prev => [...prev, { type: 'output', content: '^C' }]);
      }
      setCurrentInput('');
      setWaitingForInput(false);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput([]);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (cursorPosition > 0) {
        const newInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
        setCurrentInput(newInput);
        setCursorPosition(cursorPosition - 1);
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (cursorPosition < currentInput.length) {
        const newInput = currentInput.slice(0, cursorPosition) + currentInput.slice(cursorPosition + 1);
        setCurrentInput(newInput);
      }
    } else if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      setCursorPosition(0);
    } else if (e.ctrlKey && e.key === 'e') {
      e.preventDefault();
      setCursorPosition(currentInput.length);
    } else if (e.key.length === 1) {
      e.preventDefault();
      const newInput = currentInput.slice(0, cursorPosition) + e.key + currentInput.slice(cursorPosition);
      setCurrentInput(newInput);
      setCursorPosition(cursorPosition + 1);
    }
  };

  const handleTerminalClick = () => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  };

  const formatPath = (path) => {
    if (path.length > 50) {
      const parts = path.split('/');
      if (parts.length > 3) {
        return `.../${parts.slice(-2).join('/')}`;
      }
    }
    return path;
  };

  const renderOutput = () => {
    return output.map((item, index) => {
      let className = 'output-line';
      if (item.type === 'system') className += ' system';
      if (item.type === 'error') className += ' error';
      if (item.type === 'input') className += ' input';
      
      return (
        <div key={index} className={className}>
          <pre>{item.content}</pre>
        </div>
      );
    });
  };

  const renderCurrentLine = () => {
    const prompt = waitingForInput ? '' : `${formatPath(currentPath)}> `;
    const beforeCursor = currentInput.slice(0, cursorPosition);
    const atCursor = currentInput.slice(cursorPosition, cursorPosition + 1) || ' ';
    const afterCursor = currentInput.slice(cursorPosition + 1);

    return (
      <div className="current-input-line">
        <span className="prompt">{prompt}</span>
        <span className="input-text">
          <span className="before-cursor">{beforeCursor}</span>
          <span className="cursor">{atCursor}</span>
          <span className="after-cursor">{afterCursor}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-buttons">
          <div className="button close"></div>
          <div className="button minimize"></div>
          <div className="button maximize"></div>
        </div>
        <div className="terminal-title">
          Remote Terminal - {isConnected ? `Connected (${formatPath(currentPath)})` : 'Disconnected'}
        </div>
      </div>
      
      <div 
        className="terminal-body" 
        onClick={handleTerminalClick}
        tabIndex={0}
      >
        <div className="terminal-content" ref={terminalRef}>
          {renderOutput()}
          {isConnected && renderCurrentLine()}
        </div>
        
        <input
          ref={hiddenInputRef}
          className="hidden-input"
          value=""
          onChange={() => {}}
          onKeyDown={handleKeyPress}
          autoFocus
          disabled={!isConnected}
        />
      </div>
      
      <div className="terminal-footer">
        <span>Use Ctrl+C to interrupt, Ctrl+L to clear, ↑↓ for history, Home/End to navigate</span>
      </div>
    </div>
  );
};

export default Terminal;