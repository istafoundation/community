import { useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
const API_KEY = Constants.expoConfig?.extra?.apiKey || process.env.EXPO_PUBLIC_API_KEY;

// Typing speed in milliseconds per character
const TYPING_SPEED = 1;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  isInitialized: boolean;
  remainingMessages: number;
  isLimitReached: boolean;
  dailyLimit: number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function ChatProviderInner({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Convex queries and mutations
  const user = useQuery(api.users.getUser, userId ? { clerkId: userId } : "skip");
  const chatHistory = useQuery(api.chat.getChatHistory, userId ? { clerkId: userId } : "skip");
  const syncUserMutation = useMutation(api.users.syncUser);
  const checkAndIncrementMutation = useMutation(api.users.checkAndIncrementMessageCount);
  const addMessageMutation = useMutation(api.chat.addMessage);
  const clearChatMutation = useMutation(api.chat.clearChat);

  // Rate limit info
  const remainingMessages = user?.remainingMessages ?? 10;
  const isLimitReached = user?.isLimitReached ?? false;
  const dailyLimit = user?.limit ?? 10;

  // Sync user on login
  useEffect(() => {
    if (userId) {
      syncUserMutation({ clerkId: userId }).catch(console.error);
    }
  }, [userId, syncUserMutation]);

  // Load chat history from Convex
  useEffect(() => {
    if (chatHistory !== undefined) {
      // Filter out any streaming messages and convert to local format
      const validMessages = (chatHistory || [])
        .filter((msg: ChatMessage) => !('isStreaming' in msg && msg.isStreaming))
        .map((msg: ChatMessage) => ({
          ...msg,
          isStreaming: false,
        }));
      setMessages(validMessages);
      setIsInitialized(true);
    }
  }, [chatHistory]);

  // Cleanup streaming interval on unmount
  useEffect(() => {
    return () => {
      if (streamingIntervalRef.current) {
        clearInterval(streamingIntervalRef.current);
      }
    };
  }, []);

  const simulateStreaming = useCallback((fullContent: string, messageId: string) => {
    let currentIndex = 0;
    
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }

    const initialMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, initialMessage]);

    streamingIntervalRef.current = setInterval(() => {
      currentIndex += 1;
      
      if (currentIndex >= fullContent.length) {
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        
        // Update local state
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: fullContent, isStreaming: false }
              : msg
          )
        );
        
        // Persist to Convex
        if (userId) {
          addMessageMutation({
            clerkId: userId,
            message: {
              id: messageId,
              role: 'assistant',
              content: fullContent,
              timestamp: Date.now(),
            },
          }).catch(console.error);
        }
        
        setIsLoading(false);
      } else {
        const partialContent = fullContent.slice(0, currentIndex);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: partialContent }
              : msg
          )
        );
      }
    }, TYPING_SPEED);
  }, [userId, addMessageMutation]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !userId) return;

    // Check rate limit first
    if (isLimitReached) {
      setError('Daily message limit reached. Try again tomorrow.');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    abortControllerRef.current = new AbortController();

    try {
      // Check and increment rate limit
      const limitResult = await checkAndIncrementMutation({ clerkId: userId });
      
      if (!limitResult.allowed) {
        setError(limitResult.message || 'Message limit reached');
        setIsLoading(false);
        // Remove the user message we just added
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        return;
      }

      // Persist user message to Convex
      await addMessageMutation({
        clerkId: userId,
        message: {
          id: userMessage.id,
          role: 'user',
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        },
      });

      // Prepare messages for API (without streaming flags)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY || '',
        },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API Error (${response.status}): ${errorText.slice(0, 100)}`);
      }

      const data = await response.json();

      if (data.success && data.message) {
        const messageId = `assistant-${Date.now()}`;
        simulateStreaming(data.message.content, messageId);
      } else {
        throw new Error(data.error || 'Unknown error from API');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const rawError = err instanceof Error ? err.message : 'Something went wrong';
      
      if (rawError.includes('No response from AI') || rawError.includes('500')) {
        console.log('API Chat limit reached. Try again later.');
        setError('Chat limit reached. Please try again later.');
      } else {
        setError(rawError);
      }
      
      setIsLoading(false);
      console.error('Chat error:', err);
    }
  }, [messages, isLoading, userId, isLimitReached, simulateStreaming, checkAndIncrementMutation, addMessageMutation]);

  const clearChat = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setMessages([]);
    setError(null);
    setIsLoading(false);
    
    if (userId) {
      try {
        await clearChatMutation({ clerkId: userId });
      } catch (error) {
        console.error('[ChatContext] Failed to clear chat:', error);
      }
    }
  }, [userId, clearChatMutation]);

  return (
    <ChatContext.Provider value={{ 
      messages, 
      isLoading, 
      error, 
      sendMessage, 
      clearChat, 
      isInitialized,
      remainingMessages,
      isLimitReached,
      dailyLimit,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

// Convex client - lazily initialized
let convexClient: ConvexReactClient | null = null;

function getConvexClient() {
  if (!convexClient) {
    const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn('EXPO_PUBLIC_CONVEX_URL is not set');
      return null;
    }
    convexClient = new ConvexReactClient(convexUrl);
  }
  return convexClient;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const client = getConvexClient();
  
  // If Convex is not configured, render children without Convex
  if (!client) {
    return <ChatProviderFallback>{children}</ChatProviderFallback>;
  }
  
  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <ChatProviderInner>{children}</ChatProviderInner>
    </ConvexProviderWithClerk>
  );
}

// Fallback provider when Convex is not available
function ChatProviderFallback({ children }: { children: React.ReactNode }) {
  return (
    <ChatContext.Provider value={{
      messages: [],
      isLoading: false,
      error: 'Chat service not configured',
      sendMessage: async () => {},
      clearChat: () => {},
      isInitialized: true,
      remainingMessages: 0,
      isLimitReached: true,
      dailyLimit: 10,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
