import { useSignUp, useSSO } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
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

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  useWarmUpBrowser();
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Resend cooldown state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (pendingVerification) {
      setCanResend(true);
    }
  }, [resendCooldown, pendingVerification]);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(45);
    setCanResend(false);
  }, []);

  const onSignUpPress = useCallback(async () => {
    if (!isLoaded || !emailAddress || !password) return;

    setIsLoading(true);
    setError('');

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
      startResendCooldown(); // Start cooldown after first OTP is sent
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, password, signUp, startResendCooldown]);

  const onResendCode = useCallback(async () => {
    if (!canResend || !signUp) return;
    
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      startResendCooldown();
      setError('');
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Failed to resend code');
    }
  }, [canResend, signUp, startResendCooldown]);

  const onVerifyPress = useCallback(async () => {
    if (!isLoaded || !code || !signUp) return;

    setIsLoading(true);
    setError('');

    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });

      console.log('Verification result:', signUpAttempt.status);

      if (signUpAttempt.status === 'complete') {
        // Email verified and signup complete - set session and go to username
        await setActive({ session: signUpAttempt.createdSessionId });
        router.replace('/(auth)/username');
      } else if (signUpAttempt.status === 'missing_requirements') {
        // Email verified but missing username - go to username selection
        // The session might not be created yet, but we can still navigate
        if (signUpAttempt.createdSessionId) {
          await setActive({ session: signUpAttempt.createdSessionId });
        }
        router.replace('/(auth)/username');
      } else {
        console.error('Unexpected status:', JSON.stringify(signUpAttempt, null, 2));
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, code, signUp, setActive, router]);

  const onGoogleSignUp = useCallback(async () => {
    if (!isLoaded) return;

    setIsGoogleLoading(true);
    setError('');

    try {
      // Start the authentication process using the proper redirect URI
      const { createdSessionId, setActive: setActiveSession, signUp: ssoSignUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      // If we already have a session, activate it and navigate to username selection
      if (createdSessionId) {
        await setActiveSession!({ session: createdSessionId });
        router.replace('/(auth)/username');
        return;
      }

      // Handle sign-up from OAuth
      if (ssoSignUp?.createdSessionId) {
        await setActive({ session: ssoSignUp.createdSessionId });
        router.replace('/(auth)/username');
        return;
      }

      // Handle "missing_requirements" status - user needs to complete signup (set username)
      if (ssoSignUp?.status === 'missing_requirements') {
        console.log('Missing fields:', ssoSignUp.missingFields);
        
        // Try to get any available session
        if (ssoSignUp.createdSessionId) {
          await setActive({ session: ssoSignUp.createdSessionId });
        }
        router.replace('/(auth)/username');
        return;
      }

      // Log for debugging
      console.log('SSO SignUp status:', ssoSignUp?.status);
      setError('Sign up incomplete. Please try again.');
    } catch (err: any) {
      console.error('Google OAuth error:', JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Google sign up failed');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isLoaded, startSSOFlow, router, setActive]);

  // Verification Code Screen
  if (pendingVerification) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView 
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: '#34C759' }]}>
                <Ionicons name="mail" size={40} color="#fff" />
              </View>
              <Text style={[styles.title, isDark && styles.textLight]}>Check Your Email</Text>
              <Text style={[styles.subtitle, isDark && styles.textMuted]}>
                We sent a verification code to{'\n'}
                <Text style={styles.emailHighlight}>{emailAddress}</Text>
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#ff3b30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.textLight]}>Verification Code</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Ionicons name="keypad-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark, styles.codeInput]}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#8e8e93"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <Pressable
              style={[styles.signInButton, (!code || isLoading) && styles.buttonDisabled]}
              onPress={onVerifyPress}
              disabled={!code || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>Verify Email</Text>
              )}
            </Pressable>

            <Pressable 
              style={[styles.resendContainer, !canResend && styles.resendDisabled]}
              onPress={onResendCode}
              disabled={!canResend}
            >
              <Text style={[styles.resendText, isDark && styles.textMuted]}>
                Didn't receive the code?{' '}
              </Text>
              {canResend ? (
                <Text style={styles.resendLink}>Resend</Text>
              ) : (
                <Text style={[styles.resendText, isDark && styles.textMuted]}>
                  Resend in {resendCooldown}s
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Sign Up Form
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
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={40} color="#fff" />
            </View>
            <Text style={[styles.title, isDark && styles.textLight]}>Create Account</Text>
            <Text style={[styles.subtitle, isDark && styles.textMuted]}>
              Join the ISTA Community today
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ff3b30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Google Sign Up */}
          <Pressable
            style={[styles.googleButton, isDark && styles.googleButtonDark, isGoogleLoading && styles.buttonDisabled]}
            onPress={onGoogleSignUp}
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
                placeholder="Create a password"
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
            <Text style={styles.passwordHint}>Minimum 8 characters</Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDark && styles.textLight]}>Confirm Password</Text>
            <View style={[
              styles.inputWrapper, 
              isDark && styles.inputWrapperDark,
              confirmPassword && confirmPassword !== password && styles.inputWrapperError
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="Confirm your password"
                placeholderTextColor="#8e8e93"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color="#8e8e93" 
                />
              </Pressable>
            </View>
            {confirmPassword && confirmPassword !== password && (
              <Text style={styles.errorHint}>Passwords do not match</Text>
            )}
          </View>

          {/* Sign Up Button */}
          <Pressable
            style={[styles.signInButton, (!emailAddress || !password || !confirmPassword || password !== confirmPassword || isLoading) && styles.buttonDisabled]}
            onPress={onSignUpPress}
            disabled={!emailAddress || !password || !confirmPassword || password !== confirmPassword || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signInButtonText}>Create Account</Text>
            )}
          </Pressable>

          {/* Sign In Link - use replace to prevent stacking */}
          <View style={styles.signUpContainer}>
            <Text style={[styles.signUpText, isDark && styles.textMuted]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.signUpLink}>Sign In</Text>
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
  emailHighlight: {
    fontWeight: '600',
    color: '#007AFF',
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
  inputWrapperError: {
    borderWidth: 1,
    borderColor: '#ff3b30',
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
  codeInput: {
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  eyeButton: {
    padding: 8,
  },
  passwordHint: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 6,
    marginLeft: 4,
  },
  errorHint: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 6,
    marginLeft: 4,
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 15,
    color: '#666',
  },
  resendLink: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  resendDisabled: {
    opacity: 0.6,
  },
});
