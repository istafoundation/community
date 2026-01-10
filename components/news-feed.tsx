import { NewsCard } from '@/components/news-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { NewsArticle } from '@/hooks/use-news';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';


const { width } = Dimensions.get('window');

interface NewsFeedProps {
  articles: NewsArticle[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
}

function LoadingState() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={isDark ? '#fff' : '#007AFF'} />
      <Text style={[styles.loadingText, isDark && styles.textDark]}>
        Loading stories...
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={64} color={isDark ? '#666' : '#999'} />
      <Text style={[styles.errorTitle, isDark && styles.textDark]}>
        Oops! Something went wrong
      </Text>
      <Text style={[styles.errorMessage, isDark && styles.textMutedDark]}>
        {message}
      </Text>
      <Text style={styles.retryButton} onPress={onRetry}>
        Tap to retry
      </Text>
    </View>
  );
}

function EmptyState() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.centered}>
      <Ionicons name="newspaper-outline" size={64} color={isDark ? '#666' : '#999'} />
      <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
        No news found
      </Text>
      <Text style={[styles.emptyMessage, isDark && styles.textMutedDark]}>
        Try selecting a different topic or search term
      </Text>
    </View>
  );
}

function SkeletonCard() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.skeletonCard, isDark && styles.skeletonCardDark]}>
      <View style={[styles.skeletonImage, isDark && styles.skeletonElementDark]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonTitle, isDark && styles.skeletonElementDark]} />
        <View style={[styles.skeletonTitle, styles.skeletonTitleShort, isDark && styles.skeletonElementDark]} />
        <View style={[styles.skeletonDate, isDark && styles.skeletonElementDark]} />
      </View>
    </View>
  );
}

function LoadingSkeletons() {
  return (
    <View>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

function LoadingMoreIndicator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.loadingMore}>
      <ActivityIndicator size="small" color={isDark ? '#fff' : '#007AFF'} />
      <Text style={[styles.loadingMoreText, isDark && styles.textMutedDark]}>
        Loading more articles...
      </Text>
    </View>
  );
}

function EndOfListIndicator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.endOfList}>
      <View style={styles.endOfListLine} />
      <Text style={[styles.endOfListText, isDark && styles.textMutedDark]}>
        You're all caught up! 🎉
      </Text>
      <View style={styles.endOfListLine} />
    </View>
  );
}

export function NewsFeed({ 
  articles, 
  loading, 
  loadingMore = false,
  hasMore = true,
  error, 
  onRefresh,
  onLoadMore,
}: NewsFeedProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [refreshing, setRefreshing] = React.useState(false);
  const flatListRef = React.useRef<FlatList>(null);

  // Scroll to top when articles change (new category selected)
  React.useEffect(() => {
    if (flatListRef.current && articles.length > 0) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [loading]); // Trigger on loading change which happens on category switch

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [loadingMore, hasMore, onLoadMore]);

  // Memoized renderItem for FlatList performance
  const renderItem = useCallback(
    ({ item, index }: { item: NewsArticle; index: number }) => (
      <NewsCard article={item} index={index} />
    ),
    []
  );

  // Memoized keyExtractor for FlatList performance
  const keyExtractor = useCallback(
    (item: NewsArticle, index: number) => `${item.link}-${index}`,
    []
  );

  if (loading && articles.length === 0) {
    return <LoadingSkeletons />;
  }

  if (error && articles.length === 0) {
    return <ErrorState message={error} onRetry={onRefresh} />;
  }

  if (!loading && articles.length === 0) {
    return <EmptyState />;
  }

  const renderFooter = () => {
    if (loadingMore) {
      return <LoadingMoreIndicator />;
    }
    if (!hasMore && articles.length > 0) {
      return <EndOfListIndicator />;
    }
    return <View style={styles.footer} />;
  };

  return (
    <FlatList
      ref={flatListRef}
      data={articles}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={isDark ? '#fff' : '#007AFF'}
          colors={['#007AFF']}
        />
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={renderFooter}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={5}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  footer: {
    height: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8e8e93',
    fontWeight: '500',
  },
  textDark: {
    color: '#f5f5f5',
  },
  textMutedDark: {
    color: '#8e8e93',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
  },
  skeletonCard: {
    width: width - 32,
    height: 320,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 24,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  skeletonCardDark: {
    backgroundColor: '#1c1c1e',
  },
  skeletonImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e5e5ea',
  },
  skeletonElementDark: {
    backgroundColor: '#3a3a3c',
  },
  skeletonContent: {
    padding: 16,
    gap: 10,
  },
  skeletonTitle: {
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e5e5ea',
    width: '90%',
  },
  skeletonTitleShort: {
    width: '60%',
  },
  skeletonDate: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e5e5ea',
    width: '30%',
    marginTop: 8,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500',
  },
  endOfList: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 16,
  },
  endOfListLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e5ea',
  },
  endOfListText: {
    fontSize: 14,
    color: '#8e8e93',
    fontWeight: '500',
  },
});
