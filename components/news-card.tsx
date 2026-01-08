import { useColorScheme } from '@/hooks/use-color-scheme';
import type { NewsArticle } from '@/hooks/use-news';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NewsCardProps {
  article: NewsArticle;
  index?: number;
}

// Premium accent colors for sources - all vibrant for good contrast
const SOURCE_COLORS: Record<string, string> = {
  'CNN': '#CC0000',
  'BBC': '#BB1919',
  'Reuters': '#FF8000',
  'The New York Times': '#567B95',
  'The Washington Post': '#2D5E8A',
  'The Guardian': '#0D6AA8',
  'Fox News': '#0066CC',
  'NBC News': '#0089D0',
  'CBS News': '#1A73E8',
  'ABC News': '#3366CC',
  'Bloomberg': '#5A2D82',
  'CNBC': '#005594',
  'Forbes': '#B40000',
  'Wall Street Journal': '#0274B6',
  'Axios': '#5C7A99',
  'Politico': '#BE1E2D',
  'AP News': '#EF3E42',
  'NPR': '#EC0D6B',
  'USA Today': '#009BFF',
  'The Hill': '#30629B',
  'TechCrunch': '#0A9B21',
  'The Verge': '#E94B35',
  'Wired': '#8B5CF6',
};

// Get accent color for source
const getSourceColor = (source: string): string => {
  const color = SOURCE_COLORS[source];
  if (color) return color;
  
  // Generate consistent color from source name
  const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#FF2D55', '#00C7BE', '#30B0C7'];
  return colors[hash % colors.length];
};

// Get category icon based on content
const getCategoryIcon = (source: string, title: string): keyof typeof Ionicons.glyphMap => {
  const s = source?.toLowerCase() || '';
  const t = title?.toLowerCase() || '';
  
  if (s.includes('sport') || t.includes('sport') || t.includes('game') || t.includes('player')) return 'football';
  if (s.includes('tech') || t.includes('tech') || t.includes('ai ') || t.includes('apple') || t.includes('google')) return 'hardware-chip';
  if (s.includes('business') || t.includes('stock') || t.includes('market') || t.includes('economy')) return 'trending-up';
  if (t.includes('health') || t.includes('medical') || t.includes('covid') || t.includes('vaccine')) return 'heart';
  if (t.includes('science') || t.includes('nasa') || t.includes('space')) return 'planet';
  if (t.includes('movie') || t.includes('film') || t.includes('actor') || t.includes('oscar')) return 'film';
  if (t.includes('politic') || t.includes('president') || t.includes('congress') || t.includes('senate')) return 'flag';
  if (t.includes('weather') || t.includes('storm') || t.includes('hurricane')) return 'cloud';
  return 'newspaper';
};

export function NewsCard({ article, index = 0 }: NewsCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useSharedValue(1);
  const router = useRouter();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    if (article.link) {
      router.push({
        pathname: '/article',
        params: {
          url: article.link,
          title: article.title,
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return '1d';
      if (diffDays < 7) return `${diffDays}d`;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const accentColor = getSourceColor(article.source || 'News');
  const categoryIcon = getCategoryIcon(article.source || '', article.title || '');

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle, isDark && styles.cardDark]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      {/* Accent Bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Header: Source + Time */}
        <View style={styles.header}>
          <View style={styles.sourceContainer}>
            <View style={[styles.iconBadge, { backgroundColor: accentColor + '15' }]}>
              <Ionicons name={categoryIcon} size={14} color={accentColor} />
            </View>
            <Text style={[styles.source, { color: accentColor }]} numberOfLines={1}>
              {article.source || 'News'}
            </Text>
          </View>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={12} color={isDark ? '#666' : '#999'} />
            <Text style={[styles.time, isDark && styles.timeDark]}>
              {formatDate(article.pubDate)}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={3}>
          {article.title}
        </Text>

        {/* Description */}
        {article.description && (
          <Text style={[styles.description, isDark && styles.descriptionDark]} numberOfLines={2}>
            {article.description}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.readMore, { color: accentColor }]}>
            Read full story
          </Text>
          <Ionicons name="chevron-forward" size={14} color={accentColor} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
    shadowOpacity: 0.3,
  },
  accentBar: {
    width: 4,
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  source: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  timeDark: {
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  titleDark: {
    color: '#f5f5f5',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  descriptionDark: {
    color: '#888',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
