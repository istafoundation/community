import React, { createContext, useContext, useState, useCallback } from 'react';

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
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [enabledCategoryIds, setEnabledCategoryIds] = useState<string[]>(
    ALL_CATEGORIES.map(c => c.id)
  );

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
