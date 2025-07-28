import React, { useState } from 'react';
import '../css/Hero.css'; // Make sure this file exists

function Hero() {
  const [response, setResponse] = useState('');
  const [command, setCommand] = useState('');

  const sendCommand = async () => {
    try {
      const res = await fetch('http://localhost:3000/send-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: '101',
          command: command,
        }),
      });

      const data = await res.json();
      setResponse(data.output || 'Command sent successfully.');
      setCommand(''); // Clear the textbox
    } catch (error) {
      console.error(error);
      setResponse('Failed to send command.');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>DeployX Control Panel</h1>
      <input
        type="text"
        value={command}
        onChange={e => setCommand(e.target.value)}
        placeholder="Enter command"
        style={{ marginRight: 10, padding: 5, width: 300 }}
      />
      <button onClick={sendCommand}>Send Command</button>
      <div>
        <strong>Output:</strong>
        <pre>{response}</pre>
      </div>
    </div>
  );
}

export default Hero;