export const themeStorageKey = 'theme';

export type ThemeChoice = 'light' | 'dark';

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

export function currentTheme(): ThemeChoice {
  const stored = localStorage.getItem(themeStorageKey);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return systemPrefersDark() ? 'dark' : 'light';
}

export function applyTheme(theme: ThemeChoice, persist: boolean): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  if (persist) {
    localStorage.setItem(themeStorageKey, theme);
  }
}
