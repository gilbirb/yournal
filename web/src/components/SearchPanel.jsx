import { useEffect, useId, useRef, useState } from 'react';
import { askEntries, searchEntries } from '../api/entries';
import { formatDateKey, formatDateRange, toDateKey } from '../lib/date';
import { makeSnippet } from '../lib/text';

const MIN_LENGTH = 2; // the API rejects anything shorter
const MIN_QUESTION = 3;

const NOTICES = {
  limited: "You've used today's AI searches, so these are plain keyword results.",
  fallback: 'AI search is unavailable right now, so these are plain keyword results.',
};

export default function SearchPanel({ onPick, selectedKey }) {
  const [aiMode, setAiMode] = useState(false);
  const [query, setQuery] = useState('');
  // results carry the query they belong to, so a stale response can't render
  const [results, setResults] = useState(null);
  const [asking, setAsking] = useState(false);
  const askId = useRef(0);
  const infoId = useId();

  const trimmed = query.trim();
  const keywordActive = !aiMode && trimmed.length >= MIN_LENGTH;

  // keyword mode: search as you type, after a short pause
  useEffect(() => {
    if (!keywordActive) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      searchEntries(trimmed)
        .then((entries) => !cancelled && setResults({ kind: 'keyword', q: trimmed, entries }))
        .catch((err) => !cancelled && setResults({ kind: 'keyword', q: trimmed, error: err.message }));
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, keywordActive]);

  // AI mode: only on Enter, since every question spends daily quota
  async function handleAsk(e) {
    e.preventDefault(); // always: in keyword mode Enter would otherwise reload the page
    if (!aiMode || trimmed.length < MIN_QUESTION || asking) return;

    const id = ++askId.current;
    const question = trimmed;
    setAsking(true);
    try {
      const res = await askEntries(question, toDateKey(new Date()));
      if (id === askId.current) setResults({ kind: 'ai', q: question, ...res });
    } catch (err) {
      if (id === askId.current) setResults({ kind: 'ai', q: question, error: err.message });
    } finally {
      if (id === askId.current) setAsking(false);
    }
  }

  function toggleMode() {
    askId.current++; // drop any answer still on its way
    setAsking(false);
    setResults(null);
    setAiMode((on) => !on);
  }

  // keyword results must match the box exactly; an AI answer stays up while
  // the question is edited, until the next one is submitted
  const current = aiMode
    ? results?.kind === 'ai' ? results : null
    : keywordActive && results?.kind === 'keyword' && results.q === trimmed ? results : null;

  const snippetQuery = current?.plan?.terms?.length ? current.plan.terms.join(' ') : trimmed;
  const range = current?.plan ? formatDateRange(current.plan.from, current.plan.to) : null;

  return (
    <section className="card search">
      <div className="search-head">
        <span className="search-title">{aiMode ? 'Ask your journal' : 'Search'}</span>

        <span className="info">
          <button type="button" className="info-btn" aria-label="About AI mode" aria-describedby={infoId}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <circle cx="8" cy="8" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="4.9" r="0.95" fill="currentColor" />
              <path d="M8 7.2v4.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <span role="tooltip" id={infoId} className="info-tip">
            <strong>AI mode</strong> lets you ask in plain words, like "what did I do last
            week?" or "when did I hurt my ankle?". An AI turns your question into search words
            and dates, then your journal is searched as usual.
            <br /><br />
            Press Enter to ask. Only your question is sent to Google Gemini, never your
            entries.
            <br /><br />
            <strong>Daily limit:</strong> AI questions are limited per account each day. Once
            you reach the limit, you'll get plain keyword results instead until it resets the
            next day.
          </span>
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={aiMode}
          className="ai-switch"
          onClick={toggleMode}
        >
          <span className="ai-switch-label">AI</span>
          <span className="ai-switch-track" aria-hidden="true">
            <span className="ai-switch-thumb" />
          </span>
        </button>
      </div>

      <form className="search-field" onSubmit={handleAsk}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={aiMode ? 'When did I last go to the beach?' : 'Search entries'}
          aria-label={aiMode ? 'Ask a question about your journal' : 'Search entries'}
          maxLength={aiMode ? 300 : 100}
          enterKeyHint={aiMode ? 'search' : undefined}
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
      </form>

      {(asking || (keywordActive && !current)) && (
        <p className="search-note">{asking ? 'Thinking...' : 'Searching...'}</p>
      )}

      {!asking && current?.error && <p className="search-note search-error">{current.error}</p>}

      {!asking && current?.entries && (
        <>
          {NOTICES[current.mode] && <p className="search-notice">{NOTICES[current.mode]}</p>}

          {current.mode === 'ai' && (
            <p className="search-plan">
              {current.plan.terms.length > 0
                ? <>Looked for <strong>{current.plan.terms.join(', ')}</strong></>
                : 'Every entry'}
              {range && <> · {range}</>}
            </p>
          )}

          {current.entries.length === 0 ? (
            <p className="search-note">
              {current.kind === 'ai' ? 'Nothing matched that question.' : `No entries match "${trimmed}".`}
            </p>
          ) : (
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
                        {makeSnippet(entry.content, snippetQuery)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
