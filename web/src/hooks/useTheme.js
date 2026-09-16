import { useEffect, useState } from 'react';

const KEY = 'yournal-theme';

function readStored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // private browsing can throw
  }
}

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(() => readStored() ?? systemTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // not fatal, the choice just won't survive a reload
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
