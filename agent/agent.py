# import asyncio
# import os
# import platform
# import shutil
# import signal
# import socketio

# class TerminalAgent:
#     def __init__(self):
#         self.current_directory = os.getcwd()
#         self.is_windows = platform.system() == 'Windows'
#         self.current_process = None
#         self.interactive_mode = False
#         self.special_interactive_mode = None  # For commands like choice, pause, more
#         self.environment_vars = dict(os.environ)
        
#     def get_available_shells():
#         possible_shells = ["cmd.exe", "powershell.exe", "pwsh.exe", "bash.exe", "wsl.exe", "wt.exe"]
#         available = []

#         for shell in possible_shells:
#             path = shutil.which(shell)
#             if path:
#                 available.append(shell.replace(".exe", ""))
#         return {"shells": available}

#     async def get_prompt(self):
#         """Generate a realistic command prompt"""
#         if self.is_windows:
#             return f"{self.current_directory}>"
#         else:
#             user = os.environ.get('USER', 'user')
#             hostname = platform.node()
#             short_path = self.current_directory.replace(os.path.expanduser('~'), '~')
#             return f"{user}@{hostname}:{short_path}$ "

#     def _is_interactive_command(self, command):
#         """Check if command is interactive"""
#         interactive_commands = ['python', 'python3', 'node', 'mysql', 'psql', 'mongo', 'redis-cli', 'ftp', 'telnet', 'ssh']
#         windows_interactive_commands = ['choice', 'pause', 'more']
#         windows_special_commands = ['set /p']
        
#         cmd_lower = command.lower().strip()
        
#         # Check for set /p
#         if 'set /p' in cmd_lower or 'set/p' in cmd_lower:
#             return 'set_p'
        
#         # Check for choice command
#         if cmd_lower.startswith('choice'):
#             return 'choice'
            
#         # Check for pause command
#         if cmd_lower == 'pause':
#             return 'pause'
            
#         # Check for more command
#         if cmd_lower.startswith('more '):
#             return 'more'
            
#         # Check for other interactive commands
#         if any(cmd_lower.startswith(cmd) for cmd in interactive_commands):
#             return 'standard'
            
#         return None

#     async def execute_command(self, command, sio, sid):
#         """Execute command and handle both regular and interactive commands"""
#         try:
#             # Handle built-in commands first
#             builtin_handled = await self._handle_builtin_commands(command, sio, sid)
#             if builtin_handled:
#                 return
                
#             # Check if this is an interactive command
#             interactive_type = self._is_interactive_command(command)
            
#             if interactive_type:
#                 await self._handle_interactive_command(command, sio, sid, interactive_type)
#             else:
#                 await self._handle_regular_command(command, sio, sid)

#         except Exception as e:
#             error_msg = f"'{command}' is not recognized as an internal or external command,\noperable program or batch file." if self.is_windows else f"bash: {command}: command not found"
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"{error_msg}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _handle_builtin_commands(self, command, sio, sid):
#         """Handle built-in commands that don't need subprocess"""
#         cmd_lower = command.lower().strip()
        
#         # CD command
#         if cmd_lower.startswith('cd ') or cmd_lower == 'cd':
#             await self._handle_cd_command(command, sio, sid)
#             return True
            
#         # Clear command
#         if cmd_lower == 'cls' or cmd_lower == 'clear':
#             await self._handle_clear_command(sio, sid)
#             return True
            
#         # Echo command
#         if cmd_lower.startswith('echo '):
#             text = command[5:].strip()
#             # Handle echo off/on
#             if text.lower() == 'off':
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": await self.get_prompt()
#                 }, room=sid)
#             elif text.lower() == 'on':
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": await self.get_prompt()
#                 }, room=sid)
#             else:
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"{text}\n{await self.get_prompt()}"
#                 }, room=sid)
#             return True
            
#         # Dir/ls command with basic implementation
#         if cmd_lower == 'dir' or cmd_lower == 'ls':
#             await self._handle_dir_command(sio, sid)
#             return True
            
#         # Set command (without /p)
#         if cmd_lower.startswith('set ') and '/p' not in cmd_lower:
#             await self._handle_set_command(command, sio, sid)
#             return True
            
#         # Exit command
#         if cmd_lower == 'exit':
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": "Goodbye!"
#             }, room=sid)
#             return True
            
