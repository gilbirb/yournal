import { useState } from 'react';
import { useSession } from "./hooks/useSession";
import Journal from "./components/Journal";
import LoginForm from "./components/LoginForm";
import SignUpForm from "./components/SignUpForm";
import ThemeToggle from "./components/ThemeToggle";
import './App.css';

function App() {
  const session = useSession();
  const [authView, setAuthView] = useState('signin');

  if (session === undefined) return null;      // still checking

  if (session === null) {
    return (
      <>
        <div className="floating-toggle">
          <ThemeToggle />
        </div>
        {authView === 'signin'
          ? <LoginForm onSwitchToSignUp={() => setAuthView('signup')} />
          : <SignUpForm onSwitchToSignIn={() => setAuthView('signin')} />}
      </>
    );
  }

  return <Journal />;
}

export default App;
