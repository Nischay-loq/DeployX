import { useState, useEffect } from 'react';
import Login from './components/jsx/login';
import Signup from './components/jsx/signup';
import Terminal from './components/jsx/Terminal';
import './App.css';

function App() {
  const [view, setView] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // This runs once on page load to check for token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true); // Auto-login if token exists (i.e. Remember Me was checked)
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Remote Terminal</h1>
      </header>
      <main>
        {isLoggedIn ? (
          <Terminal />
        ) : view === 'signup' ? (
          <>
            <Signup onSignupSuccess={() => setView('login')} />
            <p>
              Already have an account?{' '}
              <button onClick={() => setView('login')}>Login</button>
            </p>
          </>
        ) : (
          <>
            <Login onLoginSuccess={handleLoginSuccess} />
            <p>
              Don't have an account?{' '}
              <button onClick={() => setView('signup')}>Signup</button>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
