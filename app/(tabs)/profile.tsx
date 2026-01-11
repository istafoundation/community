import { useAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { useCategories } from '@/contexts/category-context';
import { THEME_MODES, usePreferences } from '@/contexts/preferences-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import React from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { clearEncryptionKeys } from '@/utils/crypto';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { 
    getEnabledCategories, 
    getDisabledCategories, 
    enableCategory, 
    disableCategory 
  } = useCategories();
  
  const { 
    themeMode, 
    setThemeMode 
  } = usePreferences();

  // Clerk auth hooks
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  const enabledCategories = getEnabledCategories();
  const disabledCategories = getDisabledCategories();

  const handleRemove = (id: string) => {
    if (enabledCategories.length <= 2) {
      Alert.alert('Cannot Remove', 'You need at least 2 categories enabled.');
      return;
    }
    disableCategory(id);
  };

  const handleAdd = (id: string) => {
    enableCategory(id);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Wipe keys before signing out (independently)
              await clearEncryptionKeys().catch(e => console.log('Key wipe error', e));
              await SecureStore.deleteItemAsync("e2e_restored").catch(e => console.log('Flag wipe error', e));
              
              await signOut();
            } catch (err) {
              console.error('Sign out error:', err);
            }
          }
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="person-circle" size={28} color="#007AFF" />
        <Text style={[styles.title, isDark && styles.textDark]}>Profile</Text>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card - Show different content based on auth state */}
        {isSignedIn && user ? (
          <View style={[styles.profileCard, isDark && styles.cardDark]}>
            {user.imageUrl ? (
              <Image 
                source={{ uri: user.imageUrl }} 
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatarContainer, { backgroundColor: '#007AFF' }]}>
                <Text style={styles.avatarInitial}>
                  {user.username?.charAt(0).toUpperCase() || user.firstName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, isDark && styles.textDark]}>
                @{user.username || 'User'}
              </Text>
              <Text style={[styles.profileEmail, isDark && styles.textMuted]}>
                {user.primaryEmailAddress?.emailAddress || 'Signed in'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.signInCard, isDark && styles.cardDark]}>
            <View style={[styles.avatarContainer, { backgroundColor: '#8e8e93' }]}>
              <Ionicons name="person-outline" size={40} color="#fff" />
            </View>
            <View style={styles.signInContent}>
              <Text style={[styles.signInTitle, isDark && styles.textDark]}>
                Welcome, Guest
              </Text>
              <Text style={[styles.signInSubtitle, isDark && styles.textMuted]}>
                Sign in to access all features
              </Text>
              <Link href="/(auth)/sign-in" asChild>
                <Pressable style={styles.signInButton}>
                  <Text style={styles.signInButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </Pressable>
              </Link>
            </View>
          </View>
        )}

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            Appearance
          </Text>
          
          <View style={[styles.card, isDark && styles.cardDark]}>
            {/* Theme Selector */}
            <View style={styles.appearanceRow}>
              <Text style={[styles.appearanceLabel, isDark && styles.textDark]}>Theme</Text>
              <View style={[styles.themeSelector, isDark && styles.themeSelectorDark]}>
                {THEME_MODES.map((mode) => {
                   const isSelected = themeMode === mode.value;
                   
                   // Selection background style
                   const selectionStyle = isSelected ? {
                     backgroundColor: isDark ? '#333' : '#fff', // Better contrast for selected
                     shadowColor: '#000',
                     shadowOffset: { width: 0, height: 1 },
                     shadowOpacity: 0.1,
                     shadowRadius: 2,
                     elevation: 2,
                   } : {};

                   return (
                    <Pressable
                      key={mode.value}
                      style={[
                        styles.themeOption,
                        selectionStyle,
                      ]}
                      onPress={() => setThemeMode(mode.value)}
                    >
                      <Text style={[
                        styles.themeText,
                        !isSelected && isDark && styles.textMuted,
                        isSelected && { color: isDark ? '#fff' : '#000', fontWeight: '600' }
                      ]}>
                        {mode.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Your Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              Your Categories
            </Text>
            <Text style={[styles.sectionSubtitle, isDark && styles.textMuted]}>
              Tap X to remove
            </Text>
          </View>

          <View style={[styles.skillBox, isDark && styles.skillBoxDark]}>
            {enabledCategories.map((category) => {
              const isHeadlines = category.id === 'HEADLINES';
              return (
                <View 
                  key={category.id} 
                  style={[
                    styles.skillChip, 
                    { backgroundColor: isHeadlines ? '#007AFF' : isDark ? '#3a3a3c' : '#f0f0f0' },
                    isHeadlines && styles.lockedChip,
                  ]}
                >
                  <Text style={styles.skillEmoji}>{category.emoji}</Text>
                  <Text style={[
                    styles.skillLabel, 
                    !isHeadlines && (isDark ? { color: '#fff' } : { color: '#333' })
                  ]}>
                    {category.label}
                  </Text>
                  {!isHeadlines && (
                    <Pressable 
                      style={[styles.removeButton, isDark ? { backgroundColor: 'rgba(255,255,255,0.1)' } : { backgroundColor: 'rgba(0,0,0,0.05)' }]}
                      onPress={() => handleRemove(category.id)}
                    >
                      <Ionicons name="close" size={14} color={isDark ? '#fff' : '#333'} />
                    </Pressable>
                  )}
                </View>
              );
            })}
            {enabledCategories.length === 0 && (
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                No categories selected
              </Text>
            )}
          </View>
        </View>

        {/* Available Categories */}
        {disabledCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                Add Categories
              </Text>
              <Text style={[styles.sectionSubtitle, isDark && styles.textMuted]}>
                Tap to add
              </Text>
            </View>

            <View style={[styles.skillBox, isDark && styles.skillBoxDark]}>
              {disabledCategories.map((category) => (
                <Pressable 
                  key={category.id} 
                  style={[styles.skillChip, styles.disabledChip, isDark && styles.disabledChipDark]}
                  onPress={() => handleAdd(category.id)}
                >
                  <Text style={styles.skillEmoji}>{category.emoji}</Text>
                  <Text style={[styles.skillLabelDisabled, isDark && styles.textMuted]}>
                    {category.label}
                  </Text>
                  <Ionicons name="add" size={16} color="#007AFF" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Account Section - only show when signed in */}
        {isSignedIn && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
              Account
            </Text>
            <View style={[styles.card, isDark && styles.cardDark]}>
              <Pressable style={styles.menuRow} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
                <Text style={[styles.menuLabel, { color: '#ff3b30' }]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={18} color="#8e8e93" />
              </Pressable>
            </View>
          </View>
        )}

        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
            About
          </Text>
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.menuRow}>
              <Ionicons name="information-circle-outline" size={22} color="#007AFF" />
              <Text style={[styles.menuLabel, isDark && styles.textDark]}>App Version</Text>
              <Text style={[styles.menuValue, isDark && styles.textMuted]}>{Constants.expoConfig?.version || '1.0.0'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, isDark && styles.textMuted]}>
             Made with ❤️ for ISTA Community
          </Text>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  textDark: {
    color: '#fff',
  },
  textMuted: {
    color: '#8e8e93',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },
  signInCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  signInContent: {
    alignItems: 'center',
    marginTop: 12,
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  signInSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 16,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  profileEmail: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  appearanceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  themeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f7',
    borderRadius: 8,
    padding: 2,
  },
  themeSelectorDark: {
    backgroundColor: '#2c2c2e',
  },
  themeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  themeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  skillBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  skillBoxDark: {
    backgroundColor: '#1c1c1e',
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
  },
  lockedChip: {
    paddingRight: 10,
  },
  disabledChip: {
    backgroundColor: '#f0f0f0',
    paddingRight: 10,
  },
  disabledChipDark: {
    backgroundColor: '#2c2c2e',
  },
  skillEmoji: {
    fontSize: 14,
  },
  skillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  skillLabelDisabled: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  menuValue: {
    fontSize: 16,
    color: '#8e8e93',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#8e8e93',
  },
});
