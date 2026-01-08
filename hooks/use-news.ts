import { useCallback, useEffect, useRef, useState } from "react";

// API Configuration from environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "";
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || "";

// Pool of countries to fetch from for variety
const COUNTRIES = ["us", "gb", "ca", "au", "in", "de", "fr", "it", "es", "br"];

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  source?: string;
  image?: string;
}

export interface NewsResponse {
  success: boolean;
  count: number;
  type: string;
  articles: NewsArticle[];
}

export type TopicType =
  | "WORLD"
  | "BUSINESS"
  | "TECHNOLOGY"
  | "SCIENCE"
  | "ENTERTAINMENT"
  | "SPORTS"
  | "HEALTH";

interface UseNewsOptions {
  type?: "headlines" | "topic" | "search" | "geo";
  topic?: TopicType;
  query?: string;
  location?: string;
  n?: number;
  country?: string;
  language?: string;
}

interface UseNewsResult {
  articles: NewsArticle[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deduplicate articles by link
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    if (seen.has(article.link)) {
      return false;
    }
    seen.add(article.link);
    return true;
  });
}

export function useNews(options: UseNewsOptions = {}): UseNewsResult {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const countryIndexRef = useRef(0);
  const loadedCountriesRef = useRef<Set<string>>(new Set());

  const {
    type = "headlines",
    topic,
    query,
    location,
    n = 20,
    country,
    language = "en",
  } = options;

  // Fetch initial news
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    countryIndexRef.current = 0;
    loadedCountriesRef.current = new Set();

    try {
      const initialCountry = country || COUNTRIES[0];
      loadedCountriesRef.current.add(initialCountry);

      const params = new URLSearchParams({
        type,
        n: String(n),
        country: initialCountry,
        language,
      });

      if (topic) params.set("topic", topic);
      if (query) params.set("query", query);
      if (location) params.set("location", location);

      const response = await fetch(`${API_BASE_URL}/api/news?${params}`, {
        headers: {
          'X-API-Key': API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: NewsResponse = await response.json();

      if (!data.success) {
        throw new Error("Failed to fetch news");
      }

      setArticles(shuffleArray(data.articles));
      setHasMore(true);
      countryIndexRef.current = 1;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setArticles([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [type, topic, query, location, n, country, language]);

  // Load more news from different countries for variety
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      // Cycle through countries for more content
      const nextCountryIndex = countryIndexRef.current % COUNTRIES.length;
      const nextCountry = COUNTRIES[nextCountryIndex];

      // If we've cycled through all countries, we're done
      if (loadedCountriesRef.current.has(nextCountry) && loadedCountriesRef.current.size >= COUNTRIES.length) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }

      loadedCountriesRef.current.add(nextCountry);
      countryIndexRef.current++;

      const params = new URLSearchParams({
        type,
        n: String(n),
        country: nextCountry,
        language,
      });

      if (topic) params.set("topic", topic);
      if (query) params.set("query", query);
      if (location) params.set("location", location);

      const response = await fetch(`${API_BASE_URL}/api/news?${params}`, {
        headers: {
          'X-API-Key': API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: NewsResponse = await response.json();

      if (!data.success || data.articles.length === 0) {
        // Try next country if this one has no articles
        if (countryIndexRef.current < COUNTRIES.length) {
          setLoadingMore(false);
          loadMore();
          return;
        }
        setHasMore(false);
        return;
      }

      // Add new articles, deduplicate and shuffle the new ones
      setArticles((prev) => {
        const combined = [...prev, ...shuffleArray(data.articles)];
        return deduplicateArticles(combined);
      });

      // Check if we've loaded from all countries
      if (loadedCountriesRef.current.size >= COUNTRIES.length) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more:", err);
      // Don't show error for load more, just stop
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, type, topic, query, location, n, language]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    articles,
    loading,
    loadingMore,
    error,
    hasMore,
    refresh: fetchNews,
    loadMore,
  };
}
