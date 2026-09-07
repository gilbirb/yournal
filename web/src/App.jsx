import { useEffect, useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import { getEntry, saveEntry } from './api/entries'

function App() {
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const test = async () => {
      const newEntry = await getEntry('2026-09-05');
      setEntry(newEntry);
      console.log(newEntry);
    }
    test();
  }, []);

  return (
    <>
      <div>
        {entry?.content}
      </div>
    </>
  )
}

export default App
