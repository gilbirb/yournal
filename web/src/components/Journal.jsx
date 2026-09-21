import { useEffect, useState } from 'react';
import CalendarView from './CalendarView';
import ThemeToggle from './ThemeToggle';
import EntryEditor from './EntryEditor';
import SearchPanel from './SearchPanel';
import { listEntries } from '../api/entries';
import { supabase } from '../api/supabase';
import { fromDateKey, monthRange, toDateKey } from '../lib/date';

export default function Journal() {
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

  // a search hit has to move both the editor and the visible month
  function jumpTo(dateKey) {
    const day = fromDateKey(dateKey);
    setSelected(day);
    setMonth(day);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>yournal</h1>
        <span className="tagline">a line a day</span>
        <ThemeToggle />
        <button className="btn btn-clear btn-signout" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <div className="layout">
        <div className="sidebar">
          <SearchPanel onPick={jumpTo} selectedKey={toDateKey(selected)} />
          <CalendarView
            entryKeys={entryKeys}
            selected={selected}
            onSelect={(day) => day && setSelected(day)}
            month={month}
            onMonthChange={setMonth}
          />
        </div>
        <EntryEditor
          key={toDateKey(selected)}
          dateKey={toDateKey(selected)}
          onSaved={(key) => setEntryKeys((prev) => new Set(prev).add(key))}
          onCleared={(key) => setEntryKeys((prev) => {const next = new Set(prev); next.delete(key); return next;})}
        />
      </div>
    </div>
  )
}

