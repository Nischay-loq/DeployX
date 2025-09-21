import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import io from 'socket.io-client';
import "@xterm/xterm/css/xterm.css";
import '../css/Terminal.css';
import Notification from './Notification';

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  const currentLineRef = useRef('');
  const cursorPositionRef = useRef(0);
  const isMountedRef = useRef(true);
  const connectionAttemptedRef = useRef(false);

  // Command history - now per shell session
  const commandHistoryRef = useRef({});
  const historyIndexRef = useRef({});
  const currentPromptRef = useRef('');

  // Use refs to store current state values for terminal input handler
  const selectedAgentRef = useRef('');
  const activeShellSessionRef = useRef('');

  // Enhanced state for multi-shell management
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [availableShells, setAvailableShells] = useState([]);
  const [connectedAgents, setConnectedAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // New state for multi-shell sessions
  const [shellSessions, setShellSessions] = useState({}); // sessionId -> { agentId, shell, status, lastActivity }
  const [activeShellSession, setActiveShellSession] = useState(''); // Currently active session ID
  const [showNewShellModal, setShowNewShellModal] = useState(false);

  // Helper functions for shell session management
  const generateSessionId = useCallback((agentId, shell) => {
    return `${agentId}_${shell}_${Date.now()}`;
  }, []);

  const getSessionDisplayName = useCallback((session) => {
    return `${session.agentId} - ${session.shell}`;
  }, []);

  // Notification handler
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    const durations = {
      error: 8000,
      warning: 6000,
      success: 3000,
      info: 2000
    };

    setNotifications(prev => {
      const filtered = prev.filter(n => n.message !== message);
      return [...filtered, { 
        id, 
        message, 
        type,
        duration: durations[type] || 5000
      }];
    });
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear screen command handler
  const handleClearScreen = useCallback(() => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      if (currentPromptRef.current) {
        terminalInstanceRef.current.write(currentPromptRef.current);
      }
      currentLineRef.current = '';
      cursorPositionRef.current = 0;
    }
  }, []);

  // Redraw the current line with cursor at the correct position
  const redrawLine = useCallback(() => {
    if (!terminalInstanceRef.current) return;
    
    const line = currentLineRef.current;
    const cursorPos = cursorPositionRef.current;
    
    terminalInstanceRef.current.write('\r');
    terminalInstanceRef.current.write('\x1b[K');
    terminalInstanceRef.current.write(currentPromptRef.current);
    terminalInstanceRef.current.write(line);
    
    const moveBack = line.length - cursorPos;
    if (moveBack > 0) {
      terminalInstanceRef.current.write('\x1b[' + moveBack + 'D');
    }
  }, []);

  // Command history functions - now session-aware
  const addToHistory = useCallback((command, sessionId) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;
    
    if (!commandHistoryRef.current[sessionId]) {
      commandHistoryRef.current[sessionId] = [];
    }
    
    if (trimmedCommand !== commandHistoryRef.current[sessionId][commandHistoryRef.current[sessionId].length - 1]) {
      commandHistoryRef.current[sessionId].push(trimmedCommand);
      if (commandHistoryRef.current[sessionId].length > 100) {
        commandHistoryRef.current[sessionId] = commandHistoryRef.current[sessionId].slice(-100);
      }
    }
    historyIndexRef.current[sessionId] = -1;
  }, []);

  const navigateHistory = useCallback((direction) => {
    const sessionId = activeShellSessionRef.current;
    if (!sessionId || !commandHistoryRef.current[sessionId] || commandHistoryRef.current[sessionId].length === 0) return;

    let newIndex = historyIndexRef.current[sessionId] || -1;
    
    if (direction === 'up') {
      if (newIndex === -1) {
        newIndex = commandHistoryRef.current[sessionId].length - 1;
      } else if (newIndex > 0) {
        newIndex--;
      }
    } else if (direction === 'down') {
      if (newIndex === -1) return;
      if (newIndex < commandHistoryRef.current[sessionId].length - 1) {
        newIndex++;
      } else {
        newIndex = -1;
      }
    }

    historyIndexRef.current[sessionId] = newIndex;
    const command = newIndex === -1 ? '' : commandHistoryRef.current[sessionId][newIndex];
    currentLineRef.current = command;
    cursorPositionRef.current = command.length;
    redrawLine();
  }, [redrawLine]);

  // Cursor movement functions
  const moveCursorLeft = useCallback(() => {
    if (cursorPositionRef.current > 0) {
      cursorPositionRef.current--;
      terminalInstanceRef.current.write('\x1b[D');
    }
  }, []);

  const moveCursorRight = useCallback(() => {
    if (cursorPositionRef.current < currentLineRef.current.length) {
      cursorPositionRef.current++;
      terminalInstanceRef.current.write('\x1b[C');
    }
  }, []);

  const moveCursorToHome = useCallback(() => {
    const moveBack = cursorPositionRef.current;
    if (moveBack > 0) {
      cursorPositionRef.current = 0;
      terminalInstanceRef.current.write('\x1b[' + moveBack + 'D');
    }
  }, []);

  const moveCursorToEnd = useCallback(() => {
    const moveForward = currentLineRef.current.length - cursorPositionRef.current;
    if (moveForward > 0) {
      cursorPositionRef.current = currentLineRef.current.length;
      terminalInstanceRef.current.write('\x1b[' + moveForward + 'C');
    }
  }, []);

  const insertCharacterAtCursor = useCallback((char) => {
    const line = currentLineRef.current;
    const cursorPos = cursorPositionRef.current;
    
    const newLine = line.slice(0, cursorPos) + char + line.slice(cursorPos);
    currentLineRef.current = newLine;
    cursorPositionRef.current = cursorPos + 1;
    redrawLine();
  }, [redrawLine]);

  const deleteCharacterAtCursor = useCallback(() => {
    if (cursorPositionRef.current === 0) return;
    
    const line = currentLineRef.current;
    const cursorPos = cursorPositionRef.current;
    
    const newLine = line.slice(0, cursorPos - 1) + line.slice(cursorPos);
    currentLineRef.current = newLine;
    cursorPositionRef.current = cursorPos - 1;
    redrawLine();
  }, [redrawLine]);

  const deleteCharacterForward = useCallback(() => {
    const line = currentLineRef.current;
    const cursorPos = cursorPositionRef.current;
    
    if (cursorPos >= line.length) return;
    
    const newLine = line.slice(0, cursorPos) + line.slice(cursorPos + 1);
    currentLineRef.current = newLine;
    redrawLine();
  }, [redrawLine]);

  // Update refs whenever state changes
  useEffect(() => {
    selectedAgentRef.current = selectedAgent;
  }, [selectedAgent]);

  useEffect(() => {
    activeShellSessionRef.current = activeShellSession;
  }, [activeShellSession]);

  // Shell session management functions
  const startNewShell = useCallback((agentId, shell) => {
    if (!socketRef.current?.connected) return;

    const sessionId = generateSessionId(agentId, shell);
    
    // Add new session
    setShellSessions(prev => ({
      ...prev,
      [sessionId]: {
        agentId,
        shell,
        status: 'starting',
        lastActivity: new Date().toISOString()
      }
    }));

    // Initialize history for this session
    commandHistoryRef.current[sessionId] = [];
    historyIndexRef.current[sessionId] = -1;

    console.log('Starting new shell session:', sessionId, agentId, shell);
    
    socketRef.current.emit('start_shell', {
      agent_id: agentId,
      shell: shell,
      session_id: sessionId
    });

    setShowNewShellModal(false);
  }, [generateSessionId]);

  const stopShell = useCallback((sessionId) => {
    if (!socketRef.current?.connected || !sessionId) return;

    const session = shellSessions[sessionId];
    if (!session) return;

    console.log('Stopping shell session:', sessionId);
    
    socketRef.current.emit('stop_shell', {
      agent_id: session.agentId,
      session_id: sessionId
    });

    // Remove session
    setShellSessions(prev => {
      const newSessions = { ...prev };
      delete newSessions[sessionId];
      return newSessions;
    });

    // Clean up history
    delete commandHistoryRef.current[sessionId];
    delete historyIndexRef.current[sessionId];

    // Switch to another session if this was active
    if (activeShellSession === sessionId) {
      const remainingSessions = Object.keys(shellSessions).filter(id => id !== sessionId);
      if (remainingSessions.length > 0) {
        switchToShellSession(remainingSessions[0]);
      } else {
        setActiveShellSession('');
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.clear();
          terminalInstanceRef.current.writeln('\x1b[33mNo active shell sessions. Start a new shell to continue.\x1b[0m');
        }
      }
    }

    addNotification(`Shell session stopped: ${getSessionDisplayName(session)}`, 'info');
  }, [shellSessions, activeShellSession, getSessionDisplayName, addNotification]);

  const switchToShellSession = useCallback((sessionId) => {
    if (!sessionId || !shellSessions[sessionId]) return;

    setActiveShellSession(sessionId);
    
    // Update last activity
    setShellSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        lastActivity: new Date().toISOString()
      }
    }));

    // Clear terminal and show switch message
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      const session = shellSessions[sessionId];
      terminalInstanceRef.current.writeln(`\x1b[36mSwitched to shell session: ${getSessionDisplayName(session)}\x1b[0m`);
      terminalInstanceRef.current.writeln('\x1b[90mUse Ctrl+L or "clear" to clear, ↑↓ for history\x1b[0m');
      
      // Reset input state
      currentLineRef.current = '';
      cursorPositionRef.current = 0;
      currentPromptRef.current = '';
    }

    console.log('Switched to shell session:', sessionId);
  }, [shellSessions, getSessionDisplayName]);

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
      terminalInstanceRef.current = new Terminal(TERMINAL_CONFIG);
      fitAddonRef.current = new FitAddon();
      
      terminalInstanceRef.current.loadAddon(fitAddonRef.current);
      terminalInstanceRef.current.loadAddon(new WebLinksAddon());
      terminalInstanceRef.current.open(terminalRef.current);
      
      terminalInstanceRef.current.writeln('\x1b[34m=== DeployX Terminal ===\x1b[0m');
      terminalInstanceRef.current.writeln('\x1b[90mConnecting to backend...\x1b[0m');
      terminalInstanceRef.current.writeln('\x1b[36mTip: Use tabs to manage multiple shells, Ctrl+L to clear, ↑↓ for history\x1b[0m');
      
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

  // Terminal input handler - updated for session awareness
  const setupTerminalInput = useCallback(() => {
    if (!terminalInstanceRef.current) return;

    terminalInstanceRef.current.onData((data) => {
      const currentActiveSession = activeShellSessionRef.current;
      
      if (!currentActiveSession || !shellSessions[currentActiveSession]) {
        terminalInstanceRef.current.write('\x1b[31m\r\nNo active shell session. Please start a new shell.\x1b[0m\r\n');
        return;
      }

      const session = shellSessions[currentActiveSession];
      if (session.status !== 'running') {
        terminalInstanceRef.current.write('\x1b[31m\r\nShell session is not running.\x1b[0m\r\n');
        return;
      }

      if (!socketRef.current || !socketRef.current.connected) {
        terminalInstanceRef.current.write('\x1b[31m\r\nNot connected to backend server.\x1b[0m\r\n');
        return;
      }

      const charCode = data.charCodeAt(0);

      // Handle special key combinations
      if (data === '\u000C') {
        handleClearScreen();
        return;
      }

      if (data === '\u0001') {
        moveCursorToHome();
        return;
      }

      if (data === '\u0005') {
        moveCursorToEnd();
        return;
      }

      if (data === '\u001b[A') {
        navigateHistory('up');
        return;
      }
      
      if (data === '\u001b[B') {
        navigateHistory('down');
        return;
      }

      if (data === '\u001b[C') {
        moveCursorRight();
        return;
      }

      if (data === '\u001b[D') {
        moveCursorLeft();
        return;
      }

      if (data === '\u001b[H' || data === '\u001bOH') {
        moveCursorToHome();
        return;
      }

      if (data === '\u001b[F' || data === '\u001bOF') {
        moveCursorToEnd();
        return;
      }

      if (data === '\u001b[3~') {
        deleteCharacterForward();
        return;
      }

      // Handle Enter key
      if (data === '\r' || data === '\n') {
        terminalInstanceRef.current.write('\r\n');
        
        const command = currentLineRef.current.trim();
        
        if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'cls') {
          handleClearScreen();
          currentLineRef.current = '';
          cursorPositionRef.current = 0;
          return;
        }

        if (command) {
          addToHistory(command, currentActiveSession);
        }

        console.log('Sending command to session:', currentActiveSession, 'Command:', currentLineRef.current);
        socketRef.current.emit('command_input', {
          agent_id: session.agentId,
          session_id: currentActiveSession,
          command: currentLineRef.current + '\n'
        });
        currentLineRef.current = '';
        cursorPositionRef.current = 0;
        return;
      }

      if (data === '\u007f' || data === '\b') {
        deleteCharacterAtCursor();
        return;
      }

      if (data === '\u0003') {
        console.log('Ctrl+C pressed, sending interrupt signal');
        socketRef.current.emit('command_input', { 
          agent_id: session.agentId,
          session_id: currentActiveSession,
          command: '\u0003' 
        });
        currentLineRef.current = '';
        cursorPositionRef.current = 0;
        return;
      }

      if (data === '\u001A') {
        console.log('Ctrl+Z pressed, sending suspend signal');
        socketRef.current.emit('command_input', {
          agent_id: session.agentId,
          session_id: currentActiveSession,
          command: '\u001A'
        });
        currentLineRef.current = '';
        cursorPositionRef.current = 0;
        return;
      }

      if (data === '\u0004') {
        console.log('Ctrl+D pressed, sending EOF signal');
        socketRef.current.emit('command_input', { 
          agent_id: session.agentId,
          session_id: currentActiveSession,
          command: '\u0004' 
        });
        currentLineRef.current = '';
        cursorPositionRef.current = 0;
        return;
      }

      if (charCode >= 32 || data === '\t') {
        insertCharacterAtCursor(data);
      }
    });
  }, [
    shellSessions,
    handleClearScreen, 
    navigateHistory, 
    addToHistory, 
    moveCursorLeft, 
    moveCursorRight, 
    moveCursorToHome, 
    moveCursorToEnd,
    insertCharacterAtCursor,
    deleteCharacterAtCursor,
    deleteCharacterForward
  ]);

  // Socket connection (updated for session management)
  const initializeSocket = useCallback(() => {
    if (socketRef.current || connectionAttemptedRef.current) return;
    
    connectionAttemptedRef.current = true;
    setIsLoading(true);
    setConnectionError(null);

    console.log('Attempting to connect to backend...');
    
    try {
      socketRef.current = io('http://localhost:8000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
        forceNew: true,
        autoConnect: true
      });

      // Connection events
      socketRef.current.on('connect', () => {
        if (!isMountedRef.current) return;
        
        console.log('✓ Connected to backend server');
        setIsConnected(true);
        setIsLoading(false);
        setConnectionError(null);
        
        const connectMsg = addNotification('Connected to backend server', 'success');
        
        setTimeout(() => {
          if (isMountedRef.current) {
            removeNotification(connectMsg);
            addNotification('Fetching available agents...', 'info');
          }
        }, 2000);

        socketRef.current.emit('frontend_register', {});
        
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            console.log('Requesting agents list...');
            socketRef.current.emit('get_agents');
          }
        }, 200);
      });

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

      socketRef.current.on('disconnect', (reason) => {
        if (!isMountedRef.current) return;
        
        console.log('Disconnected from backend:', reason);
        setIsConnected(false);
        setConnectionError(`Disconnected: ${reason}`);
        
        // Clear all shell sessions
        setShellSessions({});
        setActiveShellSession('');
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`\x1b[31m✗ Disconnected: ${reason}\x1b[0m`);
        }

        setConnectedAgents([]);
        setAvailableShells([]);
        setSelectedAgent('');
      });

      // Agents and shells events
      socketRef.current.on('agents_list', (agents) => {
        if (!isMountedRef.current) return;
        
        console.log('Received agents list:', agents);
        
        if (Array.isArray(agents)) {
          const agentsString = agents.join(',');
          if (agentsString !== connectedAgents.join(',')) {
            setConnectedAgents(agents);
            
            if (agents.length > 0) {
              addNotification(`Found ${agents.length} agent(s): ${agents.join(', ')}`, 'success');
              
              if (!selectedAgentRef.current) {
                const firstAgent = agents[0];
                setSelectedAgent(firstAgent);
                console.log('Auto-selecting first agent:', firstAgent);
                
                socketRef.current.emit('get_shells', firstAgent);
              }
            } else {
              addNotification('No agents available. Please ensure at least one agent is running and connected.', 'warning');
            }
          }
        } else {
          console.error('Invalid agents list received:', agents);
          setConnectionError('Invalid agents list received from server');
          addNotification('Invalid agents list received from server', 'error');
        }
      });

      socketRef.current.on('shells_list', (shells) => {
        if (!isMountedRef.current) return;
        
        console.log('Received shells list:', shells);
        
        if (Array.isArray(shells)) {
          setAvailableShells(shells);
          
          if (shells.length > 0) {
            addNotification(`Found ${shells.length} shell(s): ${shells.join(', ')}`, 'success');
          } else {
            addNotification('No shells available for this agent', 'warning');
          }
        }
      });

      // Updated shell events for session management
      socketRef.current.on('shell_started', (data) => {
        if (!isMountedRef.current) return;
        
        const { shell, session_id } = data;
        console.log('Shell started successfully:', shell, 'Session:', session_id);
        
        setShellSessions(prev => ({
          ...prev,
          [session_id]: {
            ...prev[session_id],
            status: 'running'
          }
        }));

        // Switch to the new session
        setActiveShellSession(session_id);
        
        addNotification(`Shell '${shell}' started successfully`, 'success');
      });

      // Session-aware command output
      socketRef.current.on('command_output', (data) => {
        if (!isMountedRef.current || !terminalInstanceRef.current) return;
        
        const { output, session_id } = data;
        
        // Only show output if it's for the active session
        if (session_id === activeShellSessionRef.current) {
          terminalInstanceRef.current.write(output);
          
          cursorPositionRef.current = 0;
          currentLineRef.current = '';
          
          const lines = output.split('\n');
          const lastLine = lines[lines.length - 1];
          
          if (lastLine && 
              !lastLine.includes('\r') && 
              lastLine.trim() !== '' &&
              (lastLine.includes('>') || lastLine.includes('$') || lastLine.includes('#'))) {
            currentPromptRef.current = lastLine;
          }
        }
      });

      socketRef.current.on('error', (data) => {
        if (!isMountedRef.current) return;
        
        console.error('Socket error:', data);
        const errorMessage = data?.message || data || 'Unknown error';
        setConnectionError(errorMessage);
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln(`\x1b[31m✗ Error: ${errorMessage}\x1b[0m`);
        }
      });

      socketRef.current.onAny((eventName, ...args) => {
        console.log(`Socket event: ${eventName}`, args);
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setConnectionError('Failed to initialize connection: ' + error.message);
      setIsLoading(false);
    }
  }, [addNotification, removeNotification]);

  // Event handlers
  const handleAgentChange = useCallback((agentId) => {
    if (!socketRef.current?.connected) return;
    
    console.log('Agent changed to:', agentId);
    setSelectedAgent(agentId);
    setAvailableShells([]);

    if (agentId && terminalInstanceRef.current) {
      addNotification(`Switched to agent: ${agentId}`, 'info');
      socketRef.current.emit('get_shells', agentId);
    }
  }, [addNotification]);

  // Resize handler
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
      setupTerminalInput();
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
  }, [initializeTerminal, initializeSocket, setupTerminalInput, handleResize]);

  // New Shell Modal Component
  const NewShellModal = () => {
    const [modalAgent, setModalAgent] = useState(selectedAgent);
    const [modalShell, setModalShell] = useState('');
    const [modalAvailableShells, setModalAvailableShells] = useState([]);

    useEffect(() => {
      if (showNewShellModal && modalAgent) {
        // Fetch shells for the selected agent
        if (modalAgent === selectedAgent) {
          setModalAvailableShells(availableShells);
        } else {
          socketRef.current?.emit('get_shells', modalAgent);
        }
      }
    }, [showNewShellModal, modalAgent]);

    useEffect(() => {
      // Listen for shells list for modal
      const handleModalShellsList = (shells) => {
        if (showNewShellModal) {
          setModalAvailableShells(shells);
        }
      };

      socketRef.current?.on('shells_list', handleModalShellsList);
      
      return () => {
        socketRef.current?.off('shells_list', handleModalShellsList);
      };
    }, [showNewShellModal]);

    const handleStart = () => {
      if (modalAgent && modalShell) {
        startNewShell(modalAgent, modalShell);
      }
    };

    if (!showNewShellModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Start New Shell</h3>
            <button 
              className="modal-close" 
              onClick={() => setShowNewShellModal(false)}
            >
              ×
            </button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label>Agent:</label>
              <select
                value={modalAgent}
                onChange={(e) => setModalAgent(e.target.value)}
                disabled={connectedAgents.length === 0}
              >
                <option value="">Select Agent</option>
                {connectedAgents.map(agent => (
                  <option key={agent} value={agent}>{agent}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Shell:</label>
              <select
                value={modalShell}
                onChange={(e) => setModalShell(e.target.value)}
                disabled={modalAvailableShells.length === 0}
              >
                <option value="">Select Shell</option>
                {modalAvailableShells.map(shell => (
                  <option key={shell} value={shell}>{shell}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="modal-footer">
            <button 
              onClick={() => setShowNewShellModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={handleStart}
              disabled={!modalAgent || !modalShell}
              className="btn-primary"
            >
              Start Shell
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="terminal-container">
      <div className="notification-container">
        {notifications.map(({ id, message, type, duration }) => (
          <Notification
            key={id}
            message={message}
            type={type}
            duration={duration}
            onClose={() => removeNotification(id)}
          />
        ))}
      </div>
      
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
            <button
              onClick={() => setShowNewShellModal(true)}
              disabled={!isConnected || connectedAgents.length === 0}
              className="btn-primary"
            >
              + New Shell
            </button>
          </div>
          
          <div className="status-indicator">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            <span>
              {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {Object.keys(shellSessions).length > 0 && (
              <span className="shell-status">• {Object.keys(shellSessions).length} Shell(s)</span>
            )}
          </div>
        </div>
        
        {connectionError && (
          <div className="error-message">
            <span>⚠ {connectionError}</span>
          </div>
        )}
      </div>

      {/* Shell Tabs */}
      {Object.keys(shellSessions).length > 0 && (
        <div className="shell-tabs">
          {Object.entries(shellSessions).map(([sessionId, session]) => (
            <div
              key={sessionId}
              className={`shell-tab ${activeShellSession === sessionId ? 'active' : ''}`}
              onClick={() => switchToShellSession(sessionId)}
            >
              <span className="tab-title">
                {getSessionDisplayName(session)}
              </span>
              <span className={`tab-status ${session.status}`}>
                {session.status === 'running' ? '●' : '○'}
              </span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  stopShell(sessionId);
                }}
                title="Stop shell"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="terminal-wrapper">
        <div ref={terminalRef} className="terminal" />
      </div>

      <NewShellModal />
    </div>
  );
};

export default TerminalComponent;