#         return False

#     async def _handle_set_command(self, command, sio, sid):
#         """Handle regular set command (not set /p)"""
#         try:
#             parts = command.split(None, 1)
#             if len(parts) == 1:
#                 # Just 'set' - show all environment variables
#                 env_output = []
#                 for key, value in sorted(self.environment_vars.items()):
#                     env_output.append(f"{key}={value}")
#                 output = '\n'.join(env_output[:50])  # Limit output
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"{output}\n{await self.get_prompt()}"
#                 }, room=sid)
#             else:
#                 var_assignment = parts[1]
#                 if '=' in var_assignment:
#                     var_name, var_value = var_assignment.split('=', 1)
#                     self.environment_vars[var_name] = var_value
#                     os.environ[var_name] = var_value
#                     await sio.emit('terminal_message', {
#                         "type": "output",
#                         "data": await self.get_prompt()
#                     }, room=sid)
#                 else:
#                     # Show specific variable
#                     var_name = var_assignment
#                     if var_name in self.environment_vars:
#                         await sio.emit('terminal_message', {
#                             "type": "output",
#                             "data": f"{var_name}={self.environment_vars[var_name]}\n{await self.get_prompt()}"
#                         }, room=sid)
#                     else:
#                         await sio.emit('terminal_message', {
#                             "type": "output",
#                             "data": f"Environment variable {var_name} not defined\n{await self.get_prompt()}"
#                         }, room=sid)
#         except Exception as e:
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"Set command error: {e}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _handle_dir_command(self, sio, sid):
#         """Handle directory listing"""
#         try:
#             if self.is_windows:
#                 # Use actual dir command for full Windows compatibility
#                 await self._handle_regular_command('dir', sio, sid)
#             else:
#                 await self._handle_regular_command('ls -la', sio, sid)
#         except Exception as e:
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"Directory listing error: {e}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _handle_interactive_command(self, command, sio, sid, interactive_type):
#         """Handle different types of interactive commands"""
#         if interactive_type == 'set_p':
#             await self._handle_set_p_command(command, sio, sid)
#         elif interactive_type == 'choice':
#             await self._handle_choice_command(command, sio, sid)
#         elif interactive_type == 'pause':
#             await self._handle_pause_command(sio, sid)
#         elif interactive_type == 'more':
#             await self._handle_more_command(command, sio, sid)
#         else:
#             await self._handle_standard_interactive_command(command, sio, sid)

#     async def _handle_choice_command(self, command, sio, sid):
#         """Handle Windows choice command"""
#         try:
#             self.interactive_mode = True
#             self.special_interactive_mode = 'choice'
            
#             # Parse choice command
#             # Example: choice /c yn /m "Do you want to continue"
#             # Example: choice /c:abc /m "Choose option"
            
#             choices = "YN"  # default
#             message = "Y,N"  # default message
            
#             # Extract choices and message from command
#             cmd_parts = command.split()
#             i = 1
#             while i < len(cmd_parts):
#                 part = cmd_parts[i].lower()
#                 if part.startswith('/c') or part.startswith('-c'):
#                     if ':' in part:
#                         choices = part.split(':', 1)[1].upper()
#                     elif i + 1 < len(cmd_parts):
#                         i += 1
#                         choices = cmd_parts[i].upper()
#                 elif part.startswith('/m') or part.startswith('-m'):
#                     if i + 1 < len(cmd_parts):
#                         i += 1
#                         # Handle quoted message
#                         message = cmd_parts[i].strip('"\'')
#                         # Continue collecting message if it's quoted and spans multiple parts
#                         while i + 1 < len(cmd_parts) and not message.endswith('"') and not message.endswith("'"):
#                             i += 1
#                             message += " " + cmd_parts[i]
#                         message = message.strip('"\'')
#                 i += 1
            
#             # Store choice options for validation
#             self.choice_options = list(choices)
            
#             # Send the choice prompt
#             choice_list = ','.join(self.choice_options)
#             prompt_text = f"{message} [{choice_list}]?"
            
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": prompt_text
#             }, room=sid)
            
#         except Exception as e:
#             self.interactive_mode = False
#             self.special_interactive_mode = None
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"Choice command error: {e}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _handle_pause_command(self, sio, sid):
#         """Handle Windows pause command"""
#         self.interactive_mode = True
#         self.special_interactive_mode = 'pause'
        
