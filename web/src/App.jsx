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
    <>
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
      />
    </>
  )
}

export default App
