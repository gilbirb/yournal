
export const toDateKey = (date) => {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const monthRange = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const from = toDateKey(new Date(year, month, 1));
  const to = toDateKey(new Date(year, month + 1, 0));
  return { from: from, to: to };
}