import { EventCard, EventData } from '@/components/event-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Fetch events from Convex
  const events = useQuery(api.events.listEvents);
  
  // Get user role from Convex
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip"
  );
  
  const isAdmin = convexUser?.role === 'admin';
  const isLoading = events === undefined;

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex auto-refreshes, just show indicator briefly
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleCreateEvent = () => {
    router.push('/event?mode=create');
  };

  const renderEvent = useCallback(({ item }: { item: EventData }) => (
    <EventCard event={item} />
  ), []);

  const keyExtractor = useCallback((item: EventData) => item._id, []);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="calendar-outline" 
        size={64} 
        color={isDark ? '#333' : '#ddd'} 
      />
      <Text style={[styles.emptyTitle, isDark && styles.emptyTitleDark]}>
        No Events Yet
      </Text>
      <Text style={[styles.emptySubtitle, isDark && styles.emptySubtitleDark]}>
        {isAdmin 
          ? "Create the first event for your community!"
          : "Check back later for upcoming events."}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="calendar" size={28} color="#007AFF" />
        <Text style={[styles.title, isDark && styles.textDark]}>Events</Text>
      </View>

      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, isDark && styles.textMuted]}>
            Loading events...
          </Text>
        </View>
      ) : (
        /* Events List */
        <FlatList
          data={events as EventData[]}
          renderItem={renderEvent}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            events?.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* FAB for Admins */}
      {isAdmin && (
        <Pressable 
          style={styles.fab}
          onPress={handleCreateEvent}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
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
  listContent: {
    paddingTop: 8,
    paddingBottom: 120,
  },
  emptyList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyTitleDark: {
    color: '#fff',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySubtitleDark: {
    color: '#8e8e93',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