#         await sio.emit('terminal_message', {
#             "type": "output",
#             "data": "Press any key to continue . . . "
#         }, room=sid)

#     async def _handle_more_command(self, command, sio, sid):
#         """Handle more command for file viewing"""
#         try:
#             # Extract filename from command
#             parts = command.split(None, 1)
#             if len(parts) < 2:
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"The syntax of the command is incorrect.\n{await self.get_prompt()}"
#                 }, room=sid)
#                 return
                
#             filename = parts[1].strip('"')
#             filepath = os.path.join(self.current_directory, filename) if not os.path.isabs(filename) else filename
            
#             if not os.path.exists(filepath):
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"The system cannot find the file specified.\n{await self.get_prompt()}"
#                 }, room=sid)
#                 return
                
#             # Read file content
#             with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
#                 content = f.read()
                
#             # Send content and prompt for more
#             lines = content.split('\n')
            
#             if len(lines) <= 24:  # If file is small, show all
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"{content}\n{await self.get_prompt()}"
#                 }, room=sid)
#             else:
#                 # Show first 24 lines and wait for input
#                 self.interactive_mode = True
#                 self.special_interactive_mode = 'more'
#                 self.more_lines = lines
#                 self.more_position = 0
                
#                 await self._show_more_page(sio, sid)
                
#         except Exception as e:
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"More command error: {e}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _show_more_page(self, sio, sid):
#         """Show a page of content for more command"""
#         lines_per_page = 24
#         start = self.more_position
#         end = min(start + lines_per_page, len(self.more_lines))
        
#         page_content = '\n'.join(self.more_lines[start:end])
        
#         if end >= len(self.more_lines):
#             # Last page
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"{page_content}\n{await self.get_prompt()}"
#             }, room=sid)
#             self.interactive_mode = False
#             self.special_interactive_mode = None
#         else:
#             # More pages available
#             percentage = int((end / len(self.more_lines)) * 100)
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"{page_content}\n-- More ({percentage}%) --"
#             }, room=sid)
#             self.more_position = end

#     async def _handle_set_p_command(self, command, sio, sid):
#         """Handle Windows set /p command"""
#         try:
#             # Parse the set /p command
#             # Example: set /p name="Enter your name: "
#             if '=' not in command:
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"The syntax of the command is incorrect.\n{await self.get_prompt()}"
#                 }, room=sid)
#                 return
                
#             parts = command.split('=', 1)
#             var_part = parts[0].strip()
#             prompt_part = parts[1].strip().strip('"\'')
            
#             # Extract variable name
#             var_name = var_part.split()[-1] if len(var_part.split()) > 2 else 'var'
            
#             self.interactive_mode = True
#             self.special_interactive_mode = 'set_p'
#             self.current_set_p_var = var_name
            
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": prompt_part
#             }, room=sid)
            
#         except Exception as e:
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"Set command error: {e}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _handle_standard_interactive_command(self, command, sio, sid):
#         """Handle standard interactive commands like python, node, etc."""
#         try:
#             if self.is_windows:
#                 self.current_process = await asyncio.create_subprocess_shell(
#                     command,
#                     stdin=asyncio.subprocess.PIPE,
#                     stdout=asyncio.subprocess.PIPE,
#                     stderr=asyncio.subprocess.PIPE,
#                     cwd=self.current_directory,
#                     env=self.environment_vars,
#                     shell=True
#                 )
#             else:
#                 self.current_process = await asyncio.create_subprocess_shell(
#                     command,
#                     stdin=asyncio.subprocess.PIPE,
#                     stdout=asyncio.subprocess.PIPE,
#                     stderr=asyncio.subprocess.PIPE,
#                     cwd=self.current_directory,
#                     env=self.environment_vars,
#                     shell=True
#                 )

#             self.interactive_mode = True
#             self.special_interactive_mode = 'standard'
            
#             # Start tasks to handle process I/O
#             stdout_task = asyncio.create_task(self._stream_output(self.current_process.stdout, sio, sid))
#             stderr_task = asyncio.create_task(self._stream_output(self.current_process.stderr, sio, sid))
            
#             # Wait for process to complete
#             await self.current_process.wait()
            
