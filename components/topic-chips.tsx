import { useCategories } from '@/contexts/category-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TopicType } from '@/hooks/use-news';
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface TopicChipsProps {
  selectedTopic: TopicType | 'HEADLINES' | 'INDIAN';
  onSelectTopic: (topic: TopicType | 'HEADLINES' | 'INDIAN') => void;
}

export function TopicChips({ selectedTopic, onSelectTopic }: TopicChipsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { getEnabledCategories } = useCategories();

  const enabledCategories = getEnabledCategories();

  // If current selected topic was disabled, switch to first enabled
  React.useEffect(() => {
    if (!enabledCategories.find(c => c.id === selectedTopic)) {
      const first = enabledCategories[0];
      if (first) {
        onSelectTopic(first.id as TopicType | 'HEADLINES' | 'INDIAN');
      }
    }
  }, [enabledCategories, selectedTopic, onSelectTopic]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {enabledCategories.map((topic) => {
          const isSelected = selectedTopic === topic.id;
          return (
            <Pressable
              key={topic.id}
              style={[
                styles.chip,
                isDark && styles.chipDark,
                isSelected && styles.chipSelected, // Uses style class again
              ]}
              onPress={() => onSelectTopic(topic.id as TopicType | 'HEADLINES' | 'INDIAN')}
            >
              <Text style={styles.emoji}>{topic.emoji}</Text>
              <Text 
                style={[
                  styles.label,
                  isDark && styles.labelDark,
                  isSelected && styles.labelSelected,
                ]}
              >
                {topic.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chipDark: {
    backgroundColor: '#1c1c1e',
  },
  chipSelected: {
    backgroundColor: '#007AFF', // Re-added this
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  labelDark: {
    color: '#f5f5f5',
  },
  labelSelected: {
    color: '#fff',
  },
});
