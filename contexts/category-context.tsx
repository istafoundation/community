import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ista_enabled_categories';

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const ALL_CATEGORIES: Category[] = [
  { id: 'HEADLINES', label: 'Headlines', emoji: '🔥' },
  { id: 'WORLD', label: 'World', emoji: '🌍' },
  { id: 'INDIAN', label: 'India', emoji: '🇮🇳' },
  { id: 'BUSINESS', label: 'Business', emoji: '💼' },
  { id: 'TECHNOLOGY', label: 'Tech', emoji: '💻' },
  { id: 'SCIENCE', label: 'Science', emoji: '🔬' },
  { id: 'ENTERTAINMENT', label: 'Fun', emoji: '🎬' },
  { id: 'SPORTS', label: 'Sports', emoji: '⚽' },
  { id: 'HEALTH', label: 'Health', emoji: '❤️' },
];

interface CategoryContextType {
  enabledCategoryIds: string[];
  enableCategory: (id: string) => void;
  disableCategory: (id: string) => void;
  isEnabled: (id: string) => boolean;
  getEnabledCategories: () => Category[];
  getDisabledCategories: () => Category[];
  isLoading: boolean;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [enabledCategoryIds, setEnabledCategoryIds] = useState<string[]>(
    ALL_CATEGORIES.map(c => c.id)
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load saved categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Save categories whenever they change (after initial load)
  useEffect(() => {
    if (!isLoading) {
      saveCategories(enabledCategoryIds);
    }
  }, [enabledCategoryIds, isLoading]);

  const loadCategories = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Validate that saved categories are still valid
        const validIds = parsed.filter(id => 
          ALL_CATEGORIES.some(c => c.id === id)
        );
        if (validIds.length >= 2) {
          setEnabledCategoryIds(validIds);
        }
      }
    } catch (error) {
      console.error('[CategoryContext] Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCategories = async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('[CategoryContext] Failed to save categories:', error);
    }
  };

  const enableCategory = useCallback((id: string) => {
    setEnabledCategoryIds(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const disableCategory = useCallback((id: string) => {
    setEnabledCategoryIds(prev => {
      if (prev.length <= 2) return prev; // Keep at least 2
      return prev.filter(catId => catId !== id);
    });
  }, []);

  const isEnabled = useCallback((id: string) => {
    return enabledCategoryIds.includes(id);
  }, [enabledCategoryIds]);

  const getEnabledCategories = useCallback(() => {
    return ALL_CATEGORIES.filter(c => enabledCategoryIds.includes(c.id));
  }, [enabledCategoryIds]);

  const getDisabledCategories = useCallback(() => {
    return ALL_CATEGORIES.filter(c => !enabledCategoryIds.includes(c.id));
  }, [enabledCategoryIds]);

  return (
    <CategoryContext.Provider
      value={{
        enabledCategoryIds,
        enableCategory,
        disableCategory,
        isEnabled,
        getEnabledCategories,
        getDisabledCategories,
        isLoading,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoryProvider');
  }
  return context;
}
