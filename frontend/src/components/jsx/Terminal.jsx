// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { io } from 'socket.io-client';
// import '../css/Terminal.css';

// const Terminal = () => {
//     const [socket, setSocket] = useState(null);
//     const [output, setOutput] = useState([]);
//     const [currentInput, setCurrentInput] = useState('');
//     const [isConnected, setIsConnected] = useState(false);
//     const [waitingForInput, setWaitingForInput] = useState(false);
//     const [commandHistory, setCommandHistory] = useState([]);
//     const [historyIndex, setHistoryIndex] = useState(-1);
//     const [cursorPosition, setCursorPosition] = useState(0);
//     const [currentPath, setCurrentPath] = useState('~');
//     const [selectedShell, setSelectedShell] = useState('bash');
//     const [availableShells, setAvailableShells] = useState(['bash', 'cmd', 'powershell']);
    
//     const terminalRef = useRef(null);
//     const hiddenInputRef = useRef(null);

//     // Scroll to bottom of terminal
//     const scrollToBottom = useCallback(() => {
//         if (terminalRef.current) {
//             terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
//         }
//     }, []);

//     // Connect to Socket.IO
//     useEffect(() => {
//         const newSocket = io('http://localhost:8000', {
//             transports: ['websocket', 'polling'],
//             upgrade: true
//         });

//         newSocket.on('connect', () => {
//             console.log('Connected to server');
//             setIsConnected(true);
//             newSocket.emit('request_initial_info');
//         });

//         newSocket.on('disconnect', () => {
//             console.log('Disconnected from server');
//             setIsConnected(false);
//         });

//         newSocket.on('connect_error', (error) => {
//             console.error('Connection error:', error);
//             setOutput(prev => [...prev, { type: 'error', content: `Connection error: ${error.message}` }]);
//         });

//         newSocket.on('terminal_message', (message) => {
//             if (message.type === 'output') {
//                 setOutput(prev => [...prev, { type: 'output', content: message.data }]);
//                 const lowerContent = message.data.toLowerCase();
//                 if (/(press any key|continue\?|password:|\[y\/n\]|enter)/.test(lowerContent)) {
//                     setWaitingForInput(true);
//                 }
//             } 
//             else if (message.type === 'clear') {
//                 setOutput([]);
//             } 
//             else if (message.type === 'path_update') {
//                 setCurrentPath(message.data);
//             } 
//             else if (message.type === 'shell_type') {
//                 setSelectedShell(message.data);
//             } 
//             else if (message.type === 'available_shells') {
//                 setAvailableShells(message.data);
//             } 
//             else if (message.type === 'error') {
//                 setOutput(prev => [...prev, { type: 'error', content: message.data }]);
//             }
//         });

//         setSocket(newSocket);
//         return () => newSocket.close();
//     }, []);

//     // Auto-scroll on new output
//     useEffect(() => {
//         scrollToBottom();
//     }, [output, currentInput, scrollToBottom]);

//     // Resize handling (debounced)
//     useEffect(() => {
//         let resizeTimer;
//         const handleResize = () => {
//             clearTimeout(resizeTimer);
//             resizeTimer = setTimeout(() => {
//                 if (socket && socket.connected && terminalRef.current) {
//                     const { clientWidth, clientHeight } = terminalRef.current;
//                     const cols = Math.floor(clientWidth / 8);
//                     const rows = Math.floor(clientHeight / 16);
//                     socket.emit('terminal_resize', { cols, rows });
//                 }
//             }, 150);
//         };
//         window.addEventListener('resize', handleResize);
//         return () => window.removeEventListener('resize', handleResize);
//     }, [socket]);

//     const sendCommand = useCallback((command) => {
//         if (!socket || !socket.connected) return;

//         const prompt = getPrompt(selectedShell, currentPath, waitingForInput);
//         setOutput(prev => [...prev, { type: 'input', content: `${prompt}${command}` }]);

//         socket.emit('terminal_command', {
//             type: waitingForInput ? 'input' : 'command',
//             data: command
//         });

