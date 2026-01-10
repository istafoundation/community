import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";

const EMOJI_CATEGORIES = {
  recent: ["👍", "❤️", "😂", "😢", "😮", "😡", "🎉", "🔥"],
  smileys: [
    "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊",
    "😇", "🙂", "😉", "😌", "😍", "🥰", "😘", "😗",
    "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤔",
    "🤐", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
    "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤",
    "😡", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡",
  ],
  gestures: [
    "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️",
    "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆",
    "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙",
    "💪", "🙏", "🤝", "👏", "🙌", "👐", "🤲", "❤️",
  ],
  objects: [
    "🎉", "🎊", "🎁", "🎂", "🎈", "🔥", "💯", "⭐",
    "🌟", "✨", "💥", "💫", "🌈", "☀️", "🌙", "⚡",
    "❄️", "🌸", "🌺", "🌻", "🍀", "🏆", "🥇", "🎯",
    "💎", "💰", "💵", "📱", "💻", "🎮", "🎧", "📷",
  ],
};

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export default function EmojiPicker({
  visible,
  onClose,
  onEmojiSelect,
}: EmojiPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeCategory, setActiveCategory] = React.useState<keyof typeof EMOJI_CATEGORIES>("smileys");

  const handleEmojiPress = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, isDark && styles.containerDark]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, isDark && styles.textDark]}>
              Emoji
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#fff" : "#000"}
              />
            </Pressable>
          </View>

          {/* Category Tabs */}
          <View style={[styles.tabs, isDark && styles.tabsDark]}>
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.tab,
                  activeCategory === category && styles.tabActive,
                ]}
                onPress={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isDark && styles.textMuted,
                    activeCategory === category && styles.tabTextActive,
                  ]}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Emoji Grid */}
          <ScrollView style={styles.emojiGrid} showsVerticalScrollIndicator={false}>
            <View style={styles.emojiRow}>
              {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
                <Pressable
                  key={`${emoji}-${index}`}
                  style={styles.emojiButton}
                  onPress={() => handleEmojiPress(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
    paddingBottom: 34, // Safe area
  },
  containerDark: {
    backgroundColor: "#1c1c1e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  textDark: {
    color: "#fff",
  },
  textMuted: {
    color: "#8e8e93",
  },
  closeButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
  },
  tabsDark: {
    backgroundColor: "#2c2c2e",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  emojiGrid: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  emojiButton: {
    width: "12.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emoji: {
    fontSize: 28,
  },
});
