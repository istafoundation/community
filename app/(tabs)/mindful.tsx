import { useAuth } from '@clerk/clerk-expo';
import { useChat } from '@/contexts/chat-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  GestureResponderEvent,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SUGGESTED_PROMPTS = [
  { icon: '😔', text: "I'm feeling down" },
  { icon: '😰', text: "I'm anxious" },
  { icon: '🧘', text: "Breathing exercise" },
  { icon: '💭', text: "I need to vent" },
];

// Text formatting component
function FormattedText({ text, style }: { text: string; style: object }) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\n)/g);
  
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={index} style={{ fontWeight: '700' }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
          return (
            <Text key={index} style={{ fontStyle: 'italic' }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if (part === '\n') {
          return <Text key={index}>{'\n'}</Text>;
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

// Copy popup component
function CopyPopup({
  visible,
  position,
  onCopy,
  onClose,
  isDark,
}: {
  visible: boolean;
  position: { x: number; y: number };
  onCopy: () => void;
  onClose: () => void;
  isDark: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 15,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.popupOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.copyPopup,
            isDark && styles.copyPopupDark,
            {
              top: position.y - 50,
              left: Math.max(16, Math.min(position.x - 45, 300)),
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => {
              onCopy();
              onClose();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="copy-outline" size={18} color={isDark ? '#fff' : '#007AFF'} />
            <Text style={[styles.copyButtonText, isDark && { color: '#fff' }]}>Copy</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Animated message bubble with copy functionality
function MessageBubble({ 
  message, 
  isDark,
  onLongPress,
}: { 
  message: { id: string; role: string; content: string; isStreaming?: boolean }; 
  isDark: boolean;
  onLongPress: (content: string, event: GestureResponderEvent) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 120,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isUser = message.role === 'user';

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = (e: GestureResponderEvent) => {
    if (!message.isStreaming && message.content) {
      onLongPress(message.content, e);
    }
  };

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {!isUser && (
        <View style={styles.assistantAvatar}>
          <Ionicons name="heart" size={14} color="#fff" />
        </View>
      )}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={styles.messagePressable}
      >
        <Animated.View
          style={[
            styles.messageBubble,
            isUser 
              ? styles.userBubble 
              : [styles.assistantBubble, isDark && styles.assistantBubbleDark],
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <FormattedText
            text={message.content || ' '}
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : [styles.assistantMessageText, isDark && styles.textDark],
            ]}
          />
          {message.isStreaming && (
            <Text style={styles.cursor}>▋</Text>
          )}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function MindfulScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const [isSending, setIsSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Track if user is near the bottom of the chat (for auto-scroll behavior)
  const isUserNearBottomRef = useRef(true);
  const contentHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const layoutHeightRef = useRef(0);
  
  // Animated value for input area only
  const inputTranslateY = useRef(new Animated.Value(0)).current;
  const TAB_BAR_HEIGHT = 85;
  const INPUT_GAP = 8;
  
  // Threshold for considering user "near bottom" (in pixels)
  const NEAR_BOTTOM_THRESHOLD = 150;

  // Check if user is near the bottom
  const checkIfNearBottom = useCallback(() => {
    const distanceFromBottom = contentHeightRef.current - scrollOffsetRef.current - layoutHeightRef.current;
    isUserNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
  }, []);

  // Handle scroll events to track user position
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    checkIfNearBottom();
  }, [checkIfNearBottom]);

  // Check if there's a streaming message
  const hasStreamingMessage = messages.some(m => m.isStreaming);

  // Track content size changes - scroll to bottom during streaming or if user is near bottom
  const handleContentSizeChange = useCallback((width: number, height: number) => {
    contentHeightRef.current = height;
    checkIfNearBottom();
    
    // Always scroll during streaming, or if user is near the bottom
    if (flatListRef.current && messages.length > 0) {
      if (hasStreamingMessage || isUserNearBottomRef.current) {
        flatListRef.current.scrollToEnd({ animated: false });
      }
    }
  }, [checkIfNearBottom, messages.length, hasStreamingMessage]);

  // Track layout changes
  const handleLayout = useCallback((event: { nativeEvent: { layout: { height: number } } }) => {
    layoutHeightRef.current = event.nativeEvent.layout.height;
    checkIfNearBottom();
  }, [checkIfNearBottom]);

  // Force scroll to bottom (used when user sends message or keyboard opens)
  const scrollToBottom = useCallback((force = false) => {
    if (flatListRef.current && messages.length > 0) {
      if (force || hasStreamingMessage || isUserNearBottomRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
        // Reset to near bottom after forced scroll
        if (force) {
          isUserNearBottomRef.current = true;
        }
      }
    }
  }, [messages.length, hasStreamingMessage]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kbHeight = e.endCoordinates.height;
      const targetHeight = Math.max(0, kbHeight - TAB_BAR_HEIGHT + INPUT_GAP);
      
      // Track keyboard height for dynamic padding - use raw keyboard height for better coverage
      setKeyboardHeight(kbHeight);
      
      // Only animate input up
      Animated.timing(inputTranslateY, {
        toValue: -targetHeight,
        duration: Platform.OS === 'ios' ? e.duration : 150,
        easing: Platform.OS === 'ios' 
          ? Easing.bezier(0.33, 0.01, 0, 1)
          : Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
      
      // Scroll chat to bottom
      scrollToBottom(true);
    });
    
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      // Reset keyboard height
      setKeyboardHeight(0);
      
      Animated.timing(inputTranslateY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 200) : 150,
        easing: Platform.OS === 'ios' 
          ? Easing.bezier(0.33, 0.01, 0, 1)
          : Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToBottom]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (hasStreamingMessage || isUserNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, hasStreamingMessage]);

  // Scroll to bottom when keyboard height changes (after padding is applied)
  useEffect(() => {
    if (keyboardHeight > 0) {
      scrollToBottom(true);
    }
  }, [keyboardHeight, scrollToBottom]);
  
  // Block sending while either sending initial request OR while streaming response
  const isProcessing = isSending || hasStreamingMessage || isLoading;

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isProcessing) return;
    const text = inputText;
    setInputText('');
    setIsSending(true);
    
    // Re-focus input to ensure keyboard stays open
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    
    // Force scroll to bottom when sending a message
    isUserNearBottomRef.current = true;
    scrollToBottom(true);
    
    try {
      await sendMessage(text);
    } finally {
      setIsSending(false);
      // Force scroll to bottom after message is sent
      scrollToBottom(true);
    }
  }, [inputText, isProcessing, sendMessage, scrollToBottom]);

  // Copy popup state
  const [copyPopupVisible, setCopyPopupVisible] = useState(false);
  const [copyPopupPosition, setCopyPopupPosition] = useState({ x: 0, y: 0 });
  const [textToCopy, setTextToCopy] = useState('');

  const handleMessageLongPress = useCallback((content: string, event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    setTextToCopy(content);
    setCopyPopupPosition({ x: pageX, y: pageY });
    setCopyPopupVisible(true);
  }, []);

  const handleCopy = useCallback(async () => {
    if (textToCopy) {
      // Use the deprecated but working Clipboard from react-native
      const { Clipboard } = require('react-native');
      Clipboard.setString(textToCopy);
    }
  }, [textToCopy]);

  // Render message item for FlatList
  const renderMessage = useCallback(({ item }: { item: typeof messages[0] }) => (
    <MessageBubble 
      message={item} 
      isDark={isDark} 
      onLongPress={handleMessageLongPress}
    />
  ), [isDark, handleMessageLongPress]);

  const keyExtractor = useCallback((item: typeof messages[0]) => item.id, []);

  // Auth gate
  const { isSignedIn } = useAuth();

  // Show login prompt for unauthenticated users
  if (!isSignedIn) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="heart" size={28} color="#007AFF" />
            <Text style={[styles.headerTitle, isDark && styles.textDark]}>Mindful</Text>
          </View>
        </View>

        {/* Auth Gate Content */}
        <View style={styles.authGateContainer}>
          <View style={[styles.authGateCard, isDark && styles.cardDark]}>
            <View style={styles.authGateIconContainer}>
              <Ionicons name="lock-closed" size={48} color="#007AFF" />
            </View>
            <Text style={[styles.authGateTitle, isDark && styles.textDark]}>
              Sign In Required
            </Text>
            <Text style={[styles.authGateSubtitle, isDark && styles.textMuted]}>
              Create an account to access your personal AI wellness companion. Your conversations are private and secure.
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable style={styles.authGateButton}>
                <Text style={styles.authGateButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </Link>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable style={[styles.authGateSecondaryButton, isDark && styles.authGateSecondaryButtonDark]}>
                <Text style={[styles.authGateSecondaryText, isDark && styles.textDark]}>
                  Create Account
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Copy Popup */}
      <CopyPopup
        visible={copyPopupVisible}
        position={copyPopupPosition}
        onCopy={handleCopy}
        onClose={() => setCopyPopupVisible(false)}
        isDark={isDark}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="heart" size={28} color="#007AFF" />
          <Text style={[styles.headerTitle, isDark && styles.textDark]}>Mindful</Text>
        </View>
        {messages.length > 0 && (
          <Pressable 
            onPress={clearChat} 
            style={[styles.clearBtn, isDark && styles.clearBtnDark]}
          >
            <Ionicons name="refresh-outline" size={18} color="#007AFF" />
          </Pressable>
        )}
      </View>

      {/* Chat Area - using FlatList for better performance */}
      {messages.length === 0 ? (
        // Welcome Screen - use ScrollView for welcome content
        <ScrollView 
          style={styles.chatArea}
          contentContainerStyle={[styles.chatContent, styles.chatContentEmpty]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.welcomeWrapper}>
            <View style={[styles.welcomeCard, isDark && styles.cardDark]}>
              <View style={styles.welcomeIconContainer}>
                <Ionicons name="chatbubbles" size={36} color="#007AFF" />
              </View>
              <Text style={[styles.welcomeTitle, isDark && styles.textDark]}>
                How are you feeling?
              </Text>
              <Text style={[styles.welcomeSubtitle, isDark && styles.textMuted]}>
                I'm here to listen without judgment.{'\n'}Share what's on your mind.
              </Text>
            </View>

            <View style={styles.quickActionsContainer}>
              <Text style={[styles.sectionLabel, isDark && styles.textMuted]}>
                Quick start
              </Text>
              <View style={styles.quickActions}>
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <Pressable
                    key={index}
                    style={[styles.quickAction, isDark && styles.quickActionDark]}
                    onPress={() => sendMessage(prompt.text)}
                  >
                    <Text style={styles.quickActionEmoji}>{prompt.icon}</Text>
                    <Text style={[styles.quickActionText, isDark && styles.textDark]}>
                      {prompt.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.disclaimer, isDark && styles.disclaimerDark]}>
              <Ionicons name="information-circle-outline" size={16} color="#8e8e93" />
              <Text style={styles.disclaimerText}>
                I'm an AI companion, not a substitute for professional mental health care.
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Messages - using FlatList for better performance with many messages
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.chatArea}
          contentContainerStyle={[
            styles.chatContent,
            { paddingBottom: 80 + keyboardHeight }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          scrollEventThrottle={16}
          ListFooterComponent={
            <>
              {isSending && !hasStreamingMessage && (
                <View style={[styles.messageRow, styles.messageRowAssistant]}>
                  <View style={styles.assistantAvatar}>
                    <Ionicons name="heart" size={14} color="#fff" />
                  </View>
                  <View style={[styles.typingBubble, isDark && styles.assistantBubbleDark]}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={[styles.typingText, isDark && styles.textMuted]}>
                      Thinking...
                    </Text>
                  </View>
                </View>
              )}

              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#ff3b30" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </>
          }
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={15}
        />
      )}

      {/* Input Area - moves up with keyboard */}
      <Animated.View 
        style={[
          styles.inputArea, 
          isDark && styles.inputAreaDark,
          { transform: [{ translateY: inputTranslateY }] }
        ]}
      >
        <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, isDark && styles.textInputDark]}
            placeholder={isProcessing ? "Wait for response..." : "Type a message..."}
            placeholderTextColor={isDark ? '#666' : '#999'}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() || isProcessing) && styles.sendBtnDisabled,
              isProcessing && styles.sendBtnLoading,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons 
                name="send" 
                size={18} 
                color={!inputText.trim() ? '#999' : '#fff'} 
              />
            )}
          </Pressable>
        </View>
      </Animated.View>
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
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
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
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnDark: {
    backgroundColor: '#007AFF30',
  },

  // Chat Area
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
  },
  chatContentEmpty: {
    flex: 1,
  },

  // Welcome
  welcomeWrapper: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
  },
  welcomeIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Quick Actions
  quickActionsContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
    marginBottom: 12,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionDark: {
    backgroundColor: '#1c1c1e',
  },
  quickActionEmoji: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  disclaimerDark: {},
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#8e8e93',
    lineHeight: 18,
  },

  // Messages
  messagesWrapper: {
    gap: 4,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  messagePressable: {
    flexShrink: 1,
    maxWidth: '80%',
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  assistantBubbleDark: {
    backgroundColor: '#1c1c1e',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: '#1a1a1a',
  },
  cursor: {
    fontSize: 15,
    color: '#007AFF',
  },

  // Typing
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  typingText: {
    fontSize: 13,
    color: '#8e8e93',
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ff3b3015',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#ff3b30',
    flex: 1,
  },

  // Input - positioned at bottom
  inputArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#f2f2f7',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputAreaDark: {
    backgroundColor: '#000',
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  inputBoxDark: {
    backgroundColor: '#1c1c1e',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInputDark: {
    color: '#fff',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#e0e0e0',
  },
  sendBtnLoading: {
    backgroundColor: '#007AFF',
  },

  // Copy Popup Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  copyPopup: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 90,
  },
  copyPopupDark: {
    backgroundColor: '#2c2c2e',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },

  // Auth Gate Styles
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authGateCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    maxWidth: 340,
    width: '100%',
  },
  authGateIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authGateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  authGateSubtitle: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  authGateButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  authGateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  authGateSecondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  authGateSecondaryButtonDark: {},
  authGateSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});