//         if (!waitingForInput && command.trim() !== '') {
//             setCommandHistory(prev => {
//                 const newHistory = [command, ...prev.filter(cmd => cmd !== command)];
//                 return newHistory.slice(0, 100);
//             });
//             setHistoryIndex(-1);
//         }

//         setWaitingForInput(false);
//     }, [socket, selectedShell, currentPath, waitingForInput]);

//     const handleKeyPress = useCallback((e) => {
//         if (e.key === 'Enter') {
//             sendCommand(currentInput);
//             setCurrentInput('');
//             setCursorPosition(0);
//         } 
//         else if (e.key === 'ArrowUp') {
//             e.preventDefault();
//             if (commandHistory.length > 0) {
//                 const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
//                 setHistoryIndex(newIndex);
//                 setCurrentInput(commandHistory[newIndex] || '');
//                 setCursorPosition((commandHistory[newIndex] || '').length);
//             }
//         } 
//         else if (e.key === 'ArrowDown') {
//             e.preventDefault();
//             if (historyIndex > 0) {
//                 const newIndex = historyIndex - 1;
//                 setHistoryIndex(newIndex);
//                 setCurrentInput(commandHistory[newIndex] || '');
//                 setCursorPosition((commandHistory[newIndex] || '').length);
//             } else {
//                 setHistoryIndex(-1);
//                 setCurrentInput('');
//                 setCursorPosition(0);
//             }
//         } 
//         else if (e.key === 'ArrowLeft') {
//             e.preventDefault();
//             setCursorPosition(Math.max(0, cursorPosition - 1));
//         } 
//         else if (e.key === 'ArrowRight') {
//             e.preventDefault();
//             setCursorPosition(Math.min(currentInput.length, cursorPosition + 1));
//         } 
//         else if (e.key === 'Home') {
//             e.preventDefault();
//             setCursorPosition(0);
//         } 
//         else if (e.key === 'End') {
//             e.preventDefault();
//             setCursorPosition(currentInput.length);
//         } 
//         else if (e.ctrlKey && e.key === 'c') {
//             e.preventDefault();
//             socket.emit('terminal_command', { type: 'interrupt', data: '' });
//             setOutput(prev => [...prev, { type: 'output', content: '^C' }]);
//             setCurrentInput('');
//             setCursorPosition(0);
//             setWaitingForInput(false);
//         } 
//         else if (e.ctrlKey && e.key === 'l') {
//             e.preventDefault();
//             setOutput([]);
//         } 
//         else if (e.key === 'Backspace') {
//             e.preventDefault();
//             if (cursorPosition > 0) {
//                 const newInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
//                 setCurrentInput(newInput);
//                 setCursorPosition(cursorPosition - 1);
//             }
//         } 
//         else if (e.key === 'Delete') {
//             e.preventDefault();
//             if (cursorPosition < currentInput.length) {
//                 const newInput = currentInput.slice(0, cursorPosition) + currentInput.slice(cursorPosition + 1);
//                 setCurrentInput(newInput);
//             }
//         } 
//         else if (e.ctrlKey && e.key === 'a') {
//             e.preventDefault();
//             setCursorPosition(0);
//         } 
//         else if (e.ctrlKey && e.key === 'e') {
//             e.preventDefault();
//             setCursorPosition(currentInput.length);
//         } 
//         else if (e.key.length === 1 && !e.metaKey && !e.altKey) {
//             e.preventDefault();
//             const newInput = currentInput.slice(0, cursorPosition) + e.key + currentInput.slice(cursorPosition);
//             setCurrentInput(newInput);
//             setCursorPosition(cursorPosition + 1);
//         }
//     }, [currentInput, cursorPosition, historyIndex, commandHistory, sendCommand, socket]);

//     const handleTerminalClick = () => hiddenInputRef.current?.focus();

//     const formatPath = (path) => {
//         if (path.length > 50) {
//             const parts = path.split(/[\\/]/);
//             if (parts.length > 3) return `...${parts.slice(-2).join('/')}`;
//         }
//         return path;
//     };

//     const getPrompt = (shell, path, isWaitingForInput) => {
//         if (isWaitingForInput) return '';
//         const formattedPath = formatPath(path);
//         switch (shell) {
//             case 'cmd': return `${formattedPath}>`;
//             case 'powershell': return `PS ${formattedPath}>`;
//             case 'bash':
//             default: return `${formattedPath}$`;
//         }
//     };

