import { usePreferences } from '@/contexts/preferences-context';

export function useColorScheme() {
  const { isDark } = usePreferences();
  return isDark ? 'dark' : 'light';
}
