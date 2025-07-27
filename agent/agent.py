import socketio
import subprocess
import uuid

sio = socketio.Client()
agent_id = 101
# agent_id = str(uuid.uuid4())  # or hardcode if you want

@sio.event
def connect():
    print("Connected to server")
    sio.emit('register_agent', agent_id)

@sio.event
def run_command(command):
    print(f"Running command: {command}")
    try:
        output = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT, timeout=30)
        result = output.decode()
    except subprocess.CalledProcessError as e:
        result = e.output.decode()
    except Exception as e:
        result = str(e)

    sio.emit('command_output', {'agentId': agent_id, 'output': result})

@sio.event
def disconnect():
    print("Disconnected from server")

sio.connect('http://localhost:3000')
sio.wait()
