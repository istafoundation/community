import { EventForm } from '@/components/event-form';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { api } from '@/convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import type { Id } from '@/convex/_generated/dataModel';

const { width } = Dimensions.get('window');

export default function EventScreen() {
  const { eventId, mode } = useLocalSearchParams<{ eventId?: string; mode?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useUser();

  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [isCreating] = useState(mode === 'create');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch event data
  const event = useQuery(
    api.events.getEvent,
    eventId ? { eventId: eventId as Id<"events"> } : "skip"
  );

  // Get user role
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip"
  );

  const isAdmin = convexUser?.role === 'admin';

  // Mutations
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);

  const handleClose = () => {
    router.back();
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `${event.title}\n📍 ${event.location}\n📅 ${formatDateTime(event.dateTime)}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id || !eventId) return;
            try {
              await deleteEvent({
                clerkId: user.id,
                eventId: eventId as Id<"events">,
              });
              router.back();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete event.');
            }
          },
        },
      ]
    );
  };

  const handleFormSubmit = async (data: {
    title: string;
    heroImage: string;
    location: string;
    dateTime: number;
    content: string;
  }) => {
    if (!user?.id || !user.username) {
      Alert.alert('Error', 'You must be signed in to manage events.');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreating) {
        await createEvent({
          clerkId: user.id,
          username: user.username,
          ...data,
        });
        router.back();
      } else if (isEditing && eventId) {
        await updateEvent({
          clerkId: user.id,
          eventId: eventId as Id<"events">,
          ...data,
        });
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save event.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormCancel = () => {
    if (isCreating) {
      router.back();
    } else {
      setIsEditing(false);
    }
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatShortDate = (timestamp: number) => {
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

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Loading state
  if (!isCreating && event === undefined) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centerContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Create/Edit mode
  if (isCreating || isEditing) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <EventForm
          event={event ?? undefined}
          onSubmit={handleFormSubmit}
          onClose={handleFormCancel}
          isLoading={isSaving}
          isEditing={isEditing}
          topInset={insets.top}
        />
      </View>
    );
  }

  // Event not found
  if (!event) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, styles.centerContainer]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Ionicons name="calendar-outline" size={64} color={isDark ? '#333' : '#ddd'} />
        <Text style={[styles.errorText, isDark && styles.textDark]}>Event not found</Text>
        <Pressable onPress={handleClose} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // Markdown styles
  const markdownStyles = {
    body: {
      color: isDark ? '#e5e5e5' : '#333',
      fontSize: 16,
      lineHeight: 26,
    },
    heading1: {
      color: isDark ? '#fff' : '#1a1a1a',
      fontSize: 22,
      fontWeight: '700' as const,
      marginTop: 16,
      marginBottom: 8,
    },
    heading2: {
      color: isDark ? '#fff' : '#1a1a1a',
      fontSize: 18,
      fontWeight: '600' as const,
      marginTop: 14,
      marginBottom: 6,
    },
    paragraph: {
      marginBottom: 12,
    },
    link: {
      color: '#007AFF',
    },
  };

  // View mode - Full screen immersive
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Image - Full Width */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: event.heroImage }}
            style={styles.heroImage}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.heroGradient} />
          
          {/* Close Button */}
          <Pressable 
            onPress={handleClose} 
            style={[styles.closeButton, { top: insets.top + 8 }]}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>

          {/* Share Button */}
          <Pressable 
            onPress={handleShare} 
            style={[styles.shareButton, { top: insets.top + 8 }]}
          >
            <Ionicons name="share-outline" size={22} color="#fff" />
          </Pressable>

          {/* Event Info Overlay */}
          <View style={styles.heroContent}>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar" size={14} color="#fff" />
              <Text style={styles.dateBadgeText}>{formatShortDate(event.dateTime)}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={3}>{event.title}</Text>
          </View>
        </View>

        {/* Content Card */}
        <View style={[styles.contentCard, isDark && styles.contentCardDark]}>
          {/* Location */}
          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={16} color="#FF3B30" />
            </View>
            <Text style={[styles.locationText, isDark && styles.locationTextDark]}>
              {event.location}
            </Text>
          </View>

          {/* Author */}
          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>
                {event.authorUsername?.charAt(0).toUpperCase() || 'A'}
              </Text>
            </View>
            <View>
              <Text style={[styles.authorLabel, isDark && styles.textMuted]}>Posted by</Text>
              <Text style={[styles.authorName, isDark && styles.authorNameDark]}>
                @{event.authorUsername}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, isDark && styles.dividerDark]} />

          {/* Content */}
          <Markdown style={markdownStyles}>
            {event.content}
          </Markdown>

          {/* Admin Actions */}
          {isAdmin && (
            <View style={styles.adminActions}>
              <Pressable style={styles.editButton} onPress={handleEdit}>
                <Ionicons name="pencil" size={18} color="#fff" />
                <Text style={styles.buttonText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash" size={18} color="#fff" />
                <Text style={styles.buttonText}>Delete</Text>
              </Pressable>
            </View>
          )}

          {/* Bottom padding for scroll */}
          <View style={{ height: insets.bottom + 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  scrollView: {
    flex: 1,
  },
  heroContainer: {
    height: 340,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    marginBottom: 10,
  },
  dateBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  contentCard: {
    backgroundColor: '#fff',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    minHeight: 300,
  },
  contentCardDark: {
    backgroundColor: '#1c1c1e',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  locationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,59,48,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  locationTextDark: {
    color: '#e5e5e5',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  authorLabel: {
    fontSize: 12,
    color: '#999',
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  authorNameDark: {
    color: '#fff',
  },
  textMuted: {
    color: '#666',
  },
  textDark: {
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 16,
  },
  dividerDark: {
    backgroundColor: '#333',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});
