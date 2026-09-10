import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemeMode = 'light' | 'dark';

type AppThemeContextValue = {
  colorScheme: ThemeMode;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );

  const toggleThemeMode = useCallback(() => {
    setThemeMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      colorScheme: themeMode,
      themeMode,
      setThemeMode,
      toggleThemeMode,
    }),
    [themeMode, toggleThemeMode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
