import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ConversationItemProps {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageAt: number;
  unreadCount: number;
  isOnline: boolean;
  onPress: () => void;
}

export default function ConversationItem({
  username,
  displayName,
  avatarUrl,
  lastMessage,
  lastMessageAt,
  unreadCount,
  isOnline,
  onPress,
}: ConversationItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const formattedTime = useMemo(() => {
    const date = new Date(lastMessageAt);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      date.toDateString() ===
      new Date(now.getTime() - 86400000).toDateString();

    if (isToday) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    if (isYesterday) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [lastMessageAt]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        isDark && styles.containerDark,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(displayName || username).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[styles.name, isDark && styles.textDark]}
            numberOfLines={1}
          >
            {displayName || `@${username}`}
          </Text>
          <Text
            style={[
              styles.time,
              unreadCount > 0 && styles.timeUnread,
              isDark && styles.textMuted,
            ]}
          >
            {formattedTime}
          </Text>
        </View>

        <View style={styles.messageRow}>
          <Text
            style={[
              styles.lastMessage,
              unreadCount > 0 && styles.lastMessageUnread,
              unreadCount > 0 && isDark && styles.lastMessageUnreadDark,
              unreadCount === 0 && isDark && styles.textMuted,
            ]}
            numberOfLines={1}
          >
            {lastMessage || "No messages yet"}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  containerDark: {
    backgroundColor: "#000",
  },
  pressed: {
    opacity: 0.7,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#fff",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
    flex: 1,
    marginRight: 8,
  },
  textDark: {
    color: "#fff",
  },
  textMuted: {
    color: "#8e8e93",
  },
  time: {
    fontSize: 14,
    color: "#8e8e93",
  },
  timeUnread: {
    color: "#007AFF",
    fontWeight: "500",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    fontSize: 15,
    color: "#8e8e93",
    flex: 1,
    marginRight: 8,
  },
  lastMessageUnread: {
    color: "#000",
    fontWeight: "500",
  },
  lastMessageUnreadDark: {
    color: "#fff",
  },
  badge: {
    backgroundColor: "#007AFF",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
