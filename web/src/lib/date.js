
export const toDateKey = (date) => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// "2026-09-07" -> "Monday, 7 September 2026"
export const formatDateKey = (dateKey, locale = undefined) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const monthRange = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const from = toDateKey(new Date(year, month, 1));
  const to = toDateKey(new Date(year, month + 1, 0));
  return { from: from, to: to };
}
// "2026-09-21" -> Date at local midnight (never new Date(key), which parses as UTC)
export const fromDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// "2026-09-14" -> "14 Sep 2026"
export const formatShortDateKey = (dateKey, locale = undefined) =>
  fromDateKey(dateKey).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// the date range an AI search was limited to, or null if it had none
export const formatDateRange = (from, to) => {
  if (from && to) {
    return from === to
      ? formatShortDateKey(from)
      : `${formatShortDateKey(from)} to ${formatShortDateKey(to)}`;
  }
  if (from) return `from ${formatShortDateKey(from)}`;
  if (to) return `until ${formatShortDateKey(to)}`;
  return null;
};
