import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useMutation } from "convex/react";
import { Image } from "expo-image";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { api } from "@/convex/_generated/api";
import { useDirectChat } from "@/contexts/direct-chat-context";
import { Id } from "@/convex/_generated/dataModel";

type Tab = "search" | "received" | "sent";

// Type definitions for friend requests (matches Convex return types)
interface RequestUser {
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface ReceivedRequest {
  _id: Id<"friendRequests">;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  fromUser: RequestUser | null;
}

interface SentRequest {
  _id: Id<"friendRequests">;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  toUser: RequestUser | null;
}

export default function FriendRequestScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { openConversationWithUser } = useDirectChat();

  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Queries
  const searchResults = useQuery(
    api.userProfiles.searchByUsername,
    userId && searchQuery.length >= 2
      ? { query: searchQuery, currentUserId: userId }
      : "skip"
  );

  const pendingReceived = useQuery(
    api.friendRequests.getPendingReceived,
    userId ? { userId } : "skip"
  );

  const pendingSent = useQuery(
    api.friendRequests.getPendingSent,
    userId ? { userId } : "skip"
  );

  const friends = useQuery(
    api.friendRequests.getFriends,
    userId ? { userId } : "skip"
  );

  // Mutations
  const sendRequest = useMutation(api.friendRequests.sendRequest);
  const acceptRequest = useMutation(api.friendRequests.acceptRequest);
  const rejectRequest = useMutation(api.friendRequests.rejectRequest);

  const handleSendRequest = useCallback(
    async (username: string) => {
      if (!userId) return;

      try {
        const result = await sendRequest({
          fromUserId: userId,
          toUsername: username,
        });

        if (!result.success) {
          console.error("Failed to send request:", result.error);
        }
      } catch (error) {
        console.error("Error sending request:", error);
      }
    },
    [userId, sendRequest]
  );

  const handleAcceptRequest = useCallback(
    async (requestId: Id<"friendRequests">) => {
      if (!userId) return;

      try {
        const result = await acceptRequest({
          requestId,
          currentUserId: userId,
        });

        if (result.success && result.conversationId) {
          // Open the conversation
          router.replace({
            pathname: "/conversation",
            params: { conversationId: result.conversationId },
          });
        }
      } catch (error) {
        console.error("Error accepting request:", error);
      }
    },
    [userId, acceptRequest]
  );

  const handleRejectRequest = useCallback(
    async (requestId: Id<"friendRequests">) => {
      if (!userId) return;

      try {
        await rejectRequest({
          requestId,
          currentUserId: userId,
        });
      } catch (error) {
        console.error("Error rejecting request:", error);
      }
    },
    [userId, rejectRequest]
  );

  const handleOpenChat = useCallback(
    async (otherUserId: string) => {
      const conversationId = await openConversationWithUser(otherUserId);
      if (conversationId) {
        router.replace({
          pathname: "/conversation",
          params: { conversationId },
        });
      }
    },
    [openConversationWithUser]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // Check if user is already a friend or has pending request
  const isAlreadyConnected = useCallback(
    (clerkId: string) => {
      const isFriend = friends?.some((f) => f?.clerkId === clerkId);
      const hasSentRequest = pendingSent?.some((r) => r.toUserId === clerkId);
      const hasReceivedRequest = pendingReceived?.some(
        (r) => r.fromUserId === clerkId
      );
      return { isFriend, hasSentRequest, hasReceivedRequest };
    },
    [friends, pendingSent, pendingReceived]
  );

  const renderSearchResult = useCallback(
    ({
      item,
    }: {
      item: {
        clerkId: string;
        username: string;
        displayName?: string;
        avatarUrl?: string;
        isOnline: boolean;
      };
    }) => {
      const { isFriend, hasSentRequest, hasReceivedRequest } =
        isAlreadyConnected(item.clerkId);

      return (
        <View style={[styles.userItem, isDark && styles.userItemDark]}>
          <View style={styles.avatarContainer}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {(item.displayName || item.username).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {item.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, isDark && styles.textDark]}>
              {item.displayName || `@${item.username}`}
            </Text>
            {item.displayName && (
              <Text style={[styles.userHandle, isDark && styles.textMuted]}>
                @{item.username}
              </Text>
            )}
          </View>

          {isFriend ? (
            <Pressable
              style={styles.chatButton}
              onPress={() => handleOpenChat(item.clerkId)}
            >
              <Ionicons name="chatbubble" size={18} color="#fff" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </Pressable>
          ) : hasSentRequest ? (
            <View style={[styles.statusBadge, styles.pendingBadge]}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          ) : hasReceivedRequest ? (
            <Pressable
              style={styles.acceptButton}
              onPress={() => {
                const request = pendingReceived?.find(
                  (r) => r.fromUserId === item.clerkId
                );
                if (request) handleAcceptRequest(request._id);
              }}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.addButton}
              onPress={() => handleSendRequest(item.username)}
            >
              <Ionicons name="person-add" size={18} color="#fff" />
            </Pressable>
          )}
        </View>
      );
    },
    [
      isDark,
      isAlreadyConnected,
      handleSendRequest,
      handleAcceptRequest,
      handleOpenChat,
      pendingReceived,
    ]
  );

