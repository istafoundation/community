import { useAuth, useUser } from '@clerk/clerk-expo';
import { Redirect, Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // If user is signed in but doesn't have a username, redirect to username selection
  if (isSignedIn && !user?.username) {
    return <Redirect href="/(auth)/username" />;
  }

  // If user is fully signed in with username, redirect to main app
  if (isSignedIn && user?.username) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: isDark ? '#000' : '#f2f2f7' },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="username" />
      <Stack.Screen name="forgot-password" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
