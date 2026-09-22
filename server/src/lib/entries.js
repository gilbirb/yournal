
export const isValidDateKey = (value) => {
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

export const validatePlan = (raw) => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new TypeError('Expected a plain object');
  }

  const { terms, from, to } = raw;

  const list = Array.isArray(terms) ? terms : [];

  const cleanTerms = [...new Set(
    list
      .filter((t) => typeof t === 'string')
      .map((t) => t.toLowerCase().replace(/[^\p{L}\p{N}']/gu, ''))
      .filter((t) => t.length > 0 && t.length <= 40 && t !== 'or'),
  )].slice(0, 8);

  const cleanDate = (value) => (isValidDateKey(value) ? value : undefined);

  let start = cleanDate(from);
  let end = cleanDate(to);

  if (start && end && start > end) {
    [start, end] = [end, start];
  }

  if (cleanTerms.length === 0 && !start && !end) {
    throw new Error('Plan has nothing to search for');
  }

  return {
    terms: cleanTerms,
    ...(start && { from: start }),
    ...(end && { to: end }),
  };
};