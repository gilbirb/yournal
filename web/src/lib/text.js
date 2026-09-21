// A short window of content around the first word that looks like a hit, so a
// result list shows why it matched instead of just the first line.
export const makeSnippet = (content, query, length = 120) => {
  const text = content.replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;

  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const lower = text.toLowerCase();
  const hit = words.map((w) => lower.indexOf(w)).filter((i) => i !== -1);
  const at = hit.length ? Math.min(...hit) : 0;

  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, start + length);

  return `${start > 0 ? '...' : ''}${text.slice(start, end).trim()}${end < text.length ? '...' : ''}`;
};
