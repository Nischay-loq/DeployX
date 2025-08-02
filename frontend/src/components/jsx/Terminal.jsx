import React, { useState, useEffect, useRef } from 'react';
import useWebSocket from 'react-use-websocket';

const Terminal = () => {
  const agentId = 'agent_12345';
  const [lines, setLines] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [prompt, setPrompt] = useState('C:\\>');
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [waitingForCommand, setWaitingForCommand] = useState(false);
  const [isInteractiveMode, setIsInteractiveMode] = useState(false);

  const terminalRef = useRef(null);
  const isInitialPromptReceived = useRef(false);

  const parseOutput = (output) => {
    if (output.includes('\x1b[H\x1b[2J\x1b[3J')) {
        setLines([]);
        return '';
    }
    
    return output
        .replace(/\x1b\[[0-9;]*[mGKH]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    };

  const { lastMessage, sendJsonMessage } = useWebSocket(
    `ws://127.0.0.1:8000/ws/ui/${agentId}`,
    {
      onOpen: () => {
        setLines(['Microsoft Windows [Version 10.0.19045.3570]', '(c) Microsoft Corporation. All rights reserved.', '']);
        sendJsonMessage({ type: 'get_prompt' });
      },
      onClose: () => {
        setIsReady(false);
        setLines(prev => [...prev, '', 'Connection to agent lost.']);
        setWaitingForCommand(false);
        setIsInteractiveMode(false);
      },
      onMessage: (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
            const newOutput = parseOutput(data.payload);
            
            if (!newOutput.trim()) return;

            setLines(prevLines => {
            let updatedLines = [...prevLines];

            // Handle initial prompt detection
            if (!isInitialPromptReceived.current) {
                const trimmedOutput = newOutput.trim();
                if (trimmedOutput && (trimmedOutput.includes(':\\') || trimmedOutput.match(/^[A-Z]:/))) {
                const newPrompt = trimmedOutput.endsWith('>') ? trimmedOutput : trimmedOutput + '>';
                setPrompt(newPrompt);
                isInitialPromptReceived.current = true;
                setIsReady(true);
                setWaitingForCommand(true);
                setIsInteractiveMode(false);
                return [...updatedLines, newPrompt];
                }
            } else {
                // Handle command output
                const outputLines = newOutput.split('\n');
                
                // Filter out empty lines only at the end
                while (outputLines.length > 0 && outputLines[outputLines.length - 1].trim() === '') {
                outputLines.pop();
                }
                
                if (outputLines.length === 0) return updatedLines;
                
                const lastLine = outputLines[outputLines.length - 1];
                const isStandardPrompt = lastLine && (lastLine.includes(':\\') && lastLine.endsWith('>'));
                
                // Check for interactive prompts (ends with : or other prompt indicators)
                const isInteractivePrompt = lastLine && 
                (lastLine.endsWith(':') || 
                lastLine.includes('Enter') || 
                lastLine.includes('Press') ||
                lastLine.includes('Type') ||
                lastLine.match(/\w+\s*[:?][\s]*$/));
                
                if (isStandardPrompt) {
                // Standard command prompt
                setPrompt(lastLine);
                setWaitingForCommand(true);
                setIsInteractiveMode(false);
                
                // Add all lines except the last one (which is the prompt)
                const linesToAdd = outputLines.slice(0, -1);
                if (linesToAdd.length > 0) {
                    updatedLines = [...updatedLines, ...linesToAdd];
                }
                updatedLines = [...updatedLines, lastLine];
                } else if (isInteractivePrompt) {
                // Interactive prompt waiting for input
                setWaitingForCommand(true);
                setIsInteractiveMode(true);
                
                // Add all output lines
                updatedLines = [...updatedLines, ...outputLines];
                } else {
                // Regular output, check if we should wait for more
                updatedLines = [...updatedLines, ...outputLines];
                
                // If the output doesn't end with a clear prompt, assume we might get more
                setWaitingForCommand(false);
                setIsInteractiveMode(false);
                
                // Set a timeout to re-enable command input if no more output comes
                setTimeout(() => {
                    setWaitingForCommand(true);
                    setIsInteractiveMode(true);
                }, 500);
                }
            }

            return updatedLines;
            });
        }
        },
    }
  );

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    // Reset cursor position when command changes
    setCursorPosition(currentCommand.length);
  }, [currentCommand]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isReady || !waitingForCommand) return;

      if (e.key === 'Enter') {
        const commandToSend = currentCommand.trim();
        
        // Update the display immediately
        setLines(prev => {
            const newLines = [...prev];
            if (isInteractiveMode) {
            // In interactive mode, show what the user typed
            const lastLine = newLines[newLines.length - 1] || '';
            // If the last line ends with a prompt character, append the input
            if (lastLine.endsWith(':') || lastLine.endsWith('? ')) {
                newLines[newLines.length - 1] = lastLine + currentCommand;
            } else {
                newLines.push(currentCommand || '');
            }
            } else {
            // Replace the last prompt line with prompt + command
            if (newLines.length > 0) {
                newLines[newLines.length - 1] = prompt + currentCommand;
            }
            }
            return newLines;
        });

        if (commandToSend !== '' && !isInteractiveMode) {
          // Add to command history only for non-interactive commands
          setCommandHistory(prev => {
            const newHistory = [commandToSend, ...prev.filter(cmd => cmd !== commandToSend)];
            return newHistory.slice(0, 50);
          });
        }
        
        sendJsonMessage({ type: 'command', payload: currentCommand });
        
        setCurrentCommand('');
        setCursorPosition(0);
        setHistoryIndex(-1);
        setWaitingForCommand(false);
        e.preventDefault();
        
      } else if (e.key === 'ArrowUp') {
        if (!isInteractiveMode && commandHistory.length > 0) {
          const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
          setHistoryIndex(newIndex);
          const newCommand = commandHistory[newIndex] || '';
          setCurrentCommand(newCommand);
          setCursorPosition(newCommand.length);
        }
        e.preventDefault();
        
      } else if (e.key === 'ArrowDown') {
        if (!isInteractiveMode) {
          if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            const newCommand = commandHistory[newIndex] || '';
            setCurrentCommand(newCommand);
            setCursorPosition(newCommand.length);
          } else if (historyIndex === 0) {
            setHistoryIndex(-1);
            setCurrentCommand('');
            setCursorPosition(0);
          }
        }
        e.preventDefault();
        
      } else if (e.key === 'ArrowLeft') {
        setCursorPosition(prev => Math.max(0, prev - 1));
        e.preventDefault();
        
      } else if (e.key === 'ArrowRight') {
        setCursorPosition(prev => Math.min(currentCommand.length, prev + 1));
        e.preventDefault();
        
      } else if (e.key === 'Home') {
        setCursorPosition(0);
        e.preventDefault();
        
      } else if (e.key === 'End') {
        setCursorPosition(currentCommand.length);
        e.preventDefault();
        
      } else if (e.key === 'Backspace') {
        if (cursorPosition > 0) {
          const newCommand = currentCommand.slice(0, cursorPosition - 1) + currentCommand.slice(cursorPosition);
          setCurrentCommand(newCommand);
          setCursorPosition(prev => prev - 1);
        }
        e.preventDefault();
        
      } else if (e.key === 'Delete') {
        if (cursorPosition < currentCommand.length) {
          const newCommand = currentCommand.slice(0, cursorPosition) + currentCommand.slice(cursorPosition + 1);
          setCurrentCommand(newCommand);
        }
        e.preventDefault();
        
      } else if (e.key === 'Escape') {
        setCurrentCommand('');
        setCursorPosition(0);
        setHistoryIndex(-1);
        e.preventDefault();
        
      } else if (e.ctrlKey && e.key === 'c') {
        // Handle Ctrl+C
        sendJsonMessage({ type: 'interrupt' });
        setLines(prev => [...prev, '^C']);
        setCurrentCommand('');
        setCursorPosition(0);
        setWaitingForCommand(false);
        e.preventDefault();
        
      } else if (e.key.length === 1) {
        // Regular character input
        const newCommand = currentCommand.slice(0, cursorPosition) + e.key + currentCommand.slice(cursorPosition);
        setCurrentCommand(newCommand);
        setCursorPosition(prev => prev + 1);
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isReady, waitingForCommand, currentCommand, cursorPosition, commandHistory, historyIndex, prompt, isInteractiveMode]);

  const renderLines = () => {
    return lines.map((line, index) => {
      // Check if this is the last line and we're waiting for command
      const isCurrentPrompt = index === lines.length - 1 && waitingForCommand;
      
      return (
        <div key={index} className="whitespace-pre-wrap break-all">
          {isCurrentPrompt && !isInteractiveMode ? (
            <>
              {line}
              {currentCommand.slice(0, cursorPosition)}
              <span 
                className="bg-white w-2 h-4 inline-block"
                style={{ animation: 'blink 1s infinite' }}
              />
              {currentCommand.slice(cursorPosition)}
            </>
          ) : isCurrentPrompt && isInteractiveMode ? (
            <>
              {currentCommand.slice(0, cursorPosition)}
              <span 
                className="bg-white w-2 h-4 inline-block"
                style={{ animation: 'blink 1s infinite' }}
              />
              {currentCommand.slice(cursorPosition)}
            </>
          ) : (
            line
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black overflow-hidden">
        <div 
        className="bg-black text-white font-mono text-sm leading-tight select-text w-full max-w-5xl"
        style={{
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
            padding: '8px 12px',
            maxHeight: '80vh', // allow scrolling inside
            width: '100%',
            border: '1px solid #333',
            borderRadius: '0',
            display: 'flex',
            flexDirection: 'column',
        }}
        tabIndex={0}
        >
        {/* Terminal Title Bar */}
        <div className="bg-gray-800 text-gray-300 px-3 py-1 text-xs border-b border-gray-600 -mx-3 -mt-2 mb-2 flex items-center">
            <span className="flex-1">Command Prompt</span>
            <div className="flex space-x-1">
            <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
            <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
            </div>
        </div>

        {/* Terminal Scrollable Output */}
        <div 
        className="flex-1 overflow-y-auto pr-1 custom-scroll"
        ref={terminalRef}
        >
            {!isReady && <div>Connecting...</div>}
            {renderLines()}
        </div>
        </div>
    </div>
    );
};

// Add CSS animation
const style = document.createElement('style');
style.innerHTML = `
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;
document.head.appendChild(style);

export default Terminal;