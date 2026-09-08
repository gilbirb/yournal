import { useEffect, useState } from 'react';
import CalendarView from './components/CalendarView';
import { listEntries } from './api/entries';
import { monthRange, toDateKey } from './lib/date';
import './App.css';
import EntryEditor from './components/EntryEditor';

function App() {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [entryKeys, setEntryKeys] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    const { from, to } = monthRange(month);

    listEntries(from, to)
      .then((entries) => {
        if (!cancelled) setEntryKeys(new Set(entries.map((e) => e.date)));
      })
      .catch(console.error);

    return () => { cancelled = true; }; 
  }, [month]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>yournal</h1>
        <span className="tagline">a line a day</span>
      </header>

      <div className="layout">
        <CalendarView
          entryKeys={entryKeys}
          selected={selected}
          onSelect={(day) => day && setSelected(day)}
          month={month}
          onMonthChange={setMonth}
        />
        <EntryEditor
          dateKey={toDateKey(selected)}
          onSaved={(key) => setEntryKeys((prev) => new Set(prev).add(key))}
          onCleared={(key) => setEntryKeys((prev) => {const next = new Set(prev); next.delete(key); return next;})}
        />
      </div>
    </div>
  )
}

export default App
