import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TickStatusProps {
  status: "sent" | "delivered" | "read";
  size?: number;
}

export default function TickStatus({ status, size = 16 }: TickStatusProps) {
  if (status === "sent") {
    // Single grey tick
    return (
      <View style={styles.container}>
        <Ionicons name="checkmark" size={size} color="#8e8e93" />
      </View>
    );
  }

  if (status === "delivered") {
    // Double grey tick
    return (
      <View style={styles.doubleTick}>
        <Ionicons name="checkmark" size={size} color="#8e8e93" style={styles.firstTick} />
        <Ionicons name="checkmark" size={size} color="#8e8e93" />
      </View>
    );
  }

  // Read - Double green tick
  return (
    <View style={styles.doubleTick}>
      <Ionicons name="checkmark" size={size} color="#34C759" style={styles.firstTick} />
      <Ionicons name="checkmark" size={size} color="#34C759" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  doubleTick: {
    flexDirection: "row",
    alignItems: "center",
  },
  firstTick: {
    marginRight: -8,
  },
});
