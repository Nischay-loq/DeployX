import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import io from 'socket.io-client';
import "@xterm/xterm/css/xterm.css";
import './css/Terminal.css';
import Notification from './jsx/Notification';

const TerminalComponent = ({ height = '70vh' }) => {
  const terminalRef = useRef(null);
  const terminalInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);
  const currentLineRef = useRef('');
  const cursorPositionRef = useRef(0);
  const commandHistoryRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const currentPromptRef = useRef('');
  const currentPathRef = useRef('');
  const suppressPromptOnceRef = useRef(false);
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
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Notification handler
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    // Different durations for different notification types
    const durations = {
      error: 8000,    // Errors stay longer
      warning: 6000,  // Warnings stay a bit longer
      success: 3000,  // Success messages are shorter
      info: 2000      // Info messages are shortest
    };

    // Remove any existing notifications with the same message to prevent duplicates
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

  // Update refs whenever state changes
  useEffect(() => {
    selectedAgentRef.current = selectedAgent;
    console.log('selectedAgent updated to:', selectedAgent);
  }, [selectedAgent]);

  useEffect(() => {
    shellStartedRef.current = shellStarted;
    console.log('shellStarted updated to:', shellStarted);
  }, [shellStarted]);

  // no session handling in legacy component

  // Terminal configuration
  const TERMINAL_CONFIG = {
    cursorBlink: true,
    cursorStyle: 'block',
    fontSize: 15,
    lineHeight: 1.2,
    fontFamily: 'Consolas, "Cascadia Code", "Source Code Pro", "Courier New", monospace',
    fontWeight: 500,
    letterSpacing: 0,
<<<<<<< HEAD
    scrollback: 2000,
=======
    cols: 100,
    rows: 30,
    scrollback: 1000,
>>>>>>> parth
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
    }
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
      
      // Ensure proper sizing (initial fit, then a nudge after layout settles)
      const doFit = () => {
        try {
          if (fitAddonRef.current && terminalInstanceRef.current) {
            fitAddonRef.current.fit();
            terminalInstanceRef.current.scrollToBottom();
          }
        } catch (e) { /* noop */ }
      };
      doFit();
      setTimeout(doFit, 100);

      console.log('Terminal initialized successfully');
      return terminalInstanceRef.current;
    } catch (error) {
      console.error('Failed to initialize terminal:', error);
      setConnectionError('Failed to initialize terminal: ' + error.message);
    }
  }, []);

  // Helpers for local line editing and history
  const handleClearScreen = useCallback((writePrompt = true) => {
    if (!terminalInstanceRef.current) return;
    terminalInstanceRef.current.clear();
    currentLineRef.current = '';
    cursorPositionRef.current = 0;
    
    if (writePrompt) {
      // Avoid double prompt if backend echoes prompt right after
      suppressPromptOnceRef.current = true;
      // Show Windows-style: <path> > if known; else full prompt; else just "> "
      const prompt = currentPathRef.current
        ? `${currentPathRef.current}> `
        : (currentPromptRef.current || '> ');
      terminalInstanceRef.current.write(prompt);
    } else {
      // When not writing prompt immediately, still set suppression flag
      suppressPromptOnceRef.current = true;
    }
  }, []);

  // Try to extract working directory from common prompts
  const extractPathFromPrompt = useCallback((text) => {
    const t = (text || '').trimEnd();
    // CMD: C:\path>
    const cmdMatch = t.match(/^([A-Za-z]:\\[^>]*?)>$/);
    if (cmdMatch) return cmdMatch[1];
    // PowerShell: PS C:\path>
    const psMatch = t.match(/^PS\s+(.+?)>$/);
    if (psMatch) return psMatch[1];
    return '';
  }, []);

  const moveCursorLeft = useCallback(() => {
    if (cursorPositionRef.current > 0 && terminalInstanceRef.current) {
      cursorPositionRef.current -= 1;
      terminalInstanceRef.current.write('\x1b[D');
    }
  }, []);

  const moveCursorRight = useCallback(() => {
    const len = currentLineRef.current.length;
    if (cursorPositionRef.current < len && terminalInstanceRef.current) {
      cursorPositionRef.current += 1;
      terminalInstanceRef.current.write('\x1b[C');
    }
  }, []);

  const insertCharacterAtCursor = useCallback((ch) => {
    const line = currentLineRef.current;
    const pos = cursorPositionRef.current;
    const before = line.slice(0, pos);
    const after = line.slice(pos);
    currentLineRef.current = before + ch + after;
    cursorPositionRef.current = pos + ch.length;
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.write(ch);
      if (after) {
        terminalInstanceRef.current.write(after);
        terminalInstanceRef.current.write(`\x1b[${after.length}D`);
      }
    }
  }, []);

  const deleteCharacterBackward = useCallback(() => {
    if (cursorPositionRef.current === 0 || !terminalInstanceRef.current) return;
    const line = currentLineRef.current;
    const pos = cursorPositionRef.current;
    const before = line.slice(0, pos - 1);
    const after = line.slice(pos);
    currentLineRef.current = before + after;
    cursorPositionRef.current = pos - 1;
    // Move left, overwrite remainder and trailing char with space, move back
    terminalInstanceRef.current.write('\x1b[D');
    if (after) terminalInstanceRef.current.write(after);
    terminalInstanceRef.current.write(' ');
    const moveBack = (after ? after.length : 0) + 1;
    terminalInstanceRef.current.write(`\x1b[${moveBack}D`);
  }, []);

  const deleteCharacterForward = useCallback(() => {
    const line = currentLineRef.current;
    const pos = cursorPositionRef.current;
    if (!terminalInstanceRef.current || pos >= line.length) return;
    const before = line.slice(0, pos);
    const after = line.slice(pos + 1);
    currentLineRef.current = before + after;
    if (after) terminalInstanceRef.current.write(after);
    terminalInstanceRef.current.write(' ');
    const moveBack = (after ? after.length : 0) + 1;
    terminalInstanceRef.current.write(`\x1b[${moveBack}D`);
  }, []);

  const showHistoryEntry = useCallback((entry) => {
    if (!terminalInstanceRef.current) return;
    // Erase current input (without touching the prompt): backspace over current input
    const toErase = currentLineRef.current.length - 0;
    if (toErase > 0) {
      terminalInstanceRef.current.write('\b \b'.repeat(toErase));
    }
    currentLineRef.current = entry || '';
    cursorPositionRef.current = currentLineRef.current.length;
    if (entry) terminalInstanceRef.current.write(entry);
  }, []);

  const navigateHistory = useCallback((direction) => {
    const history = commandHistoryRef.current;
    if (!history || history.length === 0) return;
    let idx = historyIndexRef.current;
    if (direction === 'up') {
      if (idx === -1) idx = history.length - 1; else if (idx > 0) idx -= 1;
    } else if (direction === 'down') {
      if (idx === -1) return; // already at live line
      if (idx < history.length - 1) idx += 1; else idx = -1;
    }
    historyIndexRef.current = idx;
    const cmd = idx === -1 ? '' : history[idx];
    showHistoryEntry(cmd);
  }, [showHistoryEntry]);

  const addToHistory = useCallback((cmd) => {
    const trimmed = (cmd || '').trim();
    if (!trimmed) return;
    const history = commandHistoryRef.current;
    if (history.length === 0 || history[history.length - 1] !== trimmed) {
      history.push(trimmed);
      if (history.length > 100) history.shift();
    }
    historyIndexRef.current = -1;
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
        console.log('Blocking input: Missing agent or shell not started');
        terminalInstanceRef.current.write('\x1b[31m\r\nPlease select an agent and start a shell first.\x1b[0m\r\n');
        return;
      }

      if (!socketRef.current || !socketRef.current.connected) {
        terminalInstanceRef.current.write('\x1b[31m\r\nNot connected to backend server.\x1b[0m\r\n');
        return;
      }

      // Clear screen (Ctrl+L)
      if (data === '\u000C') { // Ctrl+L
        // For Ctrl+L, send the clear command to backend and let it handle the prompt
        socketRef.current.emit('command_input', {
          agent_id: currentSelectedAgent,
          command: 'cls\n'  // Send cls command to backend
        });
        // Clear the local screen without writing prompt
        terminalInstanceRef.current.clear();
        currentLineRef.current = '';
        cursorPositionRef.current = 0;
        return;
      }

      // Handle Enter key
      if (data === '\r' || data === '\n') {
        terminalInstanceRef.current.write('\r\n');
        const cmd = currentLineRef.current;
        const trimmed = cmd.trim().toLowerCase();
        if (trimmed === 'clear' || trimmed === 'cls') {
          handleClearScreen(true); // Write prompt immediately for local clear
          currentLineRef.current = '';
          cursorPositionRef.current = 0;
          return;
        }
        addToHistory(cmd);
        console.log('Sending command to agent:', currentSelectedAgent, 'Command:', cmd);
        socketRef.current.emit('command_input', {
          agent_id: currentSelectedAgent,
          command: cmd + '\n'
        });
        currentLineRef.current = '';
        cursorPositionRef.current = 0;
        return;
      }

      // Handle Backspace
      if (data === '\u007f' || data === '\b') {
        deleteCharacterBackward();
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

      // Handle arrows and delete/home/end
      if (data === '\u001b[A') { // Up
        navigateHistory('up');
        return;
      }
      if (data === '\u001b[B') { // Down
        navigateHistory('down');
        return;
      }
      if (data === '\u001b[D') { // Left
        moveCursorLeft();
        return;
      }
      if (data === '\u001b[C') { // Right
        moveCursorRight();
        return;
      }
      if (data === '\u001b[3~') { // Delete (forward)
        deleteCharacterForward();
        return;
      }

      // Handle printable characters
      const charCode = data.charCodeAt(0);
      if (charCode >= 32 || data === '\t') {
        insertCharacterAtCursor(data);
      }
    });
  }, [
    handleClearScreen,
    addToHistory,
    navigateHistory,
    moveCursorLeft,
    moveCursorRight,
    insertCharacterAtCursor,
    deleteCharacterBackward,
    deleteCharacterForward
  ]); // uses refs for runtime values

  // Socket connection with better error handling
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

      // Connection successful
      socketRef.current.on('connect', () => {
        if (!isMountedRef.current) return;
        
        console.log('✓ Connected to backend server');
        setIsConnected(true);
        setIsLoading(false);
        setConnectionError(null);
        
        const connectMsg = addNotification('Connected to backend server', 'success');
        
        // Wait for the connection message to be shown before showing the next one
        setTimeout(() => {
          if (isMountedRef.current) {
            removeNotification(connectMsg);
            addNotification('Fetching available agents...', 'info');
          }
        }, 2000);

        // Register frontend and get agents
        socketRef.current.emit('frontend_register', {});
        
        // Reduce the delay for getting agents
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            console.log('Requesting agents list...');
            socketRef.current.emit('get_agents');
          }
        }, 200);
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
          // Check if the agents list has actually changed
          const agentsString = agents.join(',');
          if (agentsString !== connectedAgents.join(',')) {
            setConnectedAgents(agents);
            
            if (agents.length > 0) {
              // Only show notification if it's a new agent list
              addNotification(`Found ${agents.length} agent(s): ${agents.join(', ')}`, 'success');
              
              // Auto-select first agent only if no agent is selected
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

      // Shells list received
      socketRef.current.on('shells_list', (shells) => {
        if (!isMountedRef.current) return;
        
        console.log('Received shells list:', shells);
        
        if (Array.isArray(shells)) {
          setAvailableShells(shells);
          
          if (shells.length > 0) {
            addNotification(`Found ${shells.length} shell(s): ${shells.join(', ')}`, 'success');
            
            // Auto-select default shell
            if (!selectedShell) {
              const defaultShell = shells.includes('cmd') ? 'cmd' : 
                               shells.includes('bash') ? 'bash' : shells[0];
              setSelectedShell(defaultShell);
            }
          } else {
            addNotification('No shells available for this agent', 'warning');
          }
        }
      });

      // Command output
      socketRef.current.on('command_output', (data) => {
        if (!isMountedRef.current || !terminalInstanceRef.current) return;
        let text = typeof data === 'string' ? data : '';
        // Try to detect and remember the prompt from output (for clear/cls)
        try {
          if (text) {
            const lines = text.split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              const raw = lines[i].replace(/\r/g, '');
              const s = raw.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, ''); // strip basic ANSI incl. private
              const t = s.trimEnd();
              // Common prompts: CMD (C:\path>), PowerShell (PS C:\path>), bash/zsh ($,#)
              if (/^[A-Za-z]:\\.*>$/.test(t) || /^PS\s+.*>$/.test(t) || /[#$]\s*$/.test(t)) {
                currentPromptRef.current = t;
                const p = extractPathFromPrompt(t);
                if (p) currentPathRef.current = p;
                break;
              }
            }
            // If we just cleared locally and backend sends only a prompt, suppress it once
            if (suppressPromptOnceRef.current) {
              const linesRaw = text.split('\n');
              // Find last non-empty (after strip) line
              let j = linesRaw.length - 1;
              const stripLine = (ln) => ln.replace(/\r/g, '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').trimEnd();
              // Skip trailing empties
              while (j >= 0 && stripLine(linesRaw[j]).trim() === '') j--;
              if (j >= 0) {
                const lastStripped = stripLine(linesRaw[j]);
                if (/^(?:[A-Za-z]:\\.*>|PS\s+.*>|[#$])\s*$/.test(lastStripped)) {
                  // Remove the trailing prompt line
                  const withoutPrompt = linesRaw.slice(0, j).join('\n');
                  text = withoutPrompt;
                }
              }
              suppressPromptOnceRef.current = false;
            }
          }
        } catch (_) {}
        // Write output (possibly filtered)
        if (text) {
          terminalInstanceRef.current.write(text);
          // Keep viewport sized and scrolled during continuous output
          try {
            if (fitAddonRef.current) fitAddonRef.current.fit();
            terminalInstanceRef.current.scrollToBottom();
          } catch (_) {}
        }
      });

      // Shell started - this is crucial
      socketRef.current.on('shell_started', (shell) => {
        if (!isMountedRef.current) return;
        
        console.log('Shell started successfully:', shell);
        setShellStarted(true);
        setIsStarting(false);
        addNotification(`Shell '${shell}' started successfully on ${selectedAgentRef.current}`, 'success');
      });

      socketRef.current.on('shell_stopped', () => {
        if (!isMountedRef.current) return;
        console.log('Shell stopped');
        setShellStarted(false);
        setIsStopping(false);
        addNotification(`Shell stopped on ${selectedAgentRef.current}`, 'success');
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.writeln('\x1b[33mShell stopped.\x1b[0m');
        }
      });

      // Clear terminal
      socketRef.current.on('clear_terminal', () => {
        if (!isMountedRef.current || !terminalInstanceRef.current) return;
        terminalInstanceRef.current.clear();
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
    setIsStarting(false);
    setIsStopping(false);

    if (agentId && terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln(`\x1b[36mSwitched to agent: ${agentId}\x1b[0m`);
      terminalInstanceRef.current.writeln('\x1b[33mFetching available shells...\x1b[0m');
      
      socketRef.current.emit('get_shells', agentId);
    }
  }, []);

  const handleStartShell = useCallback(() => {
    if (!selectedAgent || !selectedShell || shellStarted || !socketRef.current?.connected || isStarting) {
      console.log('Cannot start shell:', { selectedAgent, selectedShell, shellStarted, connected: socketRef.current?.connected });
      return;
    }

    console.log('Starting shell:', selectedShell, 'on agent:', selectedAgent);
    setShellStarted(false);
    setIsStarting(true);

    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.clear();
      terminalInstanceRef.current.writeln(`\x1b[36mStarting ${selectedShell} on ${selectedAgent}...\x1b[0m`);
    }

    socketRef.current.emit('start_shell', {
      agent_id: selectedAgent,
      shell: selectedShell
    });
  }, [selectedAgent, selectedShell, shellStarted, isStarting]);

  const handleStopShell = useCallback(() => {
    if (!selectedAgent || !shellStarted || !socketRef.current?.connected || isStopping) {
      console.log('Cannot stop shell:', { selectedAgent, shellStarted, connected: socketRef.current?.connected });
      return;
    }
    setIsStopping(true);
    addNotification(`Stopping shell on ${selectedAgent}...`, 'info');
    socketRef.current.emit('stop_shell', { agent_id: selectedAgent });
  }, [selectedAgent, shellStarted, isStopping, addNotification]);

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
    <div className="terminal-container" style={{ height }}>
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
            <label>Shell:</label>
            <select
              value={selectedShell}
              onChange={(e) => {
                const newShell = e.target.value;
                if (shellStarted && newShell && newShell !== selectedShell) {
                  handleStopShell();
                }
                setSelectedShell(newShell);
              }}
              disabled={availableShells.length === 0 || !isConnected}
            >
              <option value="">Select Shell ({availableShells.length} available)</option>
              {availableShells.map(shell => (
                <option key={shell} value={shell}>{shell}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            {shellStarted ? (
              <button
                onClick={handleStopShell}
                disabled={!isConnected || isStopping}
                className="stop-shell-btn"
              >
                {isStopping ? 'Stopping...' : 'Stop Shell'}
              </button>
            ) : (
              <button
                onClick={handleStartShell}
                disabled={!selectedAgent || !selectedShell || !isConnected || isStarting}
                className="start-shell-btn"
              >
                {isStarting ? 'Starting...' : 'Start Shell'}
              </button>
            )}
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