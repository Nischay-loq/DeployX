import subprocess
import threading
import queue
import os
import sys
import time
import signal
from typing import AsyncGenerator
import asyncio
import re

class RealCMDExecutor:
    def __init__(self):
        self.process = None
        self.output_queue = queue.Queue()
        self.current_path = os.getcwd()
        self.running = False
        self.output_thread = None
        self.initialize_cmd()
    
    def initialize_cmd(self):
        """Initialize a real persistent CMD/Shell instance"""
        try:
            if sys.platform.startswith('win'):
                # Windows - use cmd.exe
                startup_info = subprocess.STARTUPINFO()
                startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startup_info.wShowWindow = subprocess.SW_HIDE
                
                self.process = subprocess.Popen(
                    ['cmd.exe'],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,
                    cwd=self.current_path,
                    startupinfo=startup_info,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:
                # Unix-like systems - use bash
                self.process = subprocess.Popen(
                    ['/bin/bash'],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,
                    cwd=self.current_path,
                    preexec_fn=os.setsid
                )
            
            self.running = True
            
            # Start output reader thread
            self.output_thread = threading.Thread(target=self._read_output, daemon=True)
            self.output_thread.start()
            
            # Send initial command to get the prompt
            if sys.platform.startswith('win'):
                self.process.stdin.write('echo off\n')
                self.process.stdin.write('prompt $P$G\n')  # Set prompt to show path
            else:
                self.process.stdin.write('export PS1="\\w> "\n')
            
            self.process.stdin.flush()
            
            # Wait a moment for initialization
            time.sleep(0.5)
            
            # Clear the initial output
            self._clear_queue()
            
            print(f"Real CMD initialized successfully with PID: {self.process.pid}")
            
        except Exception as e:
            print(f"Error initializing CMD: {e}")
            self.process = None
    
    def _clear_queue(self):
        """Clear the output queue"""
        while not self.output_queue.empty():
            try:
                self.output_queue.get_nowait()
            except queue.Empty:
                break
    
    def _read_output(self):
        """Read output from the CMD process in a separate thread"""
        if not self.process:
            return
            
        try:
            while self.running and self.process.poll() is None:
                try:
                    # Read character by character for real-time output
                    char = self.process.stdout.read(1)
                    if char:
                        self.output_queue.put(char)
                    else:
                        time.sleep(0.001)
                except Exception as e:
                    print(f"Error reading output: {e}")
                    break
        except Exception as e:
            print(f"Output thread error: {e}")
        finally:
            self.running = False
    
    def _extract_path_from_prompt(self, text):
        """Extract current path from CMD prompt"""
        try:
            if sys.platform.startswith('win'):
                # Windows: look for "C:\path\to\dir>"
                match = re.search(r'([A-Z]:\\[^>]*|[A-Z]:)>', text)
                if match:
                    return match.group(1)
            else:
                # Unix: look for "/path/to/dir>"
                match = re.search(r'([^>]+)>', text)
                if match:
                    path = match.group(1).strip()
                    if path.startswith('~'):
                        return path
                    elif path.startswith('/'):
                        return path
        except:
            pass
        return None
    
    async def execute_command(self, command: str) -> AsyncGenerator[str, None]:
        """Execute a command in the real CMD instance"""
        if not self.process or self.process.poll() is not None:
            # Try to reinitialize if process died
            self.initialize_cmd()
            if not self.process:
                yield "Error: Unable to initialize CMD\n"
                return
        
        try:
            command = command.strip()
            
            # Handle built-in clear command
            if command.lower() in ['clear', 'cls']:
                yield "\033[2J\033[H"  # ANSI clear screen
                return
            
            # Handle exit command
            if command.lower() in ['exit', 'quit']:
                yield "Goodbye!\n"
                self.cleanup()
                return
            
            # Send command to CMD
            self.process.stdin.write(command + '\n')
            self.process.stdin.flush()
            
            # Collect output
            output_buffer = ""
            command_finished = False
            prompt_detected = False
            start_time = time.time()
            last_output_time = start_time
            
            # Skip the echo of the command itself (first line)
            command_echo_skipped = False
            
            while not command_finished:
                try:
                    # Get output with timeout
                    char = self.output_queue.get(timeout=0.1)
                    output_buffer += char
                    last_output_time = time.time()
                    
                    # Check for newlines to process line by line
                    if '\n' in output_buffer or '\r' in output_buffer:
                        lines = re.split(r'[\r\n]+', output_buffer)
                        
                        # Process complete lines
                        for i, line in enumerate(lines[:-1]):  # All but the last (incomplete) line
                            if not command_echo_skipped and line.strip() == command.strip():
                                # Skip the command echo
                                command_echo_skipped = True
                                continue
                            
                            # Check if this line contains a prompt
                            path = self._extract_path_from_prompt(line)
                            if path:
                                self.current_path = path
                                prompt_detected = True
                                # Don't yield the prompt line
                                continue
                            
                            # Yield the line if it's not empty or just whitespace
                            if line.strip():
                                yield line + '\n'
                        
                        # Keep the incomplete line in buffer
                        output_buffer = lines[-1]
                    
                    # Check if we've returned to prompt (command finished)
                    if prompt_detected and len(output_buffer.strip()) == 0:
                        command_finished = True
                        break
                    
                    # Also check if buffer ends with a prompt pattern
                    if self._extract_path_from_prompt(output_buffer):
                        # Extract path and finish
                        path = self._extract_path_from_prompt(output_buffer)
                        if path:
                            self.current_path = path
                        command_finished = True
                        break
                    
                    # Yield output in reasonable chunks for long running commands
                    if len(output_buffer) > 100:
                        # Look for a good break point
                        last_space = output_buffer.rfind(' ')
                        if last_space > 50:
                            yield output_buffer[:last_space]
                            output_buffer = output_buffer[last_space:]
                
                except queue.Empty:
                    current_time = time.time()
                    
                    # If we have buffered output and no new output for a while, yield it
                    if output_buffer.strip() and current_time - last_output_time > 0.5:
                        # Check if buffer contains prompt
                        path = self._extract_path_from_prompt(output_buffer)
                        if path:
                            self.current_path = path
                            command_finished = True
                            break
                        else:
                            yield output_buffer
                            output_buffer = ""
                    
                    # Timeout after 30 seconds
                    if current_time - start_time > 30.0:
                        yield "\n[Command timeout after 30 seconds]\n"
                        command_finished = True
                        break
                    
                    # If no output for 2 seconds, assume command finished
                    if current_time - last_output_time > 2.0:
                        command_finished = True
                        break
                
                # Check if process died
                if self.process.poll() is not None:
                    yield "\n[CMD process terminated]\n"
                    break
            
            # Yield any remaining output (except prompts)
            if output_buffer.strip():
                path = self._extract_path_from_prompt(output_buffer)
                if not path:  # Only yield if it's not a prompt
                    yield output_buffer
                elif path:
                    self.current_path = path
                    
        except Exception as e:
            yield f"Command execution error: {str(e)}\n"
    
    async def send_input(self, user_input: str) -> AsyncGenerator[str, None]:
        """Send input to an interactive process in CMD"""
        if not self.process or self.process.poll() is not None:
            yield "Error: CMD not available\n"
            return
        
        try:
            # Send input to the process
            self.process.stdin.write(user_input + '\n')
            self.process.stdin.flush()
            
            # Collect response
            output_buffer = ""
            start_time = time.time()
            
            while time.time() - start_time < 5.0:  # 5 second timeout
                try:
                    char = self.output_queue.get(timeout=0.1)
                    output_buffer += char
                    
                    # Yield output in chunks
                    if len(output_buffer) >= 50 or '\n' in output_buffer:
                        yield output_buffer
                        output_buffer = ""
                        
                except queue.Empty:
                    if output_buffer:
                        yield output_buffer
                        output_buffer = ""
                    break
            
            if output_buffer:
                yield output_buffer
                
        except Exception as e:
            yield f"Input error: {str(e)}\n"
    
    def get_current_path(self):
        """Get the current path from CMD"""
        return self.current_path.replace('\\', '/') if self.current_path else os.getcwd().replace('\\', '/')
    
    def interrupt(self):
        """Send interrupt signal (Ctrl+C) to CMD"""
        if not self.process:
            return
            
        try:
            if sys.platform.startswith('win'):
                # Windows - send Ctrl+C
                self.process.send_signal(signal.CTRL_C_EVENT)
            else:
                # Unix-like systems
                os.killpg(os.getpgid(self.process.pid), signal.SIGINT)
        except Exception as e:
            print(f"Error sending interrupt: {e}")
    
    def cleanup(self):
        """Clean up resources"""
        self.running = False
        
        if self.process:
            try:
                # Send exit command first
                if self.process.poll() is None:
                    self.process.stdin.write('exit\n')
                    self.process.stdin.flush()
                    
                # Wait a bit for graceful exit
                self.process.wait(timeout=3)
            except:
                try:
                    # Force termination if graceful exit failed
                    self.process.terminate()
                    self.process.wait(timeout=2)
                except:
                    try:
                        self.process.kill()
                    except:
                        pass
            finally:
                self.process = None
        
        # Wait for output thread to finish
        if self.output_thread and self.output_thread.is_alive():
            self.output_thread.join(timeout=1)