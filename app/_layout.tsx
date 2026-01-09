import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { CategoryProvider } from '@/contexts/category-context';
import { ChatProvider } from '@/contexts/chat-context';
import { PreferencesProvider, usePreferences } from '@/contexts/preferences-context';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { UpdateDownloader } from '@/components/UpdateDownloader';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables');
}

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { isDark } = usePreferences();
  
  // Check for app updates on launch
  const { showDownloader, closeDownloader, updateInfo } = useVersionCheck();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen 
          name="article" 
          options={{ 
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }} 
        />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      {/* In-app update downloader */}
      {updateInfo && (
        <UpdateDownloader
          visible={showDownloader}
          updateUrl={updateInfo.downloadUrl}
          version={updateInfo.version}
          onClose={closeDownloader}
        />
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <PreferencesProvider>
          <CategoryProvider>
            <ChatProvider>
              <RootLayoutNav />
            </ChatProvider>
          </CategoryProvider>
        </PreferencesProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
