import asyncio
import json
import websockets
import os
import platform
import signal
import sys
import subprocess
import re
import threading
import time

class TerminalAgent:
    def __init__(self):
        self.current_directory = os.getcwd()
        self.is_windows = platform.system() == 'Windows'
        self.current_process = None
        self.interactive_mode = False
        self.special_interactive_mode = None  # For commands like choice, pause, more
        self.environment_vars = dict(os.environ)
        
    async def get_prompt(self):
        """Generate a realistic command prompt"""
        if self.is_windows:
            return f"{self.current_directory}>"
        else:
            user = os.environ.get('USER', 'user')
            hostname = platform.node()
            short_path = self.current_directory.replace(os.path.expanduser('~'), '~')
            return f"{user}@{hostname}:{short_path}$ "

    def _is_interactive_command(self, command):
        """Check if command is interactive"""
        interactive_commands = ['python', 'python3', 'node', 'mysql', 'psql', 'mongo', 'redis-cli', 'ftp', 'telnet', 'ssh']
        windows_interactive_commands = ['choice', 'pause', 'more']
        windows_special_commands = ['set /p']
        
        cmd_lower = command.lower().strip()
        
        # Check for set /p
        if 'set /p' in cmd_lower or 'set/p' in cmd_lower:
            return 'set_p'
        
        # Check for choice command
        if cmd_lower.startswith('choice'):
            return 'choice'
            
        # Check for pause command
        if cmd_lower == 'pause':
            return 'pause'
            
        # Check for more command
        if cmd_lower.startswith('more '):
            return 'more'
            
        # Check for other interactive commands
        if any(cmd_lower.startswith(cmd) for cmd in interactive_commands):
            return 'standard'
            
        return None

    async def execute_command(self, command, websocket):
        """Execute command and handle both regular and interactive commands"""
        try:
            # Handle built-in commands first
            builtin_handled = await self._handle_builtin_commands(command, websocket)
            if builtin_handled:
                return
                
            # Check if this is an interactive command
            interactive_type = self._is_interactive_command(command)
            
            if interactive_type:
                await self._handle_interactive_command(command, websocket, interactive_type)
            else:
                await self._handle_regular_command(command, websocket)

        except Exception as e:
            error_msg = f"'{command}' is not recognized as an internal or external command,\noperable program or batch file." if self.is_windows else f"bash: {command}: command not found"
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"{error_msg}\n{await self.get_prompt()}"
            }))

    async def _handle_builtin_commands(self, command, websocket):
        """Handle built-in commands that don't need subprocess"""
        cmd_lower = command.lower().strip()
        
        # CD command
        if cmd_lower.startswith('cd ') or cmd_lower == 'cd':
            await self._handle_cd_command(command, websocket)
            return True
            
        # Clear command
        if cmd_lower == 'cls' or cmd_lower == 'clear':
            await self._handle_clear_command(websocket)
            return True
            
        # Echo command
        if cmd_lower.startswith('echo '):
            text = command[5:].strip()
            # Handle echo off/on
            if text.lower() == 'off':
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": await self.get_prompt()
                }))
            elif text.lower() == 'on':
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": await self.get_prompt()
                }))
            else:
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"{text}\n{await self.get_prompt()}"
                }))
            return True
            
        # Dir/ls command with basic implementation
        if cmd_lower == 'dir' or cmd_lower == 'ls':
            await self._handle_dir_command(websocket)
            return True
            
        # Set command (without /p)
        if cmd_lower.startswith('set ') and '/p' not in cmd_lower:
            await self._handle_set_command(command, websocket)
            return True
            
        # Exit command
        if cmd_lower == 'exit':
            await websocket.send(json.dumps({
                "type": "output",
                "payload": "Goodbye!"
            }))
            return True
            
        return False

    async def _handle_set_command(self, command, websocket):
        """Handle regular set command (not set /p)"""
        try:
            parts = command.split(None, 1)
            if len(parts) == 1:
                # Just 'set' - show all environment variables
                env_output = []
                for key, value in sorted(self.environment_vars.items()):
                    env_output.append(f"{key}={value}")
                output = '\n'.join(env_output[:50])  # Limit output
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"{output}\n{await self.get_prompt()}"
                }))
            else:
                var_assignment = parts[1]
                if '=' in var_assignment:
                    var_name, var_value = var_assignment.split('=', 1)
                    self.environment_vars[var_name] = var_value
                    os.environ[var_name] = var_value
                    await websocket.send(json.dumps({
                        "type": "output",
                        "payload": await self.get_prompt()
                    }))
                else:
                    # Show specific variable
                    var_name = var_assignment
                    if var_name in self.environment_vars:
                        await websocket.send(json.dumps({
                            "type": "output",
                            "payload": f"{var_name}={self.environment_vars[var_name]}\n{await self.get_prompt()}"
                        }))
                    else:
                        await websocket.send(json.dumps({
                            "type": "output",
                            "payload": f"Environment variable {var_name} not defined\n{await self.get_prompt()}"
                        }))
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"Set command error: {e}\n{await self.get_prompt()}"
            }))

    async def _handle_dir_command(self, websocket):
        """Handle directory listing"""
        try:
            if self.is_windows:
                # Use actual dir command for full Windows compatibility
                await self._handle_regular_command('dir', websocket)
            else:
                await self._handle_regular_command('ls -la', websocket)
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"Directory listing error: {e}\n{await self.get_prompt()}"
            }))

    async def _handle_interactive_command(self, command, websocket, interactive_type):
        """Handle different types of interactive commands"""
        if interactive_type == 'set_p':
            await self._handle_set_p_command(command, websocket)
        elif interactive_type == 'choice':
            await self._handle_choice_command(command, websocket)
        elif interactive_type == 'pause':
            await self._handle_pause_command(websocket)
        elif interactive_type == 'more':
            await self._handle_more_command(command, websocket)
        else:
            await self._handle_standard_interactive_command(command, websocket)

    async def _handle_choice_command(self, command, websocket):
        """Handle Windows choice command"""
        try:
            self.interactive_mode = True
            self.special_interactive_mode = 'choice'
            
            # Parse choice command
            # Example: choice /c yn /m "Do you want to continue"
            # Example: choice /c:abc /m "Choose option"
            
            choices = "YN"  # default
            message = "Y,N"  # default message
            
            # Extract choices and message from command
            cmd_parts = command.split()
            i = 1
            while i < len(cmd_parts):
                part = cmd_parts[i].lower()
                if part.startswith('/c') or part.startswith('-c'):
                    if ':' in part:
                        choices = part.split(':', 1)[1].upper()
                    elif i + 1 < len(cmd_parts):
                        i += 1
                        choices = cmd_parts[i].upper()
                elif part.startswith('/m') or part.startswith('-m'):
                    if i + 1 < len(cmd_parts):
                        i += 1
                        # Handle quoted message
                        message = cmd_parts[i].strip('"\'')
                        # Continue collecting message if it's quoted and spans multiple parts
                        while i + 1 < len(cmd_parts) and not message.endswith('"') and not message.endswith("'"):
                            i += 1
                            message += " " + cmd_parts[i]
                        message = message.strip('"\'')
                i += 1
            
            # Store choice options for validation
            self.choice_options = list(choices)
            
            # Send the choice prompt
            choice_list = ','.join(self.choice_options)
            prompt_text = f"{message} [{choice_list}]?"
            
            await websocket.send(json.dumps({
                "type": "output",
                "payload": prompt_text
            }))
            
        except Exception as e:
            self.interactive_mode = False
            self.special_interactive_mode = None
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"Choice command error: {e}\n{await self.get_prompt()}"
            }))

    async def _handle_pause_command(self, websocket):
        """Handle Windows pause command"""
        self.interactive_mode = True
        self.special_interactive_mode = 'pause'
        
        await websocket.send(json.dumps({
            "type": "output",
            "payload": "Press any key to continue . . . "
        }))

    async def _handle_more_command(self, command, websocket):
        """Handle more command for file viewing"""
        try:
            # Extract filename from command
            parts = command.split(None, 1)
            if len(parts) < 2:
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"The syntax of the command is incorrect.\n{await self.get_prompt()}"
                }))
                return
                
            filename = parts[1].strip('"')
            filepath = os.path.join(self.current_directory, filename) if not os.path.isabs(filename) else filename
            
            if not os.path.exists(filepath):
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"The system cannot find the file specified.\n{await self.get_prompt()}"
                }))
                return
                
            # Read file content
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            # Send content and prompt for more
            lines = content.split('\n')
            
            if len(lines) <= 24:  # If file is small, show all
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"{content}\n{await self.get_prompt()}"
                }))
            else:
                # Show first 24 lines and wait for input
                self.interactive_mode = True
                self.special_interactive_mode = 'more'
                self.more_lines = lines
                self.more_position = 0
                
                await self._show_more_page(websocket)
                
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"More command error: {e}\n{await self.get_prompt()}"
            }))

    async def _show_more_page(self, websocket):
        """Show a page of content for more command"""
        lines_per_page = 24
        start = self.more_position
        end = min(start + lines_per_page, len(self.more_lines))
        
        page_content = '\n'.join(self.more_lines[start:end])
        
        if end >= len(self.more_lines):
            # Last page
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"{page_content}\n{await self.get_prompt()}"
            }))
            self.interactive_mode = False
            self.special_interactive_mode = None
        else:
            # More pages available
            percentage = int((end / len(self.more_lines)) * 100)
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"{page_content}\n-- More ({percentage}%) --"
            }))
            self.more_position = end

    async def _handle_set_p_command(self, command, websocket):
        """Handle Windows set /p command"""
        try:
            # Parse the set /p command
            # Example: set /p name="Enter your name: "
            if '=' not in command:
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"The syntax of the command is incorrect.\n{await self.get_prompt()}"
                }))
                return
                
            parts = command.split('=', 1)
            var_part = parts[0].strip()
            prompt_part = parts[1].strip().strip('"\'')
            
            # Extract variable name
            var_name = var_part.split()[-1] if len(var_part.split()) > 2 else 'var'
            
            self.interactive_mode = True
            self.special_interactive_mode = 'set_p'
            self.current_set_p_var = var_name
            
            await websocket.send(json.dumps({
                "type": "output",
                "payload": prompt_part
            }))
            
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"Set command error: {e}\n{await self.get_prompt()}"
            }))

    async def _handle_standard_interactive_command(self, command, websocket):
        """Handle standard interactive commands like python, node, etc."""
        try:
            if self.is_windows:
                self.current_process = await asyncio.create_subprocess_shell(
                    command,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.current_directory,
                    env=self.environment_vars,
                    shell=True
                )
            else:
                self.current_process = await asyncio.create_subprocess_shell(
                    command,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.current_directory,
                    env=self.environment_vars,
                    shell=True
                )

            self.interactive_mode = True
            self.special_interactive_mode = 'standard'
            
            # Start tasks to handle process I/O
            stdout_task = asyncio.create_task(self._stream_output(self.current_process.stdout, websocket))
            stderr_task = asyncio.create_task(self._stream_output(self.current_process.stderr, websocket))
            
            # Wait for process to complete
            await self.current_process.wait()
            
            # Cancel streaming tasks
            stdout_task.cancel()
            stderr_task.cancel()
            
            # Clean up
            self.current_process = None
            self.interactive_mode = False
            self.special_interactive_mode = None
            
            await websocket.send(json.dumps({
                "type": "output",
                "payload": await self.get_prompt()
            }))

        except Exception as e:
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"Error starting interactive command: {e}\n{await self.get_prompt()}"
            }))

    async def _handle_cd_command(self, command, websocket):
        """Handle directory change command"""
        path = command[3:].strip().strip('"') if len(command) > 3 else ''
        
        if not path:
            if not self.is_windows:
                path = os.path.expanduser('~')
            else:
                # On Windows, cd without args shows current directory
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"{self.current_directory}\n{await self.get_prompt()}"
                }))
                return

        try:
            if path == '..':
                new_path = os.path.dirname(self.current_directory)
            elif os.path.isabs(path):
                new_path = path
            else:
                new_path = os.path.join(self.current_directory, path)
            
            new_path = os.path.abspath(new_path)
            if os.path.exists(new_path) and os.path.isdir(new_path):
                self.current_directory = new_path
                os.chdir(new_path)
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": await self.get_prompt()
                }))
            else:
                error_msg = "The system cannot find the path specified." if self.is_windows else f"cd: {path}: No such file or directory"
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"{error_msg}\n{await self.get_prompt()}"
                }))
        except Exception:
            error_msg = "The system cannot find the path specified." if self.is_windows else f"cd: {path}: No such file or directory"
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"{error_msg}\n{await self.get_prompt()}"
            }))

    async def _handle_clear_command(self, websocket):
        """Handle clear screen command"""
        await websocket.send(json.dumps({
            "type": "output",
            "payload": "\x1b[H\x1b[2J\x1b[3J"
        }))
        await websocket.send(json.dumps({
            "type": "output",
            "payload": await self.get_prompt()
        }))

    async def _handle_regular_command(self, command, websocket):
        """Handle regular non-interactive commands"""
        try:
            if self.is_windows:
                # Use cmd.exe for Windows commands
                proc = await asyncio.create_subprocess_shell(
                    f'cmd.exe /c "{command}"',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.current_directory,
                    env=self.environment_vars
                )
            else:
                proc = await asyncio.create_subprocess_shell(
                    command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=self.current_directory,
                    env=self.environment_vars,
                    shell=True
                )

            stdout_data, stderr_data = await proc.communicate()
            
            output_lines = []
            if stdout_data:
                output_lines.extend(stdout_data.decode('utf-8', errors='replace').splitlines())
            if stderr_data:
                output_lines.extend(stderr_data.decode('utf-8', errors='replace').splitlines())
            
            if output_lines:
                full_output = '\n'.join(output_lines) + '\n' + await self.get_prompt()
            else:
                full_output = await self.get_prompt()
                
            await websocket.send(json.dumps({
                "type": "output", 
                "payload": full_output
            }))
        except Exception as e:
            await websocket.send(json.dumps({
                "type": "output",
                "payload": f"Command execution error: {e}\n{await self.get_prompt()}"
            }))

    async def _stream_output(self, stream, websocket):
        """Stream output from interactive process"""
        try:
            while not stream.at_eof():
                data = await stream.read(1024)
                if data:
                    output = data.decode('utf-8', errors='ignore')
                    await websocket.send(json.dumps({
                        "type": "output",
                        "payload": output
                    }))
        except Exception as e:
            print(f"Stream error: {e}")

    async def handle_input(self, input_text):
        """Send input to interactive process or handle special commands"""
        if not self.interactive_mode:
            return False
            
        try:
            if self.special_interactive_mode == 'set_p':
                # Handle set /p input
                if hasattr(self, 'current_set_p_var'):
                    self.environment_vars[self.current_set_p_var] = input_text
                    os.environ[self.current_set_p_var] = input_text
                    delattr(self, 'current_set_p_var')
                self.interactive_mode = False
                self.special_interactive_mode = None
                return True
                
            elif self.special_interactive_mode == 'choice':
                # Handle choice input
                choice_input = input_text.upper().strip()
                if hasattr(self, 'choice_options') and choice_input in self.choice_options:
                    # Valid choice, set ERRORLEVEL
                    error_level = self.choice_options.index(choice_input) + 1
                    self.environment_vars['ERRORLEVEL'] = str(error_level)
                    os.environ['ERRORLEVEL'] = str(error_level)
                    self.interactive_mode = False
                    self.special_interactive_mode = None
                    delattr(self, 'choice_options')
                    return True
                else:
                    # Invalid choice, continue waiting
                    return False
                    
            elif self.special_interactive_mode == 'pause':
                # Any key continues from pause
                self.interactive_mode = False
                self.special_interactive_mode = None
                return True
                
            elif self.special_interactive_mode == 'more':
                # Handle more command input
                if input_text.strip().lower() in ['q', 'quit']:
                    self.interactive_mode = False
                    self.special_interactive_mode = None
                    return True
                else:
                    # Show next page
                    return False  # Will be handled by calling code
                    
            elif self.special_interactive_mode == 'standard':
                # Handle standard interactive process input
                if self.current_process and self.current_process.stdin:
                    self.current_process.stdin.write((input_text + '\n').encode())
                    await self.current_process.stdin.drain()
                    
        except Exception as e:
            print(f"Input handling error: {e}")
            
        return False

    async def handle_more_input(self, websocket):
        """Handle input for more command"""
        if self.special_interactive_mode == 'more':
            await self._show_more_page(websocket)

    async def interrupt_process(self):
        """Handle Ctrl+C interrupt"""
        if self.current_process:
            try:
                if self.is_windows:
                    self.current_process.terminate()
                else:
                    self.current_process.send_signal(signal.SIGINT)
                await self.current_process.wait()
                self.current_process = None
                self.interactive_mode = False
                self.special_interactive_mode = None
                return True
            except Exception as e:
                print(f"Interrupt error: {e}")
        elif self.interactive_mode:
            # Handle interrupting special commands
            self.interactive_mode = False
            self.special_interactive_mode = None
            # Clean up any special state
            if hasattr(self, 'current_set_p_var'):
                delattr(self, 'current_set_p_var')
            if hasattr(self, 'choice_options'):
                delattr(self, 'choice_options')
            if hasattr(self, 'more_lines'):
                delattr(self, 'more_lines')
                delattr(self, 'more_position')
            return True
        return False

