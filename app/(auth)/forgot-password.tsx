import { useSignIn } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

export default function ForgotPasswordScreen() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingReset, setPendingReset] = useState(false);

  const onRequestReset = useCallback(async () => {
    if (!isLoaded || !emailAddress) return;

    setIsLoading(true);
    setError('');

    try {
      await signIn?.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      });
      setPendingReset(true);
      setSuccessMessage('Check your email for a reset code');
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || 'Failed to send reset code');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, emailAddress, signIn]);

  const onResetPassword = useCallback(async () => {
    if (!isLoaded || !code || !newPassword) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      });

      if (result?.status === 'complete') {
        setSuccessMessage('Password reset successful! Redirecting...');
        setTimeout(() => {
          router.replace('/(auth)/sign-in');
        }, 1500);
      } else {
        setError('Password reset incomplete. Please try again.');
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, code, newPassword, signIn, router]);

  // Reset Password Form (after code is sent)
  if (pendingReset) {
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
            {/* Back Button */}
            <Pressable style={styles.backButton} onPress={() => setPendingReset(false)}>
              <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
            </Pressable>

            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: '#34C759' }]}>
                <Ionicons name="key" size={40} color="#fff" />
              </View>
              <Text style={[styles.title, isDark && styles.textLight]}>Reset Password</Text>
              <Text style={[styles.subtitle, isDark && styles.textMuted]}>
                Enter the code sent to your email and your new password
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#ff3b30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Code Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.textLight]}>Reset Code</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Ionicons name="keypad-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="Enter reset code"
                  placeholderTextColor="#8e8e93"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            {/* New Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.textLight]}>New Password</Text>
              <View style={[styles.inputWrapper, isDark && styles.inputWrapperDark]}>
                <Ionicons name="lock-closed-outline" size={20} color="#8e8e93" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="Enter new password"
                  placeholderTextColor="#8e8e93"
                  value={newPassword}
                  onChangeText={setNewPassword}
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

            {/* Reset Button */}
            <Pressable
              style={[styles.resetButton, (!code || !newPassword || isLoading) && styles.buttonDisabled]}
              onPress={onResetPassword}
              disabled={!code || !newPassword || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Reset Password</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Request Reset Code Form
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
          {/* Back Button */}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </Pressable>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-unread" size={40} color="#fff" />
            </View>
            <Text style={[styles.title, isDark && styles.textLight]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, isDark && styles.textMuted]}>
              No worries! Enter your email and we'll send you a reset code.
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#ff3b30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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

          {/* Send Code Button */}
          <Pressable
            style={[styles.resetButton, (!emailAddress || isLoading) && styles.buttonDisabled]}
            onPress={onRequestReset}
            disabled={!emailAddress || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.resetButtonText}>Send Reset Code</Text>
            )}
          </Pressable>

          {/* Back to Sign In */}
          <Pressable 
            style={styles.backToSignInContainer}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Ionicons name="arrow-back" size={16} color="#007AFF" />
            <Text style={styles.backToSignInText}>Back to Sign In</Text>
          </Pressable>
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
  backButton: {
    marginBottom: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
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
    lineHeight: 24,
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C75915',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  successText: {
    color: '#34C759',
    fontSize: 14,
    flex: 1,
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
  passwordHint: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 6,
    marginLeft: 4,
  },
  resetButton: {
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
  resetButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  backToSignInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 6,
  },
  backToSignInText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});