#             # Cancel streaming tasks
#             stdout_task.cancel()
#             stderr_task.cancel()
            
#             # Clean up
#             self.current_process = None
#             self.interactive_mode = False
#             self.special_interactive_mode = None
            
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": await self.get_prompt()
#             }, room=sid)

#         except Exception as e:
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"Error starting interactive command: {e}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _handle_cd_command(self, command, sio, sid):
#         """Handle directory change command"""
#         path = command[3:].strip().strip('"') if len(command) > 3 else ''
        
#         if not path:
#             if not self.is_windows:
#                 path = os.path.expanduser('~')
#             else:
#                 # On Windows, cd without args shows current directory
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"{self.current_directory}\n{await self.get_prompt()}"
#                 }, room=sid)
#                 return

#         try:
#             if path == '..':
#                 new_path = os.path.dirname(self.current_directory)
#             elif os.path.isabs(path):
#                 new_path = path
#             else:
#                 new_path = os.path.join(self.current_directory, path)
            
#             new_path = os.path.abspath(new_path)
#             if os.path.exists(new_path) and os.path.isdir(new_path):
#                 self.current_directory = new_path
#                 os.chdir(new_path)
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": await self.get_prompt()
#                 }, room=sid)
#             else:
#                 error_msg = "The system cannot find the path specified." if self.is_windows else f"cd: {path}: No such file or directory"
#                 await sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": f"{error_msg}\n{await self.get_prompt()}"
#                 }, room=sid)
#         except Exception:
#             error_msg = "The system cannot find the path specified." if self.is_windows else f"cd: {path}: No such file or directory"
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"{error_msg}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _handle_clear_command(self, sio, sid):
#         """Handle clear screen command"""
#         await sio.emit('terminal_message', {
#             "type": "clear",
#             "data": ""
#         }, room=sid)
#         await sio.emit('terminal_message', {
#             "type": "output",
#             "data": await self.get_prompt()
#         }, room=sid)

#     async def _handle_regular_command(self, command, sio, sid):
#         """Handle regular non-interactive commands"""
#         try:
#             if self.is_windows:
#                 # Use cmd.exe for Windows commands
#                 proc = await asyncio.create_subprocess_shell(
#                     f'cmd.exe /c "{command}"',
#                     stdout=asyncio.subprocess.PIPE,
#                     stderr=asyncio.subprocess.PIPE,
#                     cwd=self.current_directory,
#                     env=self.environment_vars
#                 )
#             else:
#                 proc = await asyncio.create_subprocess_shell(
#                     command,
#                     stdout=asyncio.subprocess.PIPE,
#                     stderr=asyncio.subprocess.PIPE,
#                     cwd=self.current_directory,
#                     env=self.environment_vars,
#                     shell=True
#                 )

#             stdout_data, stderr_data = await proc.communicate()
            
#             output_lines = []
#             if stdout_data:
#                 output_lines.extend(stdout_data.decode('utf-8', errors='replace').splitlines())
#             if stderr_data:
#                 output_lines.extend(stderr_data.decode('utf-8', errors='replace').splitlines())
            
#             if output_lines:
#                 full_output = '\n'.join(output_lines) + '\n' + await self.get_prompt()
#             else:
#                 full_output = await self.get_prompt()
                
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": full_output
#             }, room=sid)
#         except Exception as e:
#             await sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"Command execution error: {e}\n{await self.get_prompt()}"
#             }, room=sid)

#     async def _stream_output(self, stream, sio, sid):
#         """Stream output from interactive process"""
#         try:
#             while not stream.at_eof():
#                 data = await stream.read(1024)
#                 if data:
#                     output = data.decode('utf-8', errors='ignore')
#                     await sio.emit('terminal_message', {
#                         "type": "output",
#                         "data": output
#                     }, room=sid)
#         except Exception as e:
#             print(f"Stream error: {e}")

#     async def handle_input(self, input_text):
#         """Send input to interactive process or handle special commands"""
#         if not self.interactive_mode:
#             return False
            
#         try:
#             if self.special_interactive_mode == 'set_p':
#                 # Handle set /p input
#                 if hasattr(self, 'current_set_p_var'):
#                     self.environment_vars[self.current_set_p_var] = input_text
#                     os.environ[self.current_set_p_var] = input_text
#                     delattr(self, 'current_set_p_var')
#                 self.interactive_mode = False
#                 self.special_interactive_mode = None
#                 return True
                
