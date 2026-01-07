import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PreferencesContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const THEME_MODES = [
  { label: 'System', value: 'system' as const },
  { label: 'Light', value: 'light' as const },
  { label: 'Dark', value: 'dark' as const },
];

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useNativeColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const isDark = 
    themeMode === 'system' 
      ? systemColorScheme === 'dark' 
      : themeMode === 'dark';

  return (
    <PreferencesContext.Provider
      value={{
        themeMode,
        setThemeMode,
        isDark,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}
