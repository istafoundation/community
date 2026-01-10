import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { EventData } from './event-card';

interface EventFormProps {
  event?: Partial<EventData>;
  onSubmit: (data: {
    title: string;
    heroImage: string;
    location: string;
    dateTime: number;
    content: string;
  }) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
  topInset?: number;
}

export function EventForm({ event, onSubmit, onClose, isLoading, isEditing, topInset = 0 }: EventFormProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState(event?.title || '');
  const [heroImage, setHeroImage] = useState(event?.heroImage || '');
  const [location, setLocation] = useState(event?.location || '');
  const [dateTime, setDateTime] = useState(new Date(event?.dateTime || Date.now() + 86400000));
  const [content, setContent] = useState(event?.content || '');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter an event title.');
      return;
    }
    if (!heroImage.trim()) {
      Alert.alert('Missing Image', 'Please enter a hero image URL.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing Location', 'Please enter event location.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Missing Content', 'Please enter event content.');
      return;
    }

    await onSubmit({
      title: title.trim(),
      heroImage: heroImage.trim(),
      location: location.trim(),
      dateTime: dateTime.getTime(),
      content: content.trim(),
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const onDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDateTime = new Date(dateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setDateTime(newDateTime);
    }
  };

  const onTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = new Date(dateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setDateTime(newDateTime);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={[styles.scrollView, isDark && styles.scrollViewDark]}
        contentContainerStyle={[styles.contentContainer, { paddingTop: topInset + 8 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}
        <Pressable 
          onPress={onClose} 
          style={[styles.closeButton, isDark && styles.closeButtonDark]}
        >
          <Ionicons name="close" size={24} color={isDark ? '#fff' : '#000'} />
        </Pressable>

        {/* Hero Image Preview - Fixed Height Container */}
        <View style={[styles.heroContainer, isDark && styles.heroContainerDark]}>
          {heroImage && !imageError ? (
            <Image
              source={{ uri: heroImage }}
              style={styles.heroImage}
              contentFit="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.heroPlaceholderInner}>
              <Ionicons name="image-outline" size={36} color={isDark ? '#555' : '#ccc'} />
              <Text style={[styles.heroPlaceholderText, isDark && styles.textMuted]}>
                Add cover image URL below
              </Text>
            </View>
          )}
        </View>

        {/* Form Fields */}
        <View style={[styles.formCard, isDark && styles.formCardDark]}>
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="text" size={16} color="#007AFF" />
              <Text style={[styles.label, isDark && styles.labelDark]}>Title</Text>
            </View>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={title}
              onChangeText={setTitle}
              placeholder="Event name"
              placeholderTextColor={isDark ? '#555' : '#aaa'}
            />
          </View>

          {/* Hero Image URL */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="image" size={16} color="#FF9500" />
              <Text style={[styles.label, isDark && styles.labelDark]}>Cover Image URL</Text>
            </View>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={heroImage}
              onChangeText={(text) => {
                setHeroImage(text);
                setImageError(false);
              }}
              placeholder="https://..."
              placeholderTextColor={isDark ? '#555' : '#aaa'}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="location" size={16} color="#FF3B30" />
              <Text style={[styles.label, isDark && styles.labelDark]}>Location</Text>
            </View>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={location}
              onChangeText={setLocation}
              placeholder="Venue or address"
              placeholderTextColor={isDark ? '#555' : '#aaa'}
            />
          </View>

          {/* Date & Time */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="calendar" size={16} color="#34C759" />
              <Text style={[styles.label, isDark && styles.labelDark]}>When</Text>
            </View>
            <View style={styles.dateTimeRow}>
              <Pressable 
                style={[styles.dateButton, isDark && styles.dateButtonDark]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateButtonText, isDark && styles.dateButtonTextDark]}>
                  {formatDate(dateTime)}
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.dateButton, styles.timeButton, isDark && styles.dateButtonDark]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.dateButtonText, isDark && styles.dateButtonTextDark]}>
                  {formatTime(dateTime)}
                </Text>
              </Pressable>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dateTime}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={dateTime}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          {/* Content (Markdown) */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="document-text" size={16} color="#5856D6" />
              <Text style={[styles.label, isDark && styles.labelDark]}>Description</Text>
            </View>
            <TextInput
              style={[styles.textArea, isDark && styles.inputDark]}
              value={content}
              onChangeText={setContent}
              placeholder="Tell people about your event..."
              placeholderTextColor={isDark ? '#555' : '#aaa'}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <Pressable 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollViewDark: {
    backgroundColor: '#000',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButtonDark: {
    backgroundColor: 'rgba(60,60,60,0.9)',
  },
  heroContainer: {
    height: 140,
    marginHorizontal: 16,
    marginTop: 48,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e5e5',
  },
  heroContainerDark: {
    backgroundColor: '#1c1c1e',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholderInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  heroPlaceholderText: {
    fontSize: 13,
    color: '#999',
  },
  textMuted: {
    color: '#666',
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
  },
  formCardDark: {
    backgroundColor: '#1c1c1e',
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  labelDark: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputDark: {
    backgroundColor: '#2c2c2e',
    color: '#fff',
  },
  textArea: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 200,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingVertical: 12,
  },
  timeButton: {
    flex: 1,
  },
  dateButtonDark: {
    backgroundColor: '#2c2c2e',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  dateButtonTextDark: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#007AFF80',
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
