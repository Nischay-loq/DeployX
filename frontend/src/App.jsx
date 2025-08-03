//login required everytime
// import { useState, useEffect } from 'react';
// import Login from './components/jsx/login';
// import Signup from './components/jsx/signup';
// import Terminal from './components/jsx/Terminal';
// import './App.css';

// function App() {
//   const [view, setView] = useState('login');
//   const [isLoggedIn, setIsLoggedIn] = useState(false);

//   // Remove token on app load to force re-login
//   useEffect(() => {
//     localStorage.removeItem('token');
//   }, []);

//   const handleLoginSuccess = () => {
//     setIsLoggedIn(true);
//   };

//   return (
//     <div className="App">
//       <header className="App-header">
//         <h1>Remote Terminal</h1>
//       </header>
//       <main>
//         {isLoggedIn ? (
//           <Terminal />
//         ) : view === 'signup' ? (
//           <>
//             <Signup onSignupSuccess={() => setView('login')} />
//             <p>
//               Already have an account?{' '}
//               <button onClick={() => setView('login')}>Login</button>
//             </p>
//           </>
//         ) : (
//           <>
//             <Login onLoginSuccess={handleLoginSuccess} />
//             <p>
//               Don't have an account?{' '}
//               <button onClick={() => setView('signup')}>Signup</button>
//             </p>
//           </>
//         )}
//       </main>
//     </div>
//   );
// }

// export default App;





//every time login not required 
import { useState } from 'react';
import Login from './components/jsx/login';
import Signup from './components/jsx/signup';
import Terminal from './components/jsx/Terminal';
import './App.css';

function App() {
  const [view, setView] = useState('login');

  const isAuthenticated = () => !!localStorage.getItem('token');

  return (
    <div className="App">
      <header className="App-header">
        <h1>Remote Terminal</h1>
      </header>
      <main>
        {isAuthenticated() ? (
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
            <Login onLoginSuccess={() => window.location.reload()} />
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
