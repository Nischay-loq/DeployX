import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const [selectedShell, setSelectedShell] = useState('bash'); 
    const [availableShells, setAvailableShells] = useState(['bash', 'cmd', 'powershell']); // default
    const terminalRef = useRef(null);
    const hiddenInputRef = useRef(null);

    // Function to scroll to the bottom of the terminal output
    const scrollToBottom = useCallback(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        // Initialize Socket.IO connection
        // Replace 'http://localhost:8000' with your actual backend URL
        const newSocket = io('http://localhost:8000', {
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true
        });

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('Connected to server');
            setIsConnected(true);
            // Request initial shell and path info from the server
            newSocket.emit('request_initial_info');
        });

        newSocket.on('available_shells', data => {
            if (data.shells) setAvailableShells(data.shells);
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setOutput(prev => [...prev, { type: 'error', content: `Connection error: ${error.message}` }]);
        });

        // Terminal message handler
        newSocket.on('terminal_message', (message) => {
            if (message.type === 'output') {
                setOutput(prev => [...prev, { type: 'output', content: message.data }]);
                // Check if output suggests waiting for input (e.g., password prompts)
                const lowerContent = message.data.toLowerCase();
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
            } else if (message.type === 'shell_type') {
                setSelectedShell(message.data);
            } else if (message.type === 'available_shells') {
                setAvailableShells(message.data);
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
        // Auto-scroll to bottom when new output is added or input changes
        scrollToBottom();
    }, [output, currentInput, scrollToBottom]);

    useEffect(() => {
        // Update cursor position when input changes
        setCursorPosition(currentInput.length);
    }, [currentInput]);

    // Handle window resize for terminal programs like vim/htop
    useEffect(() => {
        const handleResize = () => {
            if (socket && socket.connected && terminalRef.current) {
                const { clientWidth, clientHeight } = terminalRef.current;
                // You might need to adjust these calculations based on font size and padding
                const cols = Math.floor(clientWidth / 8); // Approx character width
                const rows = Math.floor(clientHeight / 16); // Approx line height
                socket.emit('terminal_resize', { cols, rows });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [socket]);

    const sendCommand = (command) => {
        if (socket && socket.connected) {
            // Add the command to output before sending
            const prompt = getPrompt(selectedShell, currentPath, waitingForInput);
            setOutput(prev => [...prev, {
                type: 'input',
                content: `${prompt}${command}`
            }]);

            // Send command via Socket.IO
            socket.emit('terminal_command', {
                type: waitingForInput ? 'input' : 'command',
                data: command
            });

            if (!waitingForInput && command.trim() !== '') {
                // Add to command history, ensuring no duplicates and limited size
                setCommandHistory(prev => {
                    const newHistory = [command, ...prev.filter(cmd => cmd !== command)];
                    return newHistory.slice(0, 100); // Keep last 100 commands
                });
                setHistoryIndex(-1); // Reset history index after new command
            }

            setWaitingForInput(false); // Assume input is no longer needed after sending
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
                    data: '' // Ctrl+C signal
                });
                setOutput(prev => [...prev, { type: 'output', content: '^C' }]);
            }
            setCurrentInput('');
            setWaitingForInput(false);
        } else if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            setOutput([]); // Clear frontend output
            // Optionally, send a clear screen command to the backend if needed
            // socket.emit('terminal_command', { type: 'command', data: 'clear' }); // For bash/zsh
            // socket.emit('terminal_command', { type: 'command', data: 'cls' }); // For cmd/powershell
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
        } else if (e.ctrlKey && e.key === 'a') { // Ctrl+A: move cursor to start
            e.preventDefault();
            setCursorPosition(0);
        } else if (e.ctrlKey && e.key === 'e') { // Ctrl+E: move cursor to end
            e.preventDefault();
            setCursorPosition(currentInput.length);
        } else if (e.key.length === 1 && !e.metaKey && !e.altKey) { // Regular character input
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
        // Shorten path if it's too long for display
        if (path.length > 50) {
            const parts = path.split(/[\\/]/); // Split by / or \
            if (parts.length > 3) {
                // Show last two parts of the path
                return `...${parts.slice(-2).join('/')}`;
            }
        }
        return path;
    };

    const getPrompt = (shell, path, isWaitingForInput) => {
        if (isWaitingForInput) {
            return ''; // No prompt when waiting for specific input
        }
        const formattedPath = formatPath(path);
        switch (shell) {
            case 'cmd':
                return `${formattedPath}>`;
            case 'powershell':
                return `PS ${formattedPath}>`;
            case 'bash':
            default:
                // Assuming user@host for bash, or just path
                const userHost = `user@host`; // Replace with actual user/host from backend if available
                return `${userHost}:${formattedPath}$`;
        }
    };

    const handleShellChange = (shellType) => {
        if (socket && socket.connected) {
            setSelectedShell(shellType);
            setOutput(prev => [...prev, { type: 'system', content: `Switching to ${shellType} terminal...` }]);
            socket.emit('switch_shell', { shell: shellType });
            setCurrentInput(''); // Clear current input on shell change
            setWaitingForInput(false);
            setCommandHistory([]); // Clear history for new shell
            setHistoryIndex(-1);
            setCursorPosition(0);
        }
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
        const prompt = getPrompt(selectedShell, currentPath, waitingForInput);
        const beforeCursor = currentInput.slice(0, cursorPosition);
        const atCursor = currentInput.slice(cursorPosition, cursorPosition + 1) || ' '; // Ensure cursor is visible
        const afterCursor = currentInput.slice(cursorPosition + 1);

        return (
            <div className="current-input-line">
                <span className="prompt">{prompt} </span> {/* Added space for visual separation */}
                <span className="input-text">
                    <span className="before-cursor">{beforeCursor}</span>
                    <span className="cursor">{atCursor}</span>
                    <span className="after-cursor">{afterCursor}</span>
                </span>
            </div>
        );
    };

    return (
        <div className={`terminal-container ${selectedShell}-theme`}>
            <div className="terminal-header">
                <div className="terminal-buttons">
                    <div className="button close"></div>
                    <div className="button minimize"></div>
                    <div className="button maximize"></div>
                </div>
                <div className="terminal-title">
                    Remote Terminal - {isConnected ? `Connected (${selectedShell})` : 'Disconnected'}
                </div>
                <div className="shell-selector">
                    <label htmlFor="shell-select">Shell:</label>
                    <select
                        id="shell-select"
                        value={selectedShell}
                        onChange={(e) => handleShellChange(e.target.value)}
                        disabled={!isConnected}
                        className="rounded-md px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {availableShells.map(shell => (
                            <option key={shell} value={shell}>
                                {shell.charAt(0).toUpperCase() + shell.slice(1)}
                            </option>
                        ))}
                    </select>
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
                    value="" // Value is empty as input is managed by state and key presses
                    onChange={() => { }} // No-op, as value is controlled
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
