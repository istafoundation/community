import { Platform } from "react-native";
import Constants from "expo-constants";

// Lazy import to avoid crash in Expo Go
let Notifications: typeof import("expo-notifications") | null = null;

// Check if we're in Expo Go (push notifications don't work there since SDK 53)
const isExpoGo = Constants.appOwnership === "expo";

// Initialize notifications module only if not in Expo Go
async function getNotifications() {
  if (isExpoGo) {
    console.log("[Notifications] Running in Expo Go - push notifications disabled");
    return null;
  }
  
  if (!Notifications) {
    Notifications = await import("expo-notifications");
  }
  return Notifications;
}

// Configure notification handler (only in production builds)
export async function setupNotificationHandler() {
  const notif = await getNotifications();
  if (!notif) return;

  notif.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Register for push notifications and get token
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo) {
    console.log("[Notifications] Skipping push token registration in Expo Go");
    return null;
  }

  const notif = await getNotifications();
  if (!notif) return null;

  let token: string | null = null;

  if (Platform.OS === "android") {
    await notif.setNotificationChannelAsync("chat", {
      name: "Chat Messages",
      importance: notif.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#007AFF",
    });
  }

  // Check if we're on a physical device
  const { status: existingStatus } = await notif.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await notif.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[Notifications] Permission not granted");
    return null;
  }

  try {
    // For local builds, we use Expo's push token system
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (projectId) {
      const tokenData = await notif.getExpoPushTokenAsync({
        projectId,
      });
      token = tokenData.data;
    } else {
      // Fallback: try without projectId (may work in some scenarios)
      const tokenData = await notif.getExpoPushTokenAsync();
      token = tokenData.data;
    }
  } catch (error) {
    console.error("[Notifications] Error getting push token:", error);
  }

  return token;
}

// Send push notification via Expo Push API
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  if (!expoPushToken) return false;

  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data: data || {},
    priority: "high",
    channelId: "chat",
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result.data?.status === "ok";
  } catch (error) {
    console.error("[Notifications] Error sending push notification:", error);
    return false;
  }
}

// Handle notification response (when user taps notification)
export async function addNotificationResponseListener(
  callback: (response: { notification: { request: { content: { data: Record<string, unknown> } } } }) => void
) {
  const notif = await getNotifications();
  if (!notif) {
    // Return a dummy subscription for Expo Go
    return { remove: () => {} };
  }
  return notif.addNotificationResponseReceivedListener(callback);
}

// Handle foreground notifications
export async function addNotificationReceivedListener(
  callback: (notification: unknown) => void
) {
  const notif = await getNotifications();
  if (!notif) {
    return { remove: () => {} };
  }
  return notif.addNotificationReceivedListener(callback);
}

// Get last notification response (for handling app open from notification)
export async function getLastNotificationResponse() {
  const notif = await getNotifications();
  if (!notif) return null;
  return await notif.getLastNotificationResponseAsync();
}

