import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  StatusBar,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDirectChat, DirectMessage, DECRYPTION_FAILED_FLAG } from "@/contexts/direct-chat-context";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import MessageBubble from "@/components/chat/MessageBubble";

export default function ConversationScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ 
    conversationId: string;
    initialUsername?: string;
    initialDisplayName?: string;
    initialAvatarUrl?: string;
    initialLastSeen?: string;
    initialIsOnline?: string;
  }>();
  const conversationId = params.conversationId as Id<"conversations">;

  const { sendMessage, setCurrentConversation, currentMessages } = useDirectChat();
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Selection mode state: Set of selected message IDs
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  
  // Keyboard visibility state
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
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
      const lastMessage = messages[messages.length - 1]; // Latest message (end of array)
      if (lastMessage.senderId !== userId && lastMessage.status !== "read") {
        markAsReadMutation({
          conversationId,
          readerId: userId,
        }).catch(console.error);
      }
    }
  }, [messages, conversationId, userId, markAsReadMutation]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending) return;
    const message = inputText.trim();
    setInputText("");
    setIsSending(true);
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

  // Reverse messages for inverted FlatList
  const invertedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  const renderMessage = useCallback(
    ({ item, index }: { item: DirectMessage; index: number }) => {
      const isOwn = item.senderId === userId;
      // In inverted list:
      // index is current message
      // index + 1 is the *previous* message in time (older)
      const prevMessage = invertedMessages[index + 1];
      
      const showDateHeader =
        !prevMessage ||
        new Date(item.createdAt).toDateString() !== new Date(prevMessage.createdAt).toDateString();
      
      const isSelected = selectedMessageIds.has(item._id);

      return (
        <View>
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
              messageType={item.messageType as any}
            />
          </Pressable>
        </View>
      );
    },
    [userId, invertedMessages, isDark, selectedMessageIds, handleMessageLongPress, handleMessagePress]
  );
  
  const otherUser = conversationDetails?.otherUser || {
    username: params.initialUsername || "User",
    displayName: params.initialDisplayName,
    avatarUrl: params.initialAvatarUrl,
    lastSeen: params.initialLastSeen ? parseInt(params.initialLastSeen) : 0,
    isOnline: params.initialIsOnline === "true",
  };

  if (!conversationDetails && !params.initialUsername) {
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

  const isSelectionMode = selectedMessageIds.size > 0;
  const hasDecryptionErrors = useMemo(() => {
    return messages.some(m => m.content === DECRYPTION_FAILED_FLAG);
  }, [messages]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header - Fixed at top */}
      <View style={{ paddingTop: insets.top, backgroundColor: isDark ? "#1c1c1e" : "#fff", zIndex: 10 }}>
        {isSelectionMode ? (
          <View style={[styles.selectionHeader, isDark && styles.selectionHeaderDark]}>
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
          <View style={[styles.header, isDark && styles.headerDark]}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#007AFF" />
            </Pressable>
            <Pressable style={styles.headerContent}>
              <View style={styles.avatarSmall}>
                {otherUser?.avatarUrl ? (
                  <Image
                    source={{ uri: otherUser.avatarUrl }}
                    style={{ width: 40, height: 40, borderRadius: 20 }}
                  />
                ) : (
                  <Text style={styles.avatarInitialSmall}>
                    {(otherUser?.displayName || otherUser?.username || "?").charAt(0).toUpperCase()}
                  </Text>
                )}
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
      </View>
      
      {/* Security Banner */}
      {hasDecryptionErrors && (
        <View style={[styles.securityBanner, isDark && styles.securityBannerDark]}>
            <Ionicons name="lock-closed" size={14} color="#856404" />
            <Text style={[styles.securityBannerText, isDark && styles.securityBannerTextDark]}>
              Security code changed. Some messages are unavailable.
            </Text>
        </View>
      )}

      {/* Chat Content - different handling for iOS vs Android */}
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: isDark ? "#000" : "#f2f2f7" }}
          behavior="padding"
          keyboardVerticalOffset={insets.top + 56}
        >
          <FlatList
            ref={flatListRef}
            data={invertedMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            style={styles.chatArea}
            contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
          <View style={[styles.inputArea, isDark && styles.inputAreaDark, { paddingBottom: keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 12) }]}>
            <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
              <TextInput
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
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* Android: Manual keyboard height handling to avoid black gap */
        <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#f2f2f7" }}>
          <FlatList
            ref={flatListRef}
            data={invertedMessages}
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            style={styles.chatArea}
            contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
          <View style={[styles.inputArea, isDark && styles.inputAreaDark, { paddingBottom: keyboardHeight > 0 ? 8 : Math.max(insets.bottom, 12) }]}>
            <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
              <TextInput
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
          </View>
        </View>
      )}
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
    paddingHorizontal: 0,
    paddingVertical: 16,
  },
  messageRow: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginVertical: 1,
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
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingHorizontal: 16,
    paddingTop: 12,
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
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff3cd",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ffeeba",
    gap: 8,
  },
  securityBannerDark: {
    backgroundColor: "#2c2500",
    borderBottomColor: "#4d4100",
  },
  securityBannerText: {
    fontSize: 12,
    color: "#856404",
    fontWeight: "500",
  },
  securityBannerTextDark: {
    color: "#ffc107",
  },
});
