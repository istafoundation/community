import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ista_theme_mode';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PreferencesContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const THEME_MODES = [
  { label: 'System', value: 'system' as const },
  { label: 'Light', value: 'light' as const },
  { label: 'Dark', value: 'dark' as const },
];

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useNativeColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme mode on mount
  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && ['system', 'light', 'dark'].includes(saved)) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error('[PreferencesContext] Failed to load theme mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.error('[PreferencesContext] Failed to save theme mode:', error);
    }
  };

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
        isLoading,
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
