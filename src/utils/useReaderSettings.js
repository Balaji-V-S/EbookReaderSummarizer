import { useState, useEffect } from 'react';

const STORAGE_KEY = 'reader_appearance';

const defaults = {
  theme: 'light',
  fontSize: 100,
  fontFamily: 'Inter, sans-serif',
  lineHeight: '1.8',
  maxWidth: '800px',
  flow: 'scrolled',
};

export const useReaderSettings = () => {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Sync dark class on <html> for Tailwind dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const update = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return { settings, update };
};