#             elif self.special_interactive_mode == 'choice':
#                 # Handle choice input
#                 choice_input = input_text.upper().strip()
#                 if hasattr(self, 'choice_options') and choice_input in self.choice_options:
#                     # Valid choice, set ERRORLEVEL
#                     error_level = self.choice_options.index(choice_input) + 1
#                     self.environment_vars['ERRORLEVEL'] = str(error_level)
#                     os.environ['ERRORLEVEL'] = str(error_level)
#                     self.interactive_mode = False
#                     self.special_interactive_mode = None
#                     delattr(self, 'choice_options')
#                     return True
#                 else:
#                     # Invalid choice, continue waiting
#                     return False
                    
#             elif self.special_interactive_mode == 'pause':
#                 # Any key continues from pause
#                 self.interactive_mode = False
#                 self.special_interactive_mode = None
#                 return True
                
#             elif self.special_interactive_mode == 'more':
#                 # Handle more command input
#                 if input_text.strip().lower() in ['q', 'quit']:
#                     self.interactive_mode = False
#                     self.special_interactive_mode = None
#                     return True
#                 else:
#                     # Show next page
#                     return False  # Will be handled by calling code
                    
#             elif self.special_interactive_mode == 'standard':
#                 # Handle standard interactive process input
#                 if self.current_process and self.current_process.stdin:
#                     self.current_process.stdin.write((input_text + '\n').encode())
#                     await self.current_process.stdin.drain()
                    
#         except Exception as e:
#             print(f"Input handling error: {e}")
            
#         return False

#     async def handle_more_input(self, sio, sid):
#         """Handle input for more command"""
#         if self.special_interactive_mode == 'more':
#             await self._show_more_page(sio, sid)

#     async def interrupt_process(self):
#         """Handle Ctrl+C interrupt"""
#         if self.current_process:
#             try:
#                 if self.is_windows:
#                     self.current_process.terminate()
#                 else:
#                     self.current_process.send_signal(signal.SIGINT)
#                 await self.current_process.wait()
#                 self.current_process = None
#                 self.interactive_mode = False
#                 self.special_interactive_mode = None
#                 return True
#             except Exception as e:
#                 print(f"Interrupt error: {e}")
#         elif self.interactive_mode:
#             # Handle interrupting special commands
#             self.interactive_mode = False
#             self.special_interactive_mode = None
#             # Clean up any special state
#             if hasattr(self, 'current_set_p_var'):
#                 delattr(self, 'current_set_p_var')
#             if hasattr(self, 'choice_options'):
#                 delattr(self, 'choice_options')
#             if hasattr(self, 'more_lines'):
#                 delattr(self, 'more_lines')
#                 delattr(self, 'more_position')
#             return True
#         return False

# class SocketIOAgent:
#     def __init__(self):
#         self.sio = socketio.AsyncClient()
#         self.agent = TerminalAgent()
        
#         # Register event handlers
#         self.sio.on('connect', self.on_connect)
#         self.sio.on('disconnect', self.on_disconnect)
#         self.sio.on('terminal_command', self.on_terminal_command)
        
#     async def on_connect(self):
#         print("Connected to server")
#         prompt = await self.agent.get_prompt()
#         shells = self.get_available_shells()
#         await self.sio.emit('agent_shells', {
#             "agent_id": "agent_123", 
#             "shells": shells
#         })
#         await self.sio.emit('terminal_message', {
#             "type": "output",
#             "data": f"Terminal Agent Connected\n{prompt}"
#         })

#     def get_available_shells(self):
#         import shutil
#         possible_shells = [
#             "cmd.exe", "powershell.exe", "pwsh.exe", "bash.exe",
#             "wsl.exe", "wt.exe", "sh.exe", "dash.exe", "git-bash.exe"
#         ]
#         available = []
#         for shell in possible_shells:
#             path = shutil.which(shell)
#             if path:
#                 available.append(shell.replace(".exe", ""))
#         return available
        
#     async def on_disconnect(self):
#         """Handle disconnection from server"""
#         print("Disconnected from server")
        
#     async def on_terminal_command(self, data):
#         """Handle terminal commands from server"""
#         try:
#             message_type = data.get("type")
#             command_data = data.get("data", "")
            
