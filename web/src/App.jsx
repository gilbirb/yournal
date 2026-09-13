import { useSession } from "./hooks/useSession";
import Journal from "./components/Journal";
import LoginForm from "./components/LoginForm";
import './App.css';

function App() {
  const session = useSession();

  if (session === undefined) return null;      // still checking
  if (session === null) return <LoginForm />;
  return <Journal />;
}

export default App;