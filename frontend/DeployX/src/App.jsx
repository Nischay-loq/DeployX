import { useState } from 'react';

function App() {
  const [response, setResponse] = useState('');

  const sendCommand = async () => {
    try {
      const res = await fetch('http://localhost:3000/send-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: '101',
          command: 'echo Hello from DeployX',
        }),
      });

      const data = await res.json();
      setResponse(data.output || 'Command sent successfully.');
    } catch (error) {
      console.error(error);
      setResponse('Failed to send command.');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>DeployX Control Panel</h1>
      <button onClick={sendCommand}>Send Command</button>
      <p>{response}</p>
    </div>
  );
}

export default App;
