import { useEffect, useState } from "react";
import { clearEntry, getEntry, saveEntry } from "../api/entries";
import { formatDateKey } from "../lib/date";

const STATUS_TEXT = {
  loading: 'Loading...',
  saving: 'Saving...',
  clearing: 'Clearing...',
  saved: 'Saved',
  idle: '',
};

export default function EntryEditor({ dateKey, onSaved, onCleared }) {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');

  function fail(action, err) {
    setErrorMsg(`Couldn't ${action}: ${err.message}`);
    setStatus('error');
  }

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getEntry(dateKey)
      .then((entry) => {
        if (cancelled) return;
        setDraft(entry?.content ?? '');
        setStatus('idle');
      })
      .catch((err) => !cancelled && fail('load', err));
    return () => { cancelled = true; };
  }, [dateKey]);

  async function handleSave() {
    setStatus('saving');
    try {
      await saveEntry(dateKey, { content: draft });
      setStatus('saved');
      onSaved(dateKey);
    } catch (err) {
      fail('save', err);
    }
  }

  async function handleClear() {
    setStatus('clearing');
    try {
      await clearEntry(dateKey);
      setDraft('');
      setStatus('saved');
      onCleared(dateKey);
    } catch (err) {
      fail('clear', err);
    }
  }

  const busySave = status === 'loading' || status === 'saving';
  const busyClear = status === 'loading' || status === 'clearing';

  return (
    <section className="card editor">
      <div className="editor-head">
        <h2 className="editor-date">{formatDateKey(dateKey)}</h2>
        <p className="editor-meta" data-status={status}>{status === 'error' ? errorMsg : STATUS_TEXT[status]}</p>
      </div>

      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setStatus('idle');
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder="How was your day?"
        spellCheck={false}
        disabled={status === 'loading'}
      />

      <div className="editor-foot">
        <span className="hint">Ctrl + Enter to save</span>
        <div className="btn-box">
          <button className="btn btn-clear" onClick={handleClear} disabled={busyClear}>
            Clear 
          </button>
          <button className="btn" onClick={handleSave} disabled={busySave}>
            Save
          </button>
        </div>
      </div>
    </section>
  );
}