//     const handleShellChange = useCallback((shellType) => {
//         if (socket && socket.connected) {
//             setSelectedShell(shellType);
//             setOutput(prev => [...prev, { type: 'system', content: `Switching to ${shellType} terminal...` }]);
//             socket.emit('switch_shell', { shell: shellType });
//             setCurrentInput('');
//             setWaitingForInput(false);
//             setCommandHistory([]);
//             setHistoryIndex(-1);
//             setCursorPosition(0);
//         }
//     }, [socket]);

//     const renderOutput = () => output.map((item, index) => {
//         let className = 'output-line';
//         if (item.type === 'system') className += ' system';
//         if (item.type === 'error') className += ' error';
//         if (item.type === 'input') className += ' input';
//         return <div key={index} className={className}><pre>{item.content}</pre></div>;
//     });

//     const renderCurrentLine = () => {
//         const prompt = getPrompt(selectedShell, currentPath, waitingForInput);
//         const beforeCursor = currentInput.slice(0, cursorPosition);
//         const atCursor = currentInput.slice(cursorPosition, cursorPosition + 1) || ' ';
//         const afterCursor = currentInput.slice(cursorPosition + 1);

//         return (
//             <div className="current-input-line">
//                 <span className="prompt">{prompt} </span>
//                 <span className="input-text">
//                     <span className="before-cursor">{beforeCursor}</span>
//                     <span className="cursor">{atCursor}</span>
//                     <span className="after-cursor">{afterCursor}</span>
//                 </span>
//             </div>
//         );
//     };

//     return (
//         <div className={`terminal-container ${selectedShell}-theme`}>
//             <div className="terminal-header">
//                 <div className="terminal-buttons">
//                     <div className="button close"></div>
//                     <div className="button minimize"></div>
//                     <div className="button maximize"></div>
//                 </div>
//                 <div className="terminal-title">
//                     Remote Terminal - {isConnected ? `Connected (${selectedShell})` : 'Disconnected'}
//                 </div>
//                 <div className="shell-selector">
//                     <label htmlFor="shell-select">Shell:</label>
//                     <select
//                         id="shell-select"
//                         value={selectedShell}
//                         onChange={(e) => handleShellChange(e.target.value)}
//                         disabled={!isConnected}
//                         className="rounded-md px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     >
//                         {availableShells.map(shell => (
//                             <option key={shell} value={shell}>
//                                 {shell.charAt(0).toUpperCase() + shell.slice(1)}
//                             </option>
//                         ))}
//                     </select>
//                 </div>
//             </div>

//             <div className="terminal-body" onClick={handleTerminalClick} tabIndex={0}>
//                 <div className="terminal-content" ref={terminalRef}>
//                     {renderOutput()}
//                     {isConnected && renderCurrentLine()}
//                 </div>

//                 <input
//                     ref={hiddenInputRef}
//                     className="hidden-input"
//                     onKeyDown={handleKeyPress}
//                     autoFocus
//                 />
//             </div>

//             <div className="terminal-footer">
//                 <span>Use Ctrl+C to interrupt, Ctrl+L to clear, ↑↓ for history, Home/End to navigate</span>
//             </div>
//         </div>
//     );
// };

// export default Terminal;

