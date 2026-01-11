import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/use-color-scheme";

type BackupMode = "setup" | "restore" | "reset";

interface KeyBackupModalProps {
  visible: boolean;
  mode: BackupMode;
  onSubmit: (pin: string) => Promise<boolean>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function KeyBackupModal({
  visible,
  mode,
  onSubmit,
  onCancel,
  isLoading = false,
}: KeyBackupModalProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const getTitle = () => {
    switch (mode) {
      case "setup":
        return "Protect Your Chats";
      case "restore":
        return "Restore Chat History";
      case "reset":
        return "Reset Security Code";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "setup":
        return "Set a 6-digit PIN to back up your security keys. You will need this to access chats on other devices.";
      case "restore":
        return "Enter your backup PIN to restore your chat history on this device.";
      case "reset":
        return "Forgot your PIN? This will create a NEW security code. Previous chat history will become unreadable.";
    }
  };

  const handleSubmit = async () => {
    if (pin.length !== 6) {
      Alert.alert("Error", "PIN must be exactly 6 digits");
      return;
    }

    if ((mode === "setup" || mode === "reset") && pin !== confirmPin) {
      Alert.alert("Error", "PINs do not match");
      return;
    }

    const success = await onSubmit(pin);
    if (success) {
      setPin("");
      setConfirmPin("");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, isDark && styles.containerDark]}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={mode === "restore" ? "key" : "shield-checkmark"}
              size={48}
              color="#007AFF"
            />
          </View>

          <Text style={[styles.title, isDark && styles.textDark]}>
            {getTitle()}
          </Text>
          <Text style={[styles.description, isDark && styles.textMuted]}>
            {getDescription()}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDark && styles.textDark]}>
              {mode === "restore" ? "Enter PIN" : "Create PIN"}
            </Text>
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              placeholder="Enter 6 digits"
              placeholderTextColor="#999"
              autoFocus
            />
          </View>

          {(mode === "setup" || mode === "reset") && (
            <View style={styles.inputContainer}>
              <Text style={[styles.label, isDark && styles.textDark]}>
                Confirm PIN
              </Text>
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                placeholder="Confirm 6-digit PIN"
                placeholderTextColor="#999"
              />
            </View>
          )}

          <View style={styles.actions}>
            {onCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                mode === "reset" && styles.dangerButton,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !pin}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === "restore" ? "Unlock" : mode === "reset" ? "Reset Keys" : "Save PIN"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  containerDark: {
    backgroundColor: "#1c1c1e",
  },
  iconContainer: {
    marginBottom: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,122,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#f2f2f7",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: "#000",
  },
  inputDark: {
    backgroundColor: "#2c2c2e",
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  submitButton: {
    backgroundColor: "#007AFF",
  },
  dangerButton: {
    backgroundColor: "#FF3B30",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  textDark: {
    color: "#fff",
  },
  textMuted: {
    color: "#8e8e93",
  },
});