async def handle_agent_session(websocket, path):
    print("Agent connected. Starting terminal session...")
    agent = TerminalAgent()
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data.get("type") == "get_prompt":
                    prompt = await agent.get_prompt()
                    await websocket.send(json.dumps({
                        "type": "output",
                        "payload": prompt
                    }))
                
                elif data.get("type") == "command":
                    command = data.get("payload", "")
                    
                    # Check if we're in interactive mode
                    if agent.interactive_mode:
                        # Handle input for interactive commands
                        input_handled = await agent.handle_input(command)
                        if input_handled:
                            # Command completed, send new prompt
                            await websocket.send(json.dumps({
                                "type": "output",
                                "payload": await agent.get_prompt()
                            }))
                        elif agent.special_interactive_mode == 'more':
                            # Handle more command pagination
                            await agent.handle_more_input(websocket)
                    else:
                        # Execute new command
                        if command.strip():
                            await agent.execute_command(command.strip(), websocket)
                        else:
                            await websocket.send(json.dumps({
                                "type": "output",
                                "payload": await agent.get_prompt()
                            }))

                elif data.get("type") == "interrupt":
                    # Handle Ctrl+C
                    interrupted = await agent.interrupt_process()
                    if interrupted:
                        await websocket.send(json.dumps({
                            "type": "output",
                            "payload": await agent.get_prompt()
                        }))
                        
            except json.JSONDecodeError as e:
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"JSON parse error: {e}\n{await agent.get_prompt()}"
                }))
            except Exception as e:
                await websocket.send(json.dumps({
                    "type": "output",
                    "payload": f"Error: {e}\n{await agent.get_prompt()}"
                }))
                
    except websockets.exceptions.ConnectionClosed:
        print("WebSocket connection closed.")
        if agent.current_process:
            agent.current_process.terminate()

if __name__ == "__main__":
    agent_id = "agent_12345"
    uri = f"ws://127.0.0.1:8000/ws/agent/{agent_id}"

    async def agent_client():
        try:
            async with websockets.connect(uri) as websocket:
                print(f"Connected to {uri}")
                await handle_agent_session(websocket, None)
        except Exception as e:
            print(f"Connection failed: {e}")

    asyncio.run(agent_client())