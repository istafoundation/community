import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Warm up the browser for Android devices
const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  useWarmUpBrowser();
  
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const onSignInPress = useCallback(async () => {
    if (!isLoaded || !emailAddress || !password) return;

    setIsLoading(true);
    setError('');

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace('/(tabs)');
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
        setError('Sign in incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, password, signIn, setActive, router]);

  const onGoogleSignIn = useCallback(async () => {
    if (!isLoaded) return;

    setIsGoogleLoading(true);
    setError('');

    try {
      // Start the authentication process using the proper redirect URI
      const { createdSessionId, setActive: setActiveSession, signIn: ssoSignIn, signUp: ssoSignUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Linking.createURL('/(auth)/sign-in', { scheme: 'istacommunity' }),
      });

      // If sign in was successful, set the active session
      if (createdSessionId) {
        await setActiveSession!({ session: createdSessionId });
        router.replace('/(tabs)');
        return;
      }

      // Handle sign-up case (new user via OAuth)
      if (ssoSignUp?.createdSessionId) {
        await setActive({ session: ssoSignUp.createdSessionId });
        router.replace('/(auth)/username');
        return;
      }

      // Handle sign-in case (existing user)
      if (ssoSignIn?.createdSessionId) {
        await setActive({ session: ssoSignIn.createdSessionId });
        router.replace('/(tabs)');
        return;
      }

      // Handle "missing_requirements" status - this happens when user needs to complete signup
      // (e.g., set username after OAuth)
      if (ssoSignUp?.status === 'missing_requirements') {
        // The user authenticated with Google but needs additional info (like username)
        // We need to create a session first, then redirect to username selection
        console.log('Missing fields:', ssoSignUp.missingFields);
        
        // Try to get any available session
        if (ssoSignUp.createdSessionId) {
          await setActive({ session: ssoSignUp.createdSessionId });
        }
        router.replace('/(auth)/username');
        return;
      }

      // Handle sign-in with missing requirements
      if (ssoSignIn?.status === 'needs_first_factor' || ssoSignIn?.status === 'needs_second_factor') {
        setError('Additional verification is required. Please use email sign-in.');
        return;
      }

      // Log for debugging
      console.log('SSO Result - signUp:', ssoSignUp?.status, 'signIn:', ssoSignIn?.status);
      setError('Sign in incomplete. Please try again.');
    } catch (err: any) {
      console.error('Google OAuth error:', JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Google sign in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isLoaded, startSSOFlow, router, setActive]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={40} color="#fff" />
            </View>
            <Text style={[styles.title, isDark && styles.textLight]}>Welcome Back</Text>
            <Text style={[styles.subtitle, isDark && styles.textMuted]}>
              Sign in to continue to ISTA Community
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ff3b30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Google Sign In */}
          <Pressable
            style={[styles.googleButton, isDark && styles.googleButtonDark, isGoogleLoading && styles.buttonDisabled]}
            onPress={onGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={isDark ? '#fff' : '#000'} />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color={isDark ? '#fff' : '#000'} />
                <Text style={[styles.googleButtonText, isDark && styles.textLight]}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
            <Text style={[styles.dividerText, isDark && styles.textMuted]}>or</Text>
            <View style={[styles.dividerLine, isDark && styles.dividerLineDark]} />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDark && styles.textLight]}>Email</Text>
            <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
              <Ionicons name="mail-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Enter your email"
                placeholderTextColor="#8e8e93"
                value={emailAddress}
                onChangeText={setEmailAddress}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDark && styles.textLight]}>Password</Text>
            <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
              <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Enter your password"
                placeholderTextColor="#8e8e93"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#8e8e93" 
                />
              </Pressable>
            </View>
          </View>

          {/* Sign In Button */}
          <Pressable
            style={[styles.signInButton, (!emailAddress || !password || isLoading) && styles.buttonDisabled]}
            onPress={onSignInPress}
            disabled={!emailAddress || !password || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Forgot Password Link */}
          <Pressable 
            style={styles.forgotPasswordContainer}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </Pressable>

          {/* Sign Up Link - use replace to prevent stacking */}
          <View style={styles.signUpContainer}>
            <Text style={[styles.signUpText, isDark && styles.textMuted]}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/sign-up')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#8e8e93',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff3b3015',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    flex: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButtonDark: {
    backgroundColor: '#1c1c1e',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5e5',
  },
  dividerLineDark: {
    backgroundColor: '#333',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#8e8e93',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapperDark: {
    backgroundColor: '#1c1c1e',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputDark: {
    color: '#fff',
  },
  eyeButton: {
    padding: 8,
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signUpText: {
    fontSize: 15,
    color: '#666',
  },
  signUpLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});