import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import io from 'socket.io-client';
import 'xterm/css/xterm.css';
import '../css/Terminal.css';

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const fitAddon = useRef(null);
  const socket = useRef(null);

  const [isConnected, setIsConnected] = useState(false);
  const [availableShells, setAvailableShells] = useState([]);
  const [selectedShell, setSelectedShell] = useState('');
  const [connectedAgents, setConnectedAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [shellStarted, setShellStarted] = useState(false);

  const currentLine = useRef('');
  const connectionAttempted = useRef(false);
  const isComponentMounted = useRef(true);
  
  // Use refs to store current state for the terminal input handler
  const selectedAgentRef = useRef('');
  const shellStartedRef = useRef(false);

  // Update refs whenever state changes
  useEffect(() => {
    selectedAgentRef.current = selectedAgent;
  }, [selectedAgent]);

  useEffect(() => {
    shellStartedRef.current = shellStarted;
  }, [shellStarted]);

  useEffect(() => {
    // Prevent multiple initializations
    if (connectionAttempted.current) return;
    connectionAttempted.current = true;
    isComponentMounted.current = true;

    // Initialize terminal
    terminal.current = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selection: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      cols: 100,
      rows: 30
    });

    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);
    terminal.current.loadAddon(new WebLinksAddon());

    terminal.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Initialize Socket.IO connection with better configuration
    socket.current = io('http://localhost:8000', { 
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: true
    });

    /** --- SOCKET EVENT HANDLERS --- **/
    socket.current.on('connect', () => {
      if (!isComponentMounted.current) return;
      
      console.log('Connected to backend');
      setIsConnected(true);
      terminal.current.writeln('\x1b[32m✓ Connected to backend server\x1b[0m');
      terminal.current.writeln('\x1b[33mPlease select an agent and shell to start.\x1b[0m');
      
      socket.current.emit('frontend_register', {});
      setTimeout(() => {
        if (socket.current && socket.current.connected) {
          socket.current.emit('get_agents');
        }
      }, 100);
    });

    socket.current.on('disconnect', (reason) => {
      if (!isComponentMounted.current) return;
      
      console.log('Disconnected from backend:', reason);
      setIsConnected(false);
      setShellStarted(false);
      terminal.current.writeln('\x1b[31m✗ Disconnected from backend server\x1b[0m');
      setConnectedAgents([]);
      setAvailableShells([]);
      setSelectedAgent('');
    });

    socket.current.on('connect_error', (error) => {
      if (!isComponentMounted.current) return;
      
      console.error('Connection error:', error);
      terminal.current.writeln('\x1b[31m✗ Connection error: ' + error.message + '\x1b[0m');
    });

    socket.current.on('agents_list', (agents) => {
      if (!isComponentMounted.current) return;
      
      console.log('Received agents list:', agents);
      setConnectedAgents(agents);
      
      if (agents.length > 0 && !selectedAgentRef.current) {
        const firstAgent = agents[0];
        setSelectedAgent(firstAgent);
        if (socket.current && socket.current.connected) {
          socket.current.emit('get_shells', firstAgent);
        }
      } else if (agents.length === 0) {
        setSelectedAgent('');
        setAvailableShells([]);
        setShellStarted(false);
      }
    });

    socket.current.on('shells_list', (shells) => {
      if (!isComponentMounted.current) return;
      
      console.log('Received shells list:', shells);
      setAvailableShells(shells);
      
      if (shells.length > 0 && !selectedShell) {
        const defaultShell = shells.includes('cmd') ? 'cmd' : shells[0];
        setSelectedShell(defaultShell);
      }
    });

    socket.current.on('command_output', (data) => {
      if (!isComponentMounted.current) return;
      
      terminal.current.write(data);
    });

    socket.current.on('shell_started', (shell) => {
      if (!isComponentMounted.current) return;
      
      setShellStarted(true);
      terminal.current.writeln(`\x1b[33m\r\nShell '${shell}' started successfully. You can now enter commands.\x1b[0m`);
    });

    socket.current.on('error', (data) => {
      if (!isComponentMounted.current) return;
      
      terminal.current.writeln(`\x1b[31mError: ${data.message}\x1b[0m`);
    });

    /** --- TERMINAL INPUT HANDLER --- **/
