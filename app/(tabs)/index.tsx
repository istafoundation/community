import { NewsFeed } from '@/components/news-feed';
import { TopicChips } from '@/components/topic-chips';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNews, type TopicType } from '@/hooks/use-news';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePreferences } from '@/contexts/preferences-context';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  // removed accentColor
  const [selectedTopic, setSelectedTopic] = useState<TopicType | 'HEADLINES' | 'INDIAN'>('HEADLINES');

  const newsOptions = selectedTopic === 'HEADLINES'
    ? { type: 'headlines' as const, n: 25 }
    : selectedTopic === 'INDIAN'
    ? { type: 'headlines' as const, n: 25, country: 'in' }
    : { type: 'topic' as const, topic: selectedTopic as TopicType, n: 25 };

  const { articles, loading, loadingMore, hasMore, error, refresh, loadMore } = useNews(newsOptions);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Simple Clean Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Ionicons 
            name="newspaper" 
            size={28} 
            color="#007AFF" 
          />
          <Text style={[styles.logo, isDark && styles.logoDark]}>ISTA Community</Text>
        </View>
        <Pressable
          style={[
            styles.searchButton, 
            isDark && styles.searchButtonDark,
          ]}
          onPress={() => router.push('/(tabs)/explore')}
        >
          <Ionicons name="search" size={20} color="#007AFF" />
        </Pressable>
      </View>

      {/* Topic Chips */}
      <TopicChips
        selectedTopic={selectedTopic}
        onSelectTopic={setSelectedTopic}
      />

      {/* News Feed */}
      <NewsFeed
        articles={articles}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        error={error}
        onRefresh={refresh}
        onLoadMore={loadMore}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  logoDark: {
    color: '#fff',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDark: {
    backgroundColor: '#007AFF30',
  },
});

