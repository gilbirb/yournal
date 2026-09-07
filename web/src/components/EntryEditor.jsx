import { useEffect, useState } from "react";
import { getEntry } from "../api/entries";
import { saveEntry } from "../api/entries";

export default function EntryEditor({ dateKey, onSaved }) {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getEntry(dateKey)
      .then((entry) => {
        if (cancelled) return;
        setDraft(entry?.content ?? '');
        setStatus('idle');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => { cancelled = true; };
  }, [dateKey]);

  async function handleSave() {
    setStatus('saving');
    await saveEntry(dateKey, { content: draft });
    setStatus('idle');
    onSaved(dateKey);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p>Journal for {dateKey}</p>
      <textarea className="border-indigo-400 border" value={draft} onChange={(e) => setDraft(e.target.value)}/>
      <button className="w-10 h-10 bg-white" onClick={handleSave} disabled={status === 'saving'}>Save</button>
      <p>Status: {status}</p>
    </div>
  );
}