terminal.current.onData((data) => {
  // Use refs to get current values instead of stale closure values
  if (!selectedAgentRef.current || !shellStartedRef.current) {
    terminal.current.write('\x1b[31m\r\nPlease select an agent and start a shell first.\x1b[0m\r\n');
    return;
  }

  if (!socket.current || !socket.current.connected) {
    terminal.current.write('\x1b[31m\r\nNot connected to backend server.\x1b[0m\r\n');
    return;
  }

  if (data === '\r' || data === '\n') { // Enter key - handle both \r and \n
    // Echo the newline to terminal first
    terminal.current.write('\r\n');
    
    // Send the complete command
    socket.current.emit('command_input', {
      agent_id: selectedAgentRef.current,
      command: currentLine.current + '\n'
    });
    currentLine.current = '';
    return;
  }

  if (data === '\u007f' || data === '\b') { // Backspace
    if (currentLine.current.length > 0) {
      currentLine.current = currentLine.current.slice(0, -1);
      terminal.current.write('\b \b');
    }
    return;
  }

  if (data === '\u0003') { // Ctrl+C
    terminal.current.write('^C\r\n');
    socket.current.emit('command_input', { 
      agent_id: selectedAgentRef.current, 
      command: '\u0003' 
    });
    currentLine.current = '';
    return;
  }

  if (data === '\u0004') { // Ctrl+D
    socket.current.emit('command_input', { 
      agent_id: selectedAgentRef.current, 
      command: '\u0004' 
    });
    return;
  }

  // Handle printable characters and tab
  const charCode = data.charCodeAt(0);
  if (charCode >= 32 || data === '\t') { // Printable or Tab
    currentLine.current += data;
    terminal.current.write(data);
  }
});

    /** --- WINDOW RESIZE --- **/
    const handleResize = () => {
      if (fitAddon.current && terminal.current) {
        try {
          fitAddon.current.fit();
        } catch (error) {
          console.warn('Error fitting terminal:', error);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isComponentMounted.current = false;
      connectionAttempted.current = false;
      
      if (socket.current) {
        socket.current.removeAllListeners();
        socket.current.disconnect();
        socket.current = null;
      }
      
      if (terminal.current) {
        terminal.current.dispose();
        terminal.current = null;
      }
      
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle agent changes
  useEffect(() => {
    if (selectedAgent && socket.current && socket.current.connected && isComponentMounted.current) {
      socket.current.emit('get_shells', selectedAgent);
    }
  }, [selectedAgent]);

  /** --- HELPERS --- **/
  const handleShellChange = (shell) => {
    if (!socket.current || !socket.current.connected) return;
    
    setSelectedShell(shell);
    setShellStarted(false);
    
    if (selectedAgent) {
      terminal.current.clear();
      terminal.current.writeln(`\x1b[36mStarting ${shell}...\x1b[0m`);
      socket.current.emit('start_shell', { agent_id: selectedAgent, shell });
    }
  };

  const handleAgentChange = (agentId) => {
    if (!socket.current || !socket.current.connected) return;
    
    setSelectedAgent(agentId);
    setShellStarted(false);
    setSelectedShell('');
    setAvailableShells([]);

    if (agentId) {
      socket.current.emit('get_shells', agentId);
      terminal.current.clear();
      terminal.current.writeln(`\x1b[36mConnected to agent: ${agentId}\x1b[0m`);
      terminal.current.writeln('\x1b[33mPlease select a shell to start.\x1b[0m');
    }
  };

  const handleStartShell = () => {
    if (selectedAgent && selectedShell && !shellStarted && socket.current && socket.current.connected) {
      handleShellChange(selectedShell);
    }
  };

  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="terminal-controls">
          <div className="control-group">
            <label>Agent:</label>
            <select
              value={selectedAgent}
              onChange={(e) => handleAgentChange(e.target.value)}
              disabled={connectedAgents.length === 0 || !isConnected}
            >
              <option value="">Select Agent ({connectedAgents.length} available)</option>
              {connectedAgents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Shell:</label>
            <select
              value={selectedShell}
              onChange={(e) => setSelectedShell(e.target.value)}
              disabled={availableShells.length === 0 || !isConnected}
            >
              <option value="">Select Shell ({availableShells.length} available)</option>
              {availableShells.map(shell => (
                <option key={shell} value={shell}>{shell}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <button
              onClick={handleStartShell}
              disabled={!selectedAgent || !selectedShell || shellStarted || !isConnected}
              className="start-shell-btn"
            >
              {shellStarted ? 'Shell Running' : 'Start Shell'}
            </button>
          </div>
          <div className="status-indicator">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            {shellStarted && <span className="shell-status">• Shell Active</span>}
          </div>
        </div>
      </div>
      <div className="terminal-wrapper">
        <div ref={terminalRef} className="terminal"></div>
      </div>
    </div>
  );
};

export default TerminalComponent;