#             if message_type == "get_prompt":
#                 prompt = await self.agent.get_prompt()
#                 await self.sio.emit('terminal_message', {
#                     "type": "output",
#                     "data": prompt
#                 })
            
#             elif message_type == "command":
#                 # Check if we're in interactive mode
#                 if self.agent.interactive_mode:
#                     # Handle input for interactive commands
#                     input_handled = await self.agent.handle_input(command_data)
#                     if input_handled:
#                         # Command completed, send new prompt
#                         prompt = await self.agent.get_prompt()
#                         await self.sio.emit('terminal_message', {
#                             "type": "output",
#                             "data": prompt
#                         })
#                     elif self.agent.special_interactive_mode == 'more':
#                         # Handle more command pagination
#                         await self.agent.handle_more_input(self.sio, self.sio.get_sid())
#                 else:
#                     # Execute new command
#                     if command_data.strip():
#                         await self.agent.execute_command(command_data.strip(), self.sio, self.sio.get_sid())
#                     else:
#                         prompt = await self.agent.get_prompt()
#                         await self.sio.emit('terminal_message', {
#                             "type": "output",
#                             "data": prompt
#                         })

#             elif message_type == "interrupt":
#                 # Handle Ctrl+C
#                 interrupted = await self.agent.interrupt_process()
#                 if interrupted:
#                     prompt = await self.agent.get_prompt()
#                     await self.sio.emit('terminal_message', {
#                         "type": "output",
#                         "data": prompt
#                     })
                    
#         except Exception as e:
#             prompt = await self.agent.get_prompt()
#             await self.sio.emit('terminal_message', {
#                 "type": "output",
#                 "data": f"Error: {e}\n{prompt}"
#             })
    
#     async def connect_to_server(self, url):
#         """Connect to Socket.IO server"""
#         try:
#             await self.sio.connect(url)
#             await self.sio.wait()  # Keep the connection alive
#         except Exception as e:
#             print(f"Connection failed: {e}")

# if __name__ == "__main__":
#     agent_id = "agent_12345"
#     server_url = "http://127.0.0.1:8000"

#     async def run_agent():
#         agent = SocketIOAgent()
#         await agent.connect_to_server(server_url)

#     asyncio.run(run_agent())

