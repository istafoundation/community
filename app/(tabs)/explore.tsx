import { NewsFeed } from '@/components/news-feed';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNews } from '@/hooks/use-news';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
    Keyboard,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '@/contexts/preferences-context';

export default function SearchScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  // removed accentColor
  const [searchText, setSearchText] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  const { articles, loading, error, refresh } = useNews(
    submittedQuery ? { type: 'search', query: submittedQuery, n: 30 } : { type: 'headlines', n: 0 }
  );

  const handleSearch = useCallback(() => {
    if (searchText.trim()) {
      setSubmittedQuery(searchText.trim());
      Keyboard.dismiss();
    }
  }, [searchText]);

  const clearSearch = useCallback(() => {
    setSearchText('');
    setSubmittedQuery('');
  }, []);

  const popularTopics = [
    { label: 'AI & Tech', emoji: '🤖' },
    { label: 'Climate', emoji: '🌍' },
    { label: 'Sports', emoji: '⚽' },
    { label: 'Finance', emoji: '💰' },
    { label: 'Movies', emoji: '🎬' },
    { label: 'Politics', emoji: '🏛️' },
  ];

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="search" size={28} color="#007AFF" />
        <Text style={[styles.title, isDark && styles.textDark]}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
          <Ionicons name="search-outline" size={20} color="#8e8e93" />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="ISTA Community..."
            placeholderTextColor="#8e8e93"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#8e8e93" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Results or Empty State */}
      {submittedQuery ? (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsLabel, isDark && styles.textMuted]}>
              Results for "{submittedQuery}"
            </Text>
            <Pressable onPress={clearSearch}>
              <Text style={[styles.clearResults, { color: '#007AFF' }]}>Clear</Text>
            </Pressable>
          </View>
          <NewsFeed
            articles={articles}
            loading={loading}
            error={error}
            onRefresh={refresh}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.iconContainer}>
            <Ionicons name="search" size={48} color={isDark ? '#333' : '#ddd'} />
          </View>
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
            Discover Stories
          </Text>
          <Text style={[styles.emptyMessage, isDark && styles.textMuted]}>
            Search for any topic, person, or event
          </Text>
          
          {/* Popular Topics */}
          <View style={styles.popularSection}>
            <Text style={[styles.popularLabel, isDark && styles.textMuted]}>
              Trending Topics
            </Text>
            <View style={styles.popularTags}>
              {popularTopics.map((topic) => (
                <Pressable
                  key={topic.label}
                  style={[styles.popularTag, isDark && styles.popularTagDark]}
                  onPress={() => {
                    setSearchText(topic.label.split(' ')[0]);
                    setSubmittedQuery(topic.label.split(' ')[0]);
                  }}
                >
                  <Text style={styles.tagEmoji}>{topic.emoji}</Text>
                  <Text style={[styles.popularTagText, isDark && styles.popularTagTextDark]}>
                    {topic.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  searchBarDark: {
    backgroundColor: '#1c1c1e',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  searchInputDark: {
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  clearResults: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF', // Fallback, overridden inline
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: -60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 32,
  },
  popularSection: {
    width: '100%',
    alignItems: 'center',
  },
  popularLabel: {
    fontSize: 13,
    color: '#8e8e93',
    marginBottom: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  popularTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  popularTagDark: {
    backgroundColor: '#1c1c1e',
  },
  tagEmoji: {
    fontSize: 16,
  },
  popularTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  popularTagTextDark: {
    color: '#f5f5f5',
  },
});
