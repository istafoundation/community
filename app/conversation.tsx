import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  StatusBar,
  Keyboard,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import * as Clipboard from "expo-clipboard";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDirectChat, DirectMessage } from "@/contexts/direct-chat-context";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import MessageBubble from "@/components/chat/MessageBubble";

export default function ConversationScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params.conversationId as Id<"conversations">;

  const { sendMessage, setCurrentConversation, currentMessages } = useDirectChat();
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Selection mode state: Set of selected message IDs
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  
  // Keyboard handling
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputTranslateY = useRef(new Animated.Value(0)).current;
  const TAB_BAR_HEIGHT = 0;
  const INPUT_GAP = 8;
  
  // Scroll tracking
  const isUserNearBottomRef = useRef(true);
  const NEAR_BOTTOM_THRESHOLD = 150;

  // Get conversation details
  const conversationDetails = useQuery(
    api.conversations.getConversation,
    conversationId && userId
      ? { conversationId, currentUserId: userId }
      : "skip"
  );

  const messages = currentMessages;

  const markAsReadMutation = useMutation(api.directMessages.markAsRead);
  const markAsDeliveredMutation = useMutation(api.directMessages.markAsDelivered);

  // Handle back button when in selection mode
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedMessageIds.size > 0) {
        setSelectedMessageIds(new Set());
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [selectedMessageIds]);

  // Set current conversation and mark as delivered/read
  useEffect(() => {
    if (conversationId && userId) {
      setCurrentConversation(conversationId);
      markAsDeliveredMutation({
        conversationId,
        recipientId: userId,
      }).catch(console.error);
      
      const timer = setTimeout(() => {
        markAsReadMutation({
          conversationId,
          readerId: userId,
        }).catch(console.error);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [conversationId, userId, setCurrentConversation, markAsReadMutation, markAsDeliveredMutation]);

  // Mark as read when new messages arrive
  useEffect(() => {
    if (conversationId && userId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderId !== userId && lastMessage.status !== "read") {
        markAsReadMutation({
          conversationId,
          readerId: userId,
        }).catch(console.error);
      }
    }
  }, [messages, conversationId, userId, markAsReadMutation]);

  // Keyboard handling
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const kbHeight = e.endCoordinates.height;
      const targetHeight = Math.max(0, kbHeight - TAB_BAR_HEIGHT + INPUT_GAP);
      setKeyboardHeight(kbHeight);

      Animated.timing(inputTranslateY, {
        toValue: -targetHeight,
        duration: Platform.OS === "ios" ? e.duration : 150,
        easing: Platform.OS === "ios" ? Easing.bezier(0.33, 0.01, 0, 1) : Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setKeyboardHeight(0);
      Animated.timing(inputTranslateY, {
        toValue: 0,
        duration: Platform.OS === "ios" ? (e?.duration || 200) : 150,
        easing: Platform.OS === "ios" ? Easing.bezier(0.33, 0.01, 0, 1) : Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0 && isUserNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    isUserNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) return;
    const message = inputText.trim();
    setInputText("");
    setIsSending(true);
    isUserNearBottomRef.current = true;
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
      inputRef.current?.focus();
    }, 50);
    await sendMessage(message, "text");
    setIsSending(false);
  }, [inputText, isSending, sendMessage]);

  const handleBack = useCallback(() => {
    if (selectedMessageIds.size > 0) {
      setSelectedMessageIds(new Set());
    } else {
      setCurrentConversation(null);
      router.back();
    }
  }, [selectedMessageIds, setCurrentConversation]);

  const handleMessageLongPress = useCallback((messageId: string) => {
    setSelectedMessageIds(prev => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
  }, []);

  const handleMessagePress = useCallback((messageId: string) => {
    setSelectedMessageIds(prev => {
      // If we are in selection mode (at least one item selected), toggle selection
      if (prev.size > 0) {
        const newSet = new Set(prev);
        if (newSet.has(messageId)) {
          newSet.delete(messageId);
        } else {
          newSet.add(messageId);
        }
        return newSet;
      }
      return prev;
    });
  }, []);

  const handleCopy = useCallback(async () => {
    if (selectedMessageIds.size > 0) {
      // Get selected messages in order
      const selectedContent = messages
        .filter(msg => selectedMessageIds.has(msg._id))
        .map(msg => msg.content)
        .join("\n");
        
      if (selectedContent) {
        await Clipboard.setStringAsync(selectedContent);
        setSelectedMessageIds(new Set());
      }
    }
  }, [selectedMessageIds, messages]);

  const handleClearSelection = useCallback(() => {
    setSelectedMessageIds(new Set());
  }, []);

  const formatLastSeen = (lastSeen: number) => {
    const diff = Date.now() - lastSeen;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    return `${days} days ago`;
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: DirectMessage; index: number }) => {
      const isOwn = item.senderId === userId;
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const showDateHeader =
        !prevMessage ||
        new Date(item.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();
      const isSelected = selectedMessageIds.has(item._id);

      return (
        <>
          {showDateHeader && (
            <View style={styles.dateHeader}>
              <Text style={[styles.dateText, isDark && styles.dateTextDark]}>
                {new Date(item.createdAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}
          <Pressable
            style={[
              styles.messageRow,
              isSelected && (isDark ? styles.selectedRowDark : styles.selectedRowLight),
            ]}
            onPress={() => handleMessagePress(item._id)}
            onLongPress={() => handleMessageLongPress(item._id)}
            delayLongPress={300}
          >
            <MessageBubble
              content={item.content}
              isOwn={isOwn}
              timestamp={item.createdAt}
              status={isOwn ? item.status : undefined}
              messageType={item.messageType}
            />
          </Pressable>
        </>
      );
    },
    [userId, messages, isDark, selectedMessageIds, handleMessageLongPress, handleMessagePress]
  );

  if (!conversationDetails) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={[styles.headerName, isDark && styles.textDark]}>Loading...</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  const otherUser = conversationDetails.otherUser;
  const isSelectionMode = selectedMessageIds.size > 0;

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Selection Mode Header */}
      {isSelectionMode ? (
        <View style={[styles.selectionHeader, isDark && styles.selectionHeaderDark, { paddingTop: insets.top }]}>
          <Pressable onPress={handleClearSelection} style={styles.backButton}>
            <Ionicons name="close" size={28} color={isDark ? "#fff" : "#000"} />
          </Pressable>
          <View style={styles.selectionHeaderContent}>
            <Text style={[styles.selectionCount, isDark && styles.textDark]}>
              {selectedMessageIds.size} selected
            </Text>
          </View>
          <Pressable onPress={handleCopy} style={styles.actionButton}>
            <Ionicons name="copy-outline" size={24} color={isDark ? "#fff" : "#000"} />
          </Pressable>
        </View>
      ) : (
        /* Normal Header */
        <View style={[styles.header, isDark && styles.headerDark, { paddingTop: insets.top }]}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </Pressable>
          <Pressable style={styles.headerContent}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarInitialSmall}>
                {(otherUser?.displayName || otherUser?.username || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerName, isDark && styles.textDark]}>
                {otherUser?.displayName || `@${otherUser?.username}`}
              </Text>
              <Text style={[styles.headerStatus, isDark && styles.textMuted]}>
                {otherUser?.isOnline ? "Online" : `last seen ${formatLastSeen(otherUser?.lastSeen || 0)}`}
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.chatArea}
        contentContainerStyle={[styles.messageList, { paddingBottom: 80 + keyboardHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (isUserNearBottomRef.current) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        removeClippedSubviews={Platform.OS === "android"}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
      />

      {/* Input Area */}
      <Animated.View
        style={[styles.inputArea, isDark && styles.inputAreaDark, { transform: [{ translateY: inputTranslateY }] }]}
      >
        <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, isDark && styles.textInputDark]}
            placeholder={isSending ? "Sending..." : "Type a message..."}
            placeholderTextColor={isDark ? "#666" : "#999"}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
            returnKeyType="default"
          />
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color={!inputText.trim() ? "#999" : "#fff"} />
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
    backgroundColor: "#f2f2f7",
  },
  containerDark: {
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerDark: {
    backgroundColor: "#1c1c1e",
    borderBottomColor: "#333",
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: "#007AFF",
  },
  selectionHeaderDark: {
    backgroundColor: "#0A84FF",
  },
  selectionHeaderContent: {
    flex: 1,
    paddingLeft: 8,
  },
  selectionCount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  actionButton: {
    padding: 12,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitialSmall: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  headerStatus: {
    fontSize: 13,
    color: "#34C759",
    marginTop: 1,
  },
  textDark: {
    color: "#fff",
  },
  textMuted: {
    color: "#8e8e93",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
  },
  messageRow: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  selectedRowLight: {
    backgroundColor: "rgba(0, 0, 0, 0.1)", // Dark overlay for light mode
  },
  selectedRowDark: {
    backgroundColor: "rgba(10, 132, 255, 0.25)", // Deep blue for dark mode
  },
  dateHeader: {
    alignItems: "center",
    marginVertical: 16,
  },
  dateText: {
    fontSize: 13,
    color: "#8e8e93",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  dateTextDark: {
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#8e8e93",
  },
  inputArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 34,
  },
  inputAreaDark: {
    backgroundColor: "#1c1c1e",
    borderTopColor: "#333",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f2f2f7",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  inputBoxDark: {
    backgroundColor: "#2c2c2e",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  textInputDark: {
    color: "#fff",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#e5e5e5",
  },
});
