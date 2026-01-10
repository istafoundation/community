import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import type { Id } from '@/convex/_generated/dataModel';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const IMAGE_HEIGHT = 160;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface EventData {
  _id: Id<"events">;
  title: string;
  heroImage: string;
  location: string;
  dateTime: number;
  content: string;
  authorClerkId: string;
  authorUsername: string;
  createdAt: number;
  updatedAt: number;
}

interface EventCardProps {
  event: EventData;
}

function EventCardComponent({ event }: EventCardProps) {
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
    router.push({
      pathname: '/event',
      params: { eventId: event._id },
    });
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
    return `${dateStr} at ${timeStr}`;
  };

  const isPastEvent = event.dateTime < Date.now();

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle, isDark && styles.cardDark]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      {/* Hero Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: event.heroImage }}
          style={styles.heroImage}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.imageOverlay} />
        
        {/* Date Badge */}
        <View style={[styles.dateBadge, isPastEvent && styles.pastEventBadge]}>
          <Ionicons 
            name="calendar" 
            size={12} 
            color={isPastEvent ? '#999' : '#fff'} 
          />
          <Text style={[styles.dateBadgeText, isPastEvent && styles.pastEventText]}>
            {formatDateTime(event.dateTime)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, isDark && styles.titleDark]} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons 
            name="location-outline" 
            size={16} 
            color={isDark ? '#8e8e93' : '#666'} 
          />
          <Text style={[styles.location, isDark && styles.locationDark]} numberOfLines={1}>
            {event.location}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.author, isDark && styles.authorDark]}>
            By @{event.authorUsername}
          </Text>
          <View style={styles.viewMore}>
            <Text style={styles.viewMoreText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#007AFF" />
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

// Memoized export
export const EventCard = React.memo(EventCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.event._id === nextProps.event._id &&
    prevProps.event.title === nextProps.event.title &&
    prevProps.event.updatedAt === nextProps.event.updatedAt
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  imageContainer: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  pastEventBadge: {
    backgroundColor: 'rgba(142, 142, 147, 0.9)',
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  pastEventText: {
    color: '#fff',
  },
  content: {
    padding: 16,
    gap: 10,
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  location: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  locationDark: {
    color: '#8e8e93',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  author: {
    fontSize: 13,
    color: '#8e8e93',
  },
  authorDark: {
    color: '#666',
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
});
