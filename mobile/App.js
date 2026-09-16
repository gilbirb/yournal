import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSession } from './src/hooks/useSession';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';

export default function App() {
  const session = useSession();

  // undefined = AsyncStorage hasn't been read yet, so we don't know either way
  if (session === undefined) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {session === null ? <LoginScreen /> : <HomeScreen />}
    </SafeAreaProvider>
  );
}
