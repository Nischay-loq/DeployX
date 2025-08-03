import React from 'react';
import Terminal from './components/jsx/Terminal';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Remote Terminal</h1>
      </header>
      <main>
        <Terminal />
      </main>
    </div>
  );
}

export default App;