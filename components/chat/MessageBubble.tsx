import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import TickStatus from "./TickStatus";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp: number;
  status?: "sent" | "delivered" | "read";
  messageType?: "text" | "emoji";
}

export default function MessageBubble({
  content,
  isOwn,
  timestamp,
  status,
  messageType = "text",
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const formattedTime = useMemo(() => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }, [timestamp]);

  const isEmoji = messageType === "emoji" || /^[\p{Emoji}]+$/u.test(content);

  if (isEmoji && content.length <= 8) {
    return (
      <View
        style={[
          styles.emojiContainer,
          isOwn ? styles.emojiContainerOwn : styles.emojiContainerOther,
        ]}
      >
        <Text style={styles.emojiText}>{content}</Text>
        <View style={styles.emojiFooter}>
          <Text style={[styles.emojiTime, isDark && styles.textMuted]}>
            {formattedTime}
          </Text>
          {isOwn && status && <TickStatus status={status} size={14} />}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bubble,
        isOwn
          ? [styles.bubbleOwn, isDark && styles.bubbleOwnDark]
          : [styles.bubbleOther, isDark && styles.bubbleOtherDark],
      ]}
    >
      <Text
        style={[
          styles.messageText,
          isOwn
            ? styles.messageTextOwn
            : [styles.messageTextOther, isDark && styles.messageTextOtherDark],
        ]}
      >
        {content}
      </Text>
      <View style={styles.footer}>
        <Text
          style={[
            styles.time,
            isOwn ? styles.timeOwn : [styles.timeOther, isDark && styles.timeOtherDark],
          ]}
        >
          {formattedTime}
        </Text>
        {isOwn && status && <TickStatus status={status} size={14} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginVertical: 2,
  },
  bubbleOwn: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    borderBottomRightRadius: 6,
    marginLeft: 50,
  },
  bubbleOwnDark: {
    backgroundColor: "#0A84FF",
  },
  bubbleOther: {
    backgroundColor: "#E5E5EA",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 6,
    marginRight: 50,
  },
  bubbleOtherDark: {
    backgroundColor: "#3A3A3C",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: "#fff",
  },
  messageTextOther: {
    color: "#000",
  },
  messageTextOtherDark: {
    color: "#fff",
  },
  textMuted: {
    color: "#8e8e93",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  timeOwn: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  timeOther: {
    color: "#65656B",
  },
  timeOtherDark: {
    color: "#98989F",
  },
  emojiContainer: {
    marginVertical: 2,
    padding: 4,
  },
  emojiContainerOwn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  emojiContainerOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  emojiText: {
    fontSize: 48,
  },
  emojiFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  emojiTime: {
    fontSize: 11,
    color: "#65656B",
  },
});
