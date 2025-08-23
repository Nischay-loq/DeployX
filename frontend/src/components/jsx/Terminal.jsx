import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import io from 'socket.io-client';
import "@xterm/xterm/css/xterm.css";
import '../css/Terminal.css';

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  const currentLineRef = useRef('');
  const isMountedRef = useRef(true);
  const connectionAttemptedRef = useRef(false);

  // Use refs to store current state values for terminal input handler
  const selectedAgentRef = useRef('');
  const shellStartedRef = useRef(false);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [availableShells, setAvailableShells] = useState([]);
  const [selectedShell, setSelectedShell] = useState('');
  const [connectedAgents, setConnectedAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [shellStarted, setShellStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Update refs whenever state changes
  useEffect(() => {
    selectedAgentRef.current = selectedAgent;
    console.log('selectedAgent updated to:', selectedAgent);
  }, [selectedAgent]);

  useEffect(() => {
    shellStartedRef.current = shellStarted;
    console.log('shellStarted updated to:', shellStarted);
  }, [shellStarted]);

  // Terminal configuration
  const TERMINAL_CONFIG = {
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 15,
    lineHeight: 1.2,
    fontFamily: 'Consolas, "Cascadia Code", "Source Code Pro", "Courier New", monospace',
    fontWeight: 500,
    letterSpacing: 0,
    rows: 24,
    cols: 80,
    scrollback: 1000,
    rendererType: 'canvas',
    allowTransparency: true,
    theme: {
      background: '#1a1a1a',
      foreground: '#e0e0e0',
      cursor: '#ffffff',
      cursorAccent: '#000000',
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
  };

  // Initialize terminal
  const initializeTerminal = useCallback(() => {
    if (!terminalRef.current || terminalInstanceRef.current) return;

    try {
      // Create terminal with initial dimensions
      terminalInstanceRef.current = new Terminal(TERMINAL_CONFIG);
      fitAddonRef.current = new FitAddon();
      
      // Load addons
      terminalInstanceRef.current.loadAddon(fitAddonRef.current);
      terminalInstanceRef.current.loadAddon(new WebLinksAddon());
      
      // Open terminal
      terminalInstanceRef.current.open(terminalRef.current);
      
      // Initial welcome message
      terminalInstanceRef.current.writeln('\x1b[34m=== DeployX Terminal ===\x1b[0m');
      terminalInstanceRef.current.writeln('\x1b[90mConnecting to backend...\x1b[0m');
      
      // Ensure proper sizing
      setTimeout(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
          terminalInstanceRef.current.scrollToBottom();
        }
      }, 100);

      console.log('Terminal initialized successfully');
      return terminalInstanceRef.current;
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      setConnectionError('Failed to initialize terminal: ' + error.message);
    }
  }, []);

  // Terminal input handler - this is the key fix
  const setupTerminalInput = useCallback(() => {
    if (!terminalInstanceRef.current) return;

    terminalInstanceRef.current.onData((data) => {
      // Use refs to get current values instead of stale closure values
      const currentSelectedAgent = selectedAgentRef.current;
      const currentShellStarted = shellStartedRef.current;
      
      console.log('Terminal input received. Agent:', currentSelectedAgent, 'Shell started:', currentShellStarted);

      if (!currentSelectedAgent || !currentShellStarted) {
        terminalInstanceRef.current.write('\x1b[31m\r\nPlease select an agent and start a shell first.\x1b[0m\r\n');
        return;
      }

      if (!socketRef.current || !socketRef.current.connected) {
        terminalInstanceRef.current.write('\x1b[31m\r\nNot connected to backend server.\x1b[0m\r\n');
        return;
      }

      // Handle Enter key
      if (data === '\r' || data === '\n') {
        terminalInstanceRef.current.write('\r\n');
        console.log('Sending command to agent:', currentSelectedAgent, 'Command:', currentLineRef.current);
        socketRef.current.emit('command_input', {
          agent_id: currentSelectedAgent,
          command: currentLineRef.current + '\n'
        });
        currentLineRef.current = '';
        return;
      }

      // Handle Backspace
      if (data === '\u007f' || data === '\b') {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          terminalInstanceRef.current.write('\b \b');
        }
        return;
      }

      // Handle Ctrl+C
      if (data === '\u0003') {
        terminalInstanceRef.current.write('^C\r\n');
        socketRef.current.emit('command_input', { 
          agent_id: currentSelectedAgent, 
          command: '\u0003' 
        });
        currentLineRef.current = '';
        return;
      }

      // Handle Ctrl+Z
      if (data === '\u001A') {
        terminalInstanceRef.current.write('^Z\r\n');
        socketRef.current.emit('command_input', {
          agent_id: currentSelectedAgent,
          command: '\u001A'
        });
        currentLineRef.current = '';
        return;
      }

      // Handle Ctrl+D
      if (data === '\u0004') {
        socketRef.current.emit('command_input', { 
          agent_id: currentSelectedAgent, 
          command: '\u0004' 
        });
        return;
      }

      // Handle printable characters
      const charCode = data.charCodeAt(0);
      if (charCode >= 32 || data === '\t') {
        currentLineRef.current += data;
        terminalInstanceRef.current.write(data);
      }
    });
  }, []); // Empty dependency array since we're using refs

  // Socket connection with better error handling
  const initializeSocket = useCallback(() => {
    if (socketRef.current || connectionAttemptedRef.current) return;
    
    connectionAttemptedRef.current = true;
    setIsLoading(true);
    setConnectionError(null);

    console.log('Attempting to connect to backend...');
    
    try {
      // socketRef.current = io('https://deployx-server.onrender.com', {
      socketRef.current = io('https://deployx-server.onrender.com/', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true,
        autoConnect: true
      });

      // Connection successful
      socketRef.current.on('connect', () => {
        if (!isMountedRef.current) return;
        
        console.log('✓ Connected to backend server');
        setIsConnected(true);
        setIsLoading(false);
        setConnectionError(null);
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln('\x1b[32m✓ Connected to backend server\x1b[0m');
          terminalInstanceRef.current.writeln('\x1b[33mFetching available agents...\x1b[0m');
        }

        // Register frontend and get agents
        socketRef.current.emit('frontend_register', {});
        
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            console.log('Requesting agents list...');
            socketRef.current.emit('get_agents');
          }
        }, 500);
      });

      // Connection failed
      socketRef.current.on('connect_error', (error) => {
        if (!isMountedRef.current) return;
        
        console.error('Connection error:', error);
        setIsConnected(false);
        setIsLoading(false);
        setConnectionError(`Failed to connect: ${error.message}`);
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln('\x1b[31m✗ Failed to connect to backend server\x1b[0m');
          terminalInstanceRef.current.writeln(`\x1b[31mError: ${error.message}\x1b[0m`);
        }
      });

      // Disconnected
      socketRef.current.on('disconnect', (reason) => {
        if (!isMountedRef.current) return;
        
        console.log('Disconnected from backend:', reason);
        setIsConnected(false);
        setShellStarted(false);
        setConnectionError(`Disconnected: ${reason}`);
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`\x1b[31m✗ Disconnected: ${reason}\x1b[0m`);
        }

        // Clear agent/shell data
        setConnectedAgents([]);
        setAvailableShells([]);
        setSelectedAgent('');
        setSelectedShell('');
      });

      // Agents list received
      socketRef.current.on('agents_list', (agents) => {
        if (!isMountedRef.current) return;
        
        console.log('Received agents list:', agents);
        
        if (Array.isArray(agents)) {
          setConnectedAgents(agents);
          
          if (terminalInstanceRef.current) {
            if (agents.length > 0) {
              terminalInstanceRef.current.writeln(`\x1b[32m✓ Found ${agents.length} agent(s): ${agents.join(', ')}\x1b[0m`);
              terminalInstanceRef.current.writeln('\x1b[33mPlease select an agent to continue.\x1b[0m');
              
              // Auto-select first agent
              if (!selectedAgentRef.current) {
                const firstAgent = agents[0];
                setSelectedAgent(firstAgent);
                console.log('Auto-selecting first agent:', firstAgent);
                
                setTimeout(() => {
                  if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('get_shells', firstAgent);
                  }
                }, 100);
              }
            } else {
              terminalInstanceRef.current.writeln('\x1b[31m⚠ No agents available\x1b[0m');
              terminalInstanceRef.current.writeln('\x1b[33mPlease ensure at least one agent is running and connected.\x1b[0m');
            }
          }
        } else {
          console.error('Invalid agents list received:', agents);
          setConnectionError('Invalid agents list received from server');
        }
      });

      // Shells list received
      socketRef.current.on('shells_list', (shells) => {
        if (!isMountedRef.current) return;
        
        console.log('Received shells list:', shells);
        
        if (Array.isArray(shells)) {
          setAvailableShells(shells);
          
          if (terminalInstanceRef.current) {
            if (shells.length > 0) {
              terminalInstanceRef.current.writeln(`\x1b[32m✓ Found ${shells.length} shell(s): ${shells.join(', ')}\x1b[0m`);
              terminalInstanceRef.current.writeln('\x1b[33mSelect a shell and click "Start Shell" to begin.\x1b[0m');
              
              // Auto-select default shell
              if (!selectedShell) {
                const defaultShell = shells.includes('cmd') ? 'cmd' : 
                                   shells.includes('bash') ? 'bash' : shells[0];
                setSelectedShell(defaultShell);
              }
            } else {
              terminalInstanceRef.current.writeln('\x1b[31m⚠ No shells available for this agent\x1b[0m');
            }
          }
        }
      });

      // Command output
      socketRef.current.on('command_output', (data) => {
        if (!isMountedRef.current || !terminalInstanceRef.current) return;
        terminalInstanceRef.current.write(data);
      });

      // Shell started - this is crucial
      socketRef.current.on('shell_started', (shell) => {
        if (!isMountedRef.current) return;
        
        console.log('Shell started successfully:', shell);
        setShellStarted(true); // This will update shellStartedRef.current
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`\x1b[32m✓ Shell '${shell}' started successfully\x1b[0m`);
          terminalInstanceRef.current.writeln('\x1b[33mYou can now enter commands. Current state:\x1b[0m');
          terminalInstanceRef.current.writeln(`\x1b[36mAgent: ${selectedAgentRef.current}\x1b[0m`);
          terminalInstanceRef.current.writeln(`\x1b[36mShell: ${shell}\x1b[0m`);
          terminalInstanceRef.current.writeln(`\x1b[36mShell Status: ${shellStartedRef.current ? 'Started' : 'Not Started'}\x1b[0m`);
        }
      });

      // Error messages
      socketRef.current.on('error', (data) => {
        if (!isMountedRef.current) return;
        
        console.error('Socket error:', data);
        const errorMessage = data?.message || data || 'Unknown error';
        setConnectionError(errorMessage);
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`\x1b[31m✗ Error: ${errorMessage}\x1b[0m`);
        }
      });

      // Debug: Log all events
      socketRef.current.onAny((eventName, ...args) => {
        console.log(`Socket event: ${eventName}`, args);
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setConnectionError('Failed to initialize connection: ' + error.message);
      setIsLoading(false);
    }
  }, []);

  // Event handlers
  const handleAgentChange = useCallback((agentId) => {
    if (!socketRef.current?.connected) return;
    
    console.log('Agent changed to:', agentId);
    setSelectedAgent(agentId);
    setShellStarted(false);
    setSelectedShell('');
    setAvailableShells([]);

    if (agentId && terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln(`\x1b[36mSwitched to agent: ${agentId}\x1b[0m`);
      terminalInstanceRef.current.writeln('\x1b[33mFetching available shells...\x1b[0m');
      
      socketRef.current.emit('get_shells', agentId);
    }
  }, []);

  const handleStartShell = useCallback(() => {
    if (!selectedAgent || !selectedShell || shellStarted || !socketRef.current?.connected) {
      console.log('Cannot start shell:', { selectedAgent, selectedShell, shellStarted, connected: socketRef.current?.connected });
      return;
    }

    console.log('Starting shell:', selectedShell, 'on agent:', selectedAgent);
    setShellStarted(false); // Reset state before starting
    
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln(`\x1b[36mStarting ${selectedShell} on ${selectedAgent}...\x1b[0m`);
    }
    
    socketRef.current.emit('start_shell', { 
      agent_id: selectedAgent, 
      shell: selectedShell 
    });
  }, [selectedAgent, selectedShell, shellStarted]);

  // Window and container resize handler
  const handleResize = useCallback(() => {
    if (fitAddonRef.current && terminalInstanceRef.current) {
      try {
        fitAddonRef.current.fit();
        terminalInstanceRef.current.scrollToBottom();
      } catch (error) {
        console.warn('Error fitting terminal:', error);
      }
    }
  }, []);

  // Setup resize observer
  useEffect(() => {
    if (!terminalRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    resizeObserver.observe(terminalRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  // Main effect
  useEffect(() => {
    isMountedRef.current = true;
    connectionAttemptedRef.current = false;

    const terminal = initializeTerminal();
    if (terminal) {
      initializeSocket();
      setupTerminalInput(); // Set up input handler once
    }

    window.addEventListener('resize', handleResize);

    return () => {
      isMountedRef.current = false;
      connectionAttemptedRef.current = false;
      
      window.removeEventListener('resize', handleResize);
      
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
    };
  }, []);

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
              <option value="">
                {isLoading ? 'Loading...' : `Select Agent (${connectedAgents.length} available)`}
              </option>
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
            <span>
              {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {shellStarted && <span className="shell-status">• Shell Active</span>}
          </div>
        </div>
        
        {connectionError && (
          <div className="error-message">
            <span>⚠ {connectionError}</span>
          </div>
        )}
      </div>
      
      <div className="terminal-wrapper">
        <div ref={terminalRef} className="terminal" />
      </div>
    </div>
  );
};

export default TerminalComponent;