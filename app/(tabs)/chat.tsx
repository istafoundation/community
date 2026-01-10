import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDirectChat, ConversationPreview } from "@/contexts/direct-chat-context";
import ConversationItem from "@/components/chat/ConversationItem";

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const {
    conversations,
    isLoadingConversations,
    setCurrentConversation,
    pendingRequestCount,
    syncProfile,
  } = useDirectChat();

  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.otherUser?.username.toLowerCase().includes(query) ||
      conv.otherUser?.displayName?.toLowerCase().includes(query)
    );
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await syncProfile();
    setIsRefreshing(false);
  }, [syncProfile]);

  const handleConversationPress = useCallback(
    (conversation: ConversationPreview) => {
      setCurrentConversation(conversation._id);
      router.push({
        pathname: "/conversation",
        params: { conversationId: conversation._id },
      });
    },
    [setCurrentConversation]
  );

  const handleNewChat = useCallback(() => {
    router.push("/friend-request");
  }, []);

  const renderConversation = useCallback(
    ({ item }: { item: ConversationPreview }) => {
      if (!item.otherUser) return null;

      return (
        <ConversationItem
          username={item.otherUser.username}
          displayName={item.otherUser.displayName}
          avatarUrl={item.otherUser.avatarUrl}
          lastMessage={item.lastMessagePreview}
          lastMessageAt={item.lastMessageAt}
          unreadCount={item.unreadCount}
          isOnline={item.otherUser.isOnline}
          onPress={() => handleConversationPress(item)}
        />
      );
    },
    [handleConversationPress]
  );

  if (!isSignedIn) {
    return (
      <View style={[styles.container, isDark && styles.containerDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Ionicons name="chatbubbles" size={28} color="#007AFF" />
          <Text style={[styles.title, isDark && styles.textDark]}>Chats</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={64}
            color={isDark ? "#444" : "#ccc"}
          />
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
            Sign in required
          </Text>
          <Text style={[styles.emptySubtitle, isDark && styles.textMuted]}>
            Please sign in to start chatting with friends
          </Text>
          <Pressable
            style={styles.signInButton}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Ionicons name="chatbubbles" size={28} color="#007AFF" />
        <Text style={[styles.title, isDark && styles.textDark]}>Chats</Text>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.iconButton}
            onPress={handleNewChat}
          >
            <View style={styles.iconButtonInner}>
              <Ionicons
                name="person-add-outline"
                size={22}
                color="#007AFF"
              />
              {pendingRequestCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingRequestCount > 9 ? "9+" : pendingRequestCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
        <Ionicons name="search" size={18} color="#8e8e93" />
        <TextInput
          style={[styles.searchInput, isDark && styles.textDark]}
          placeholder="Search chats..."
          placeholderTextColor="#8e8e93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#8e8e93" />
          </Pressable>
        )}
      </View>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={isDark ? "#444" : "#ccc"}
          />
          <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
            No conversations yet
          </Text>
          <Text style={[styles.emptySubtitle, isDark && styles.textMuted]}>
            Start a new chat by adding friends
          </Text>
          <Pressable style={styles.newChatButton} onPress={handleNewChat}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.newChatButtonText}>Add Friends</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
            />
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, isDark && styles.separatorDark]} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB for new chat */}
      {filteredConversations.length > 0 && (
        <Pressable style={styles.fab} onPress={handleNewChat}>
          <Ionicons name="create-outline" size={26} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  containerDark: {
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: -0.5,
    flex: 1,
  },
  textDark: {
    color: "#fff",
  },
  textMuted: {
    color: "#8e8e93",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  iconButtonInner: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#ff3b30",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchContainerDark: {
    backgroundColor: "#1c1c1e",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8e8e93",
    textAlign: "center",
    marginBottom: 24,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  newChatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signInButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginLeft: 84,
  },
  separatorDark: {
    backgroundColor: "#2c2c2e",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