import socketio
import asyncio
import subprocess
import threading
import platform
import shutil
import logging
import sys
import os
import signal
import time
from typing import Optional, List
import queue

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RemoteAgent:
    def __init__(self, server_url: str = "http://localhost:8000", agent_id: str = None):
        self.server_url = server_url
        self.agent_id = agent_id or f"agent_{platform.node()}_{int(time.time())}"
        self.sio = socketio.AsyncClient(
            logger=True, 
            engineio_logger=True,
            reconnection=True,
            reconnection_attempts=5,
            reconnection_delay=1
        )
        self.current_process: Optional[subprocess.Popen] = None
        self.current_shell = None
        self.output_thread = None
        self.running = False
        self.connected = False
        
        # Setup event handlers
        self.setup_handlers()
        
        # Detect available shells
        self.available_shells = self.detect_shells()
        logger.info(f"Agent {self.agent_id} detected shells: {self.available_shells}")
    
    def detect_shells(self) -> List[str]:
        """Detect available shells on the system"""
        shells = []
        system = platform.system().lower()
        
        if system == "windows":
            # Check for Windows shells
            if shutil.which("cmd"):
                shells.append("cmd")
            if shutil.which("powershell"):
                shells.append("powershell")
            if shutil.which("pwsh"):  # PowerShell Core
                shells.append("pwsh")
        else:
            # Unix-like systems
            if shutil.which("bash"):
                shells.append("bash")
            if shutil.which("sh"):
                shells.append("sh")
            if shutil.which("zsh"):
                shells.append("zsh")
            if shutil.which("fish"):
                shells.append("fish")
        
        # Ensure we have at least one shell
        if not shells:
            if system == "windows":
                shells.append("cmd")  # Default on Windows
            else:
                shells.append("sh")   # Default on Unix
        
        return shells
    
    def setup_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect():
            logger.info(f"Connected to backend server at {self.server_url}")
            self.connected = True
            # Register with the backend
            await self.register_agent()
        
        @self.sio.event
        async def disconnect():
            logger.info("Disconnected from backend server")
            self.connected = False
            self.cleanup_process()
        
        @self.sio.event
        async def connect_error(data):
            logger.error(f"Connection error: {data}")
        
        @self.sio.event
        async def registration_success(data):
            logger.info(f"Successfully registered with backend as {data['agent_id']}")
        
        @self.sio.event
        async def registration_error(data):
            logger.error(f"Registration failed: {data.get('error', 'Unknown error')}")
        
        @self.sio.event
        async def start_shell_request(data):
            shell = data.get('shell', 'cmd')
            logger.info(f"Received request to start shell: {shell}")
            await self.start_shell(shell)
        
        @self.sio.event
        async def command_input(data):
            command = data.get('command', '')
            await self.execute_command(command)
    
    async def register_agent(self):
        """Register this agent with the backend"""
        try:
            await self.sio.emit('agent_register', {
                'agent_id': self.agent_id,
                'shells': self.available_shells
            })
        except Exception as e:
            logger.error(f"Failed to register agent: {e}")
    
    async def start_shell(self, shell: str):
        """Start a shell subprocess"""
        try:
            # Cleanup existing process
            self.cleanup_process()
            
            # Determine shell command
            if shell == "cmd":
                cmd = ["cmd.exe"]
            elif shell == "powershell":
                cmd = ["powershell.exe", "-NoLogo"]
            elif shell == "pwsh":
                cmd = ["pwsh.exe", "-NoLogo"]
            elif shell == "bash":
                cmd = ["bash", "-i"]
            elif shell == "sh":
                cmd = ["sh", "-i"]
            elif shell == "zsh":
                cmd = ["zsh", "-i"]
            elif shell == "fish":
                cmd = ["fish", "-i"]
            else:
                # Default fallback
                if platform.system().lower() == "windows":
                    cmd = ["cmd.exe"]
                else:
                    cmd = ["sh"]
            
            # Start the process
            logger.info(f"Starting shell process: {' '.join(cmd)}")
            
            if platform.system().lower() == "windows":
                # Windows-specific subprocess creation
                self.current_process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,  # Unbuffered
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:
                # Unix-specific subprocess creation
                self.current_process = subprocess.Popen(
                    cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=0,  # Unbuffered
                    preexec_fn=os.setsid
                )
            
            self.current_shell = shell
            self.running = True
            
            # Start output monitoring thread
            self.output_thread = threading.Thread(
                target=self.monitor_output,
                daemon=True
            )
            self.output_thread.start()
            
            # Notify backend that shell started
            await self.sio.emit('shell_started', {'shell': shell})
            logger.info(f"Shell {shell} started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start shell {shell}: {e}")
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': f"\r\nError starting shell {shell}: {str(e)}\r\n"
                })
    
    def monitor_output(self):
        """Monitor subprocess output in a separate thread"""
        try:
            while self.running and self.current_process and self.current_process.poll() is None:
                try:
                    # Use select on Unix systems for better performance
                    if platform.system().lower() != "windows":
                        import select
                        ready, _, _ = select.select([self.current_process.stdout], [], [], 0.1)
                        if ready:
                            char = self.current_process.stdout.read(1)
                        else:
                            time.sleep(0.01)
                            continue
                    else:
                        # Windows - read character by character
                        char = self.current_process.stdout.read(1)
                    
                    if char:
                        # Send output to backend immediately using thread-safe approach
                        if self.connected:
                            try:
                                # Use asyncio.run_coroutine_threadsafe for thread safety
                                if hasattr(asyncio, '_get_running_loop'):
                                    try:
                                        loop = asyncio._get_running_loop()
                                        asyncio.run_coroutine_threadsafe(
                                            self.sio.emit('command_output', {'output': char}),
                                            loop
                                        )
                                    except RuntimeError:
                                        # No running loop, create new one
                                        asyncio.run(self.sio.emit('command_output', {'output': char}))
                                else:
                                    asyncio.run(self.sio.emit('command_output', {'output': char}))
                            except Exception as e:
                                logger.error(f"Failed to send output: {e}")
                    elif self.current_process.poll() is not None:
                        # Process has terminated
                        break
                    else:
                        # No output available, small delay
                        time.sleep(0.01)
                except Exception as e:
                    logger.error(f"Error reading output: {e}")
                    break
        except Exception as e:
            logger.error(f"Output monitoring error: {e}")
        finally:
            if self.current_process and self.current_process.poll() is not None:
                if self.connected:
                    try:
                        exit_code = self.current_process.returncode
                        exit_message = f"\r\n[Process exited with code {exit_code}]\r\n"
                        asyncio.run(self.sio.emit('command_output', {'output': exit_message}))
                    except Exception as e:
                        logger.error(f"Failed to send exit message: {e}")

    # Also update the execute_command method:
    async def execute_command(self, command: str):
        """Execute command in the current shell"""
        if not self.current_process or self.current_process.poll() is not None:
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': "\r\nNo active shell. Please start a shell first.\r\n"
                })
            return

        try:
            # Handle Ctrl+C (interrupt signal)
            if command == '\u0003':
                logger.info("Received Ctrl+C signal")
                if platform.system().lower() == "windows":
                    try:
                        self.current_process.send_signal(signal.CTRL_C_EVENT)
                    except:
                        self.current_process.terminate()
                else:
                    try:
                        os.killpg(os.getpgid(self.current_process.pid), signal.SIGINT)
                    except:
                        self.current_process.terminate()
                return

            # Write command to subprocess stdin
            if self.current_process.stdin:
                self.current_process.stdin.write(command)
                self.current_process.stdin.flush()
                logger.debug(f"Sent command to shell: {repr(command)}")

        except BrokenPipeError:
            logger.error("Shell process has terminated")
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': "\r\nShell process has terminated. Please start a new shell.\r\n"
                })
        except Exception as e:
            logger.error(f"Error executing command: {e}")
            if self.connected:
                await self.sio.emit('command_output', {
                    'output': f"\r\nError executing command: {str(e)}\r\n"
                })
    
    def cleanup_process(self):
        """Cleanup current subprocess"""
        self.running = False
        
        if self.current_process:
            try:
                logger.info("Terminating current shell process")
                
                if platform.system().lower() == "windows":
                    # Terminate Windows process group
                    self.current_process.terminate()
                else:
                    # Terminate Unix process group
                    try:
                        os.killpg(os.getpgid(self.current_process.pid), signal.SIGTERM)
                    except:
                        self.current_process.terminate()
                
                # Wait for process to terminate
                try:
                    self.current_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning("Process didn't terminate gracefully, forcing kill")
                    if platform.system().lower() == "windows":
                        self.current_process.kill()
                    else:
                        try:
                            os.killpg(os.getpgid(self.current_process.pid), signal.SIGKILL)
                        except:
                            self.current_process.kill()
                
            except Exception as e:
                logger.error(f"Error cleaning up process: {e}")
            finally:
                self.current_process = None
                self.current_shell = None
        
        # Wait for output thread to finish
        if self.output_thread and self.output_thread.is_alive():
            self.output_thread.join(timeout=2)
    
    async def connect(self):
        """Connect to the backend server"""
        try:
            logger.info(f"Attempting to connect to {self.server_url}")
            await self.sio.connect(self.server_url, wait_timeout=10)
            logger.info("Successfully connected to backend")
        except Exception as e:
            logger.error(f"Failed to connect to backend: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from the backend server"""
        try:
            self.cleanup_process()
            await self.sio.disconnect()
            logger.info("Disconnected from backend")
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
    
    async def run(self):
        """Main run loop for the agent"""
        try:
            await self.connect()
            
            # Keep the agent running
            while True:
                await asyncio.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("Received interrupt signal, shutting down...")
        except Exception as e:
            logger.error(f"Agent error: {e}")
        finally:
            await self.disconnect()


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Remote Command Execution Agent")
    parser.add_argument(
        "--server", 
        default="http://localhost:8000", 
        help="Backend server URL (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--agent-id", 
        help="Custom agent ID (default: auto-generated)"
    )
    
    args = parser.parse_args()
    
    # Create and run agent
    agent = RemoteAgent(server_url=args.server, agent_id=args.agent_id)
    
    try:
        await agent.run()
    except Exception as e:
        logger.error(f"Failed to run agent: {e}")
        sys.exit(1)


if __name__ == "__main__":
    if platform.system().lower() == "windows":
        # Set up Windows event loop policy
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(main())