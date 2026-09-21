import { useEffect, useState } from 'react';
import { searchEntries } from '../api/entries';
import { formatDateKey } from '../lib/date';
import { makeSnippet } from '../lib/text';

const MIN_LENGTH = 2; // the API rejects anything shorter

export default function SearchPanel({ onPick, selectedKey }) {
  const [query, setQuery] = useState('');
  // results carry the query they belong to, so a stale response can't render
  const [results, setResults] = useState(null);

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_LENGTH;

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    // wait for a pause in typing so every keystroke isn't a request
    const timer = setTimeout(() => {
      searchEntries(trimmed)
        .then((entries) => !cancelled && setResults({ q: trimmed, entries }))
        .catch((err) => !cancelled && setResults({ q: trimmed, error: err.message }));
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, active]);

  // anything not matching the current query is stale, including old results
  // left behind when the box is cleared
  const current = active && results?.q === trimmed ? results : null;

  return (
    <section className="card search">
      <div className="search-field">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries"
          aria-label="Search entries"
          maxLength={100}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {active && !current && <p className="search-note">Searching...</p>}

      {current?.error && <p className="search-note search-error">{current.error}</p>}

      {current?.entries?.length === 0 && (
        <p className="search-note">No entries match "{trimmed}".</p>
      )}

      {current?.entries?.length > 0 && (
        <>
          <p className="search-note">
            {current.entries.length} {current.entries.length === 1 ? 'entry' : 'entries'}
          </p>
          <ul className="search-results">
            {current.entries.map((entry) => (
              <li key={entry.date}>
                <button
                  type="button"
                  className={`search-result${entry.date === selectedKey ? ' is-selected' : ''}`}
                  onClick={() => onPick(entry.date)}
                >
                  <span className="search-result-date">{formatDateKey(entry.date)}</span>
                  <span className="search-result-snippet">
                    {makeSnippet(entry.content, trimmed)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