  const renderReceivedRequest = useCallback(
    ({ item }: { item: ReceivedRequest }) => {
      if (!item?.fromUser) return null;

      return (
        <View style={[styles.userItem, isDark && styles.userItemDark]}>
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(item.fromUser.displayName || item.fromUser.username)
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, isDark && styles.textDark]}>
              {item.fromUser.displayName || `@${item.fromUser.username}`}
            </Text>
            <Text style={[styles.userHandle, isDark && styles.textMuted]}>
              @{item.fromUser.username}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <Pressable
              style={styles.acceptButton}
              onPress={() => handleAcceptRequest(item._id)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </Pressable>
            <Pressable
              style={styles.rejectButton}
              onPress={() => handleRejectRequest(item._id)}
            >
              <Ionicons name="close" size={20} color="#ff3b30" />
            </Pressable>
          </View>
        </View>
      );
    },
    [isDark, handleAcceptRequest, handleRejectRequest]
  );

  const renderSentRequest = useCallback(
    ({ item }: { item: SentRequest }) => {
      if (!item?.toUser) return null;

      return (
        <View style={[styles.userItem, isDark && styles.userItemDark]}>
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(item.toUser.displayName || item.toUser.username)
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, isDark && styles.textDark]}>
              {item.toUser.displayName || `@${item.toUser.username}`}
            </Text>
            <Text style={[styles.userHandle, isDark && styles.textMuted]}>
              @{item.toUser.username}
            </Text>
          </View>

          <View style={[styles.statusBadge, styles.pendingBadge]}>
            <Text style={styles.pendingText}>Awaiting</Text>
          </View>
        </View>
      );
    },
    [isDark]
  );

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#007AFF" />
        </Pressable>
        <Text style={[styles.title, isDark && styles.textDark]}>
          Friend Requests
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, isDark && styles.tabsDark]}>
        <Pressable
          style={[styles.tab, activeTab === "search" && styles.tabActive]}
          onPress={() => setActiveTab("search")}
        >
          <Text
            style={[
              styles.tabText,
              isDark && styles.textMuted,
              activeTab === "search" && styles.tabTextActive,
            ]}
          >
            Search
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "received" && styles.tabActive]}
          onPress={() => setActiveTab("received")}
        >
          <Text
            style={[
              styles.tabText,
              isDark && styles.textMuted,
              activeTab === "received" && styles.tabTextActive,
            ]}
          >
            Received
            {(pendingReceived?.length || 0) > 0 && (
              <Text style={styles.tabBadge}> ({pendingReceived?.length})</Text>
            )}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "sent" && styles.tabActive]}
          onPress={() => setActiveTab("sent")}
        >
          <Text
            style={[
              styles.tabText,
              isDark && styles.textMuted,
              activeTab === "sent" && styles.tabTextActive,
            ]}
          >
            Sent
          </Text>
        </Pressable>
      </View>

      {/* Search Tab */}
      {activeTab === "search" && (
        <View style={styles.content}>
          <View
            style={[styles.searchContainer, isDark && styles.searchContainerDark]}
          >
            <Ionicons name="search" size={18} color="#8e8e93" />
            <TextInput
              style={[styles.searchInput, isDark && styles.textDark]}
              placeholder="Search by username..."
              placeholderTextColor="#8e8e93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#8e8e93" />
              </Pressable>
            )}
          </View>

          {searchQuery.length < 2 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="search"
                size={48}
                color={isDark ? "#444" : "#ccc"}
              />
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                Enter at least 2 characters to search
              </Text>
            </View>
          ) : searchResults === undefined ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="person-outline"
                size={48}
                color={isDark ? "#444" : "#ccc"}
              />
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                No users found
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.clerkId}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Received Requests Tab */}
      {activeTab === "received" && (
        <View style={styles.content}>
          {!pendingReceived?.length ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="mail-open-outline"
                size={48}
                color={isDark ? "#444" : "#ccc"}
              />
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                No pending requests
              </Text>
            </View>
          ) : (
            <FlatList
              data={pendingReceived}
              renderItem={renderReceivedRequest}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* Sent Requests Tab */}
      {activeTab === "sent" && (
        <View style={styles.content}>
          {!pendingSent?.length ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="paper-plane-outline"
                size={48}
                color={isDark ? "#444" : "#ccc"}
              />
              <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                No sent requests
              </Text>
            </View>
          ) : (
            <FlatList
              data={pendingSent}
              renderItem={renderSentRequest}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
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
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
  },
  textDark: {
    color: "#fff",
  },
  textMuted: {
    color: "#8e8e93",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
    gap: 8,
  },
  tabsDark: {
    backgroundColor: "#1c1c1e",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  tabBadge: {
    color: "#ff3b30",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f7",
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
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
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  userItemDark: {
    backgroundColor: "#000",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  userHandle: {
    fontSize: 14,
    color: "#8e8e93",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffe5e5",
    justifyContent: "center",
    alignItems: "center",
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: "#f0f0f0",
  },
  pendingText: {
    fontSize: 13,
    color: "#8e8e93",
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#8e8e93",
    textAlign: "center",
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
