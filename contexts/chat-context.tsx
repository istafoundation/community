import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@ista_chat_messages';

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
const API_KEY = Constants.expoConfig?.extra?.apiKey || process.env.EXPO_PUBLIC_API_KEY;

// Typing speed in milliseconds per character
const TYPING_SPEED = 1;

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const streamingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  // Save chat history whenever messages change (after initial load)
  useEffect(() => {
    if (isInitialized && messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages, isInitialized]);

  const loadChatHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        // Filter out any streaming messages from previous sessions
        const validMessages = parsed.filter(msg => !msg.isStreaming);
        setMessages(validMessages);
      }
    } catch (error) {
      console.error('[ChatContext] Failed to load chat history:', error);
    } finally {
      setIsInitialized(true);
    }
  };

  const saveChatHistory = async (msgs: ChatMessage[]) => {
    try {
      // Only save completed messages (not streaming ones)
      const toSave = msgs.filter(msg => !msg.isStreaming);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('[ChatContext] Failed to save chat history:', error);
    }
  };

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
    
    // Clear any existing interval
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }

    // Add initial empty streaming message
    const initialMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, initialMessage]);

    // Progressively reveal text
    streamingIntervalRef.current = setInterval(() => {
      currentIndex += 1;
      
      if (currentIndex >= fullContent.length) {
        // Streaming complete
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
          streamingIntervalRef.current = null;
        }
        
        // Update message to final state
        setMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, content: fullContent, isStreaming: false }
              : msg
          )
        );
        setIsLoading(false);
      } else {
        // Update with partial content
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
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Prepare messages for API
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
        // Start simulated streaming
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
      
      // Check for rate limit / no response error
      if (rawError.includes('No response from AI') || rawError.includes('500')) {
        console.log('API Chat limit reached. Try again later.');
        setError('Chat limit reached. Please try again later.');
      } else {
        setError(rawError);
      }
      
      setIsLoading(false);
      console.error('Chat error:', err);
    }
  }, [messages, isLoading, simulateStreaming]);

  const clearChat = useCallback(async () => {
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Clear any ongoing streaming
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
      streamingIntervalRef.current = null;
    }
    setMessages([]);
    setError(null);
    setIsLoading(false);
    
    // Clear from storage
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[ChatContext] Failed to clear chat history:', error);
    }
  }, []);

  return (
    <ChatContext.Provider value={{ messages, isLoading, error, sendMessage, clearChat, isInitialized }}>
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
