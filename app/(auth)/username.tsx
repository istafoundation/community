import { useUser, useSignUp } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

export default function UsernameScreen() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signUp, setActive, isLoaded: isSignUpLoaded } = useSignUp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Check if we have a user or a pending signup
  const isLoaded = isUserLoaded && isSignUpLoaded;
  const hasUserContext = user || signUp;

  // If user already has a username, redirect
  useEffect(() => {
    if (isUserLoaded && user?.username) {
      router.replace('/(tabs)');
    }
  }, [isUserLoaded, user?.username, router]);

  // Validate username
  useEffect(() => {
    if (!username) {
      setIsValid(false);
      setError('');
      return;
    }

    // Username validation rules
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setIsValid(false);
    } else if (username.length > 20) {
      setError('Username must be 20 characters or less');
      setIsValid(false);
    } else if (!usernameRegex.test(username)) {
      setError('Only letters, numbers, and underscores allowed');
      setIsValid(false);
    } else {
      setError('');
      setIsValid(true);
    }
  }, [username]);

  const onSubmit = useCallback(async () => {
    if (!isLoaded || !isValid) return;

    setIsLoading(true);
    setError('');

    try {
      // Case 1: If we have a user object (user is signed in), update their username
      if (user) {
        console.log('Updating username via user object');
        await user.update({
          username: username.toLowerCase(),
        });
        router.replace('/(tabs)');
        return;
      }

      // Case 2: If we have a signUp object (email verification or OAuth flow), update the signUp
      if (signUp) {
        console.log('SignUp status:', signUp.status);
        
        // Try to update the signUp with username
        const result = await signUp.update({
          username: username.toLowerCase(),
        });

        console.log('SignUp update result:', result.status);

        // If signup is complete, set the session active
        if (result.status === 'complete' && result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
          router.replace('/(tabs)');
          return;
        }
        
        // If still missing_requirements, check what's missing
        if (result.status === 'missing_requirements') {
          console.log('Still missing:', result.missingFields);
          setError(`Additional information required: ${result.missingFields?.join(', ')}`);
          return;
        }
      }

      // Debug log
      console.log('No user or signUp available. isLoaded:', isLoaded, 'user:', !!user, 'signUp:', !!signUp);
      setError('Unable to set username. Please sign in again.');
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      
      if (err.errors?.[0]?.code === 'form_identifier_exists') {
        setError('This username is already taken');
      } else {
        setError(err.errors?.[0]?.message || 'Failed to set username');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isValid, user, signUp, setActive, username, router]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: '#5856D6' }]}>
              <Ionicons name="at" size={44} color="#fff" />
            </View>
            <Text style={[styles.title, isDark && styles.textLight]}>Choose Your Username</Text>
            <Text style={[styles.subtitle, isDark && styles.textMuted]}>
              This is how you'll appear in the community.{'\n'}Choose wisely — it can't be changed!
            </Text>
          </View>

          {/* Username Input */}
          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper, 
              isDark && styles.inputWrapperDark,
              error && styles.inputWrapperError,
              isValid && styles.inputWrapperSuccess,
            ]}>
              <Text style={styles.atSymbol}>@</Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                placeholder="username"
                placeholderTextColor="#8e8e93"
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                autoFocus
              />
              {isValid && (
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
              )}
            </View>
            
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#ff3b30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <Text style={[styles.hintText, isDark && styles.textMuted]}>
                3-20 characters • Letters, numbers, underscores only
              </Text>
            )}
          </View>

          {/* Requirements */}
          <View style={[styles.requirementsCard, isDark && styles.cardDark]}>
            <Text style={[styles.requirementsTitle, isDark && styles.textLight]}>
              Username Requirements
            </Text>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={username.length >= 3 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={18} 
                color={username.length >= 3 ? '#34C759' : '#8e8e93'} 
              />
              <Text style={[styles.requirementText, isDark && styles.textMuted]}>
                At least 3 characters
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={username.length <= 20 && username.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={18} 
                color={username.length <= 20 && username.length > 0 ? '#34C759' : '#8e8e93'} 
              />
              <Text style={[styles.requirementText, isDark && styles.textMuted]}>
                Maximum 20 characters
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons 
                name={/^[a-z0-9_]*$/.test(username) && username.length > 0 ? 'checkmark-circle' : 'ellipse-outline'} 
                size={18} 
                color={/^[a-z0-9_]*$/.test(username) && username.length > 0 ? '#34C759' : '#8e8e93'} 
              />
              <Text style={[styles.requirementText, isDark && styles.textMuted]}>
                Only lowercase letters, numbers, underscores
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <Pressable
            style={[styles.continueButton, (!isValid || isLoading) && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
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
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputWrapperDark: {
    backgroundColor: '#1c1c1e',
  },
  inputWrapperError: {
    borderColor: '#ff3b30',
  },
  inputWrapperSuccess: {
    borderColor: '#34C759',
  },
  atSymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 20,
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inputDark: {
    color: '#fff',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 13,
  },
  hintText: {
    fontSize: 13,
    color: '#8e8e93',
    marginTop: 10,
    marginLeft: 4,
  },
  requirementsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  requirementsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 14,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  continueButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
