import React from 'react';
import Terminal from './components/jsx/Terminal';

function App() {
    const agentId = 'agent-123'; // replace with dynamic agent ID if needed

    return (
        <div className="App">
            <h1>DeployX Terminal</h1>
            <Terminal agentId={agentId} />
        </div>
    );
}

export default App;