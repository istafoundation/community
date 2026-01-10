import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  registerForPushNotificationsAsync,
  sendPushNotification,
  addNotificationResponseListener,
} from "../utils/notifications";
import {
  getOrCreateKeyPair,
  encryptMessage,
  decryptMessage,
  KeyPair,
} from "../utils/crypto";

export interface DirectMessage {
  _id: Id<"directMessages">;
  conversationId: Id<"conversations">;
  senderId: string;
  content: string;
  messageType: "text" | "emoji";
  status: "sent" | "delivered" | "read";
  createdAt: number;
  deliveredAt?: number;
  readAt?: number;
  // E2E encryption fields
  encrypted?: boolean;
  nonce?: string;
  // Decrypted content (client-side only, not stored)
  decryptedContent?: string;
}

export interface ConversationPreview {
  _id: Id<"conversations">;
  lastMessageAt: number;
  lastMessagePreview?: string;
  otherUser: {
    clerkId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    isOnline: boolean;
    lastSeen: number;
    publicKey?: string; // For E2E encryption
  } | null;
  unreadCount: number;
}

interface DirectChatContextType {
  // Profile
  syncProfile: () => Promise<void>;
  isProfileSynced: boolean;

  // Conversations
  conversations: ConversationPreview[];
  isLoadingConversations: boolean;
  totalUnreadCount: number;

  // Current conversation
  currentConversationId: Id<"conversations"> | null;
  currentMessages: DirectMessage[];
  setCurrentConversation: (id: Id<"conversations"> | null) => void;

  // Actions
  sendMessage: (content: string, type?: "text" | "emoji") => Promise<boolean>;
  markAsRead: () => Promise<void>;
  openConversationWithUser: (otherUserId: string) => Promise<Id<"conversations"> | null>;

  // Friend requests
  pendingRequestCount: number;

  // E2E encryption
  isE2EEnabled: boolean;
}

const DirectChatContext = createContext<DirectChatContextType | undefined>(
  undefined
);

export function DirectChatProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [isProfileSynced, setIsProfileSynced] = useState(false);
  const [currentConversationId, setCurrentConversationId] =
    useState<Id<"conversations"> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  
  // E2E encryption state
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isE2EEnabled, setIsE2EEnabled] = useState(false);

  // Convex queries
  const conversations = useQuery(
    api.conversations.getConversations,
    userId ? { userId } : "skip"
  );

  const totalUnreadCount = useQuery(
    api.conversations.getTotalUnreadCount,
    userId ? { userId } : "skip"
  );

  const pendingRequestCount = useQuery(
    api.friendRequests.getPendingCount,
    userId ? { userId } : "skip"
  );

  const currentConversationData = useQuery(
    api.directMessages.subscribeToConversation,
    currentConversationId && userId
      ? { conversationId: currentConversationId, currentUserId: userId }
      : "skip"
  );

  // Get current conversation details for decryption
  const currentConversationDetails = useQuery(
    api.conversations.getConversation,
    currentConversationId && userId
      ? { conversationId: currentConversationId, currentUserId: userId }
      : "skip"
  );

  // Convex mutations
  const syncProfileMutation = useMutation(api.userProfiles.syncProfile);
  const updateOnlineStatusMutation = useMutation(
    api.userProfiles.updateOnlineStatus
  );
  const updatePushTokenMutation = useMutation(api.userProfiles.updatePushToken);
  const sendMessageMutation = useMutation(api.directMessages.sendMessage);
  const markAsReadMutation = useMutation(api.directMessages.markAsRead);
  const markAsDeliveredMutation = useMutation(api.directMessages.markAsDelivered);
  const getOrCreateConversationMutation = useMutation(
    api.conversations.getOrCreateConversation
  );

  // Initialize E2E encryption on mount
  useEffect(() => {
    const initE2E = async () => {
      try {
        const keys = await getOrCreateKeyPair();
        setKeyPair(keys);
        setIsE2EEnabled(true);
        console.log("[E2E] Encryption initialized");
      } catch (error) {
        console.error("[E2E] Failed to initialize:", error);
        setIsE2EEnabled(false);
      }
    };
    initE2E();
  }, []);

  // Sync profile on login (including public key)
  const syncProfile = useCallback(async () => {
    if (!userId || !user?.username) return;

    try {
      await syncProfileMutation({
        clerkId: userId,
        username: user.username,
        displayName: user.fullName || undefined,
        avatarUrl: user.imageUrl || undefined,
        publicKey: keyPair?.publicKey,
      });

      // Register for push notifications
      console.log("[DirectChat] Registering for push notifications...");
      const token = await registerForPushNotificationsAsync();
      console.log("[DirectChat] Push token result:", token ? "Success" : "Failed");
      if (token) {
        await updatePushTokenMutation({ clerkId: userId, pushToken: token });
      }

      setIsProfileSynced(true);
    } catch (error) {
      console.error("Failed to sync profile:", error);
    }
  }, [userId, user, keyPair, syncProfileMutation, updatePushTokenMutation]);

  // Auto-sync profile on mount (wait for keyPair)
  useEffect(() => {
    if (userId && user?.username && keyPair && !isProfileSynced) {
      syncProfile();
    }
  }, [userId, user, keyPair, isProfileSynced, syncProfile]);

  // Auto-mark messages as delivered when Convex syncs conversations
  useEffect(() => {
    if (!userId || !conversations?.length) return;

    for (const conv of conversations) {
      if (conv.unreadCount > 0) {
        markAsDeliveredMutation({
          conversationId: conv._id,
          recipientId: userId,
        }).catch(console.error);
      }
    }
  }, [userId, conversations, markAsDeliveredMutation]);

  // Handle app state changes (online/offline)
  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          updateOnlineStatusMutation({ clerkId: userId, isOnline: true });
          
          if (conversations?.length) {
            for (const conv of conversations) {
              markAsDeliveredMutation({
                conversationId: conv._id,
                recipientId: userId,
              }).catch(console.error);
            }
          }
        } else if (
          appStateRef.current === "active" &&
          nextAppState.match(/inactive|background/)
        ) {
          updateOnlineStatusMutation({ clerkId: userId, isOnline: false });
        }
        appStateRef.current = nextAppState;
      }
    );

    return () => subscription.remove();
  }, [userId, conversations, updateOnlineStatusMutation, markAsDeliveredMutation]);

  // Handle push notification taps
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    
    const setupListener = async () => {
      subscription = await addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.conversationId) {
          setCurrentConversationId(data.conversationId as Id<"conversations">);
        }
      });
    };
    
    setupListener();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Decrypt messages when they arrive
  const decryptedMessages = useMemo(() => {
    const messages = currentConversationData?.messages || [];
    if (!keyPair || !currentConversationDetails?.otherUser) {
      return messages;
    }

    const otherUserPublicKey = currentConversationDetails.otherUser.publicKey;
    if (!otherUserPublicKey) {
      // Other user doesn't have E2E enabled yet
      return messages;
    }

    return messages.map((msg) => {
      if (!msg.encrypted || !msg.nonce) {
        // Not encrypted, return as-is
        return msg;
      }

      // Determine which public key to use for decryption
      // If we sent the message, we need the recipient's public key
      // If they sent it, we need their public key
      const senderPublicKey = msg.senderId === userId 
        ? keyPair.publicKey 
        : otherUserPublicKey;

      const decryptedContent = decryptMessage(
        msg.content,
        msg.nonce,
        senderPublicKey,
        keyPair.secretKey
      );

      return {
        ...msg,
        decryptedContent: decryptedContent || "[Decryption failed]",
        content: decryptedContent || msg.content,
      };
    });
  }, [currentConversationData?.messages, keyPair, currentConversationDetails, userId]);

  // Send message with E2E encryption
  const sendMessage = useCallback(
    async (content: string, type: "text" | "emoji" = "text") => {
      if (!currentConversationId || !userId || !content.trim()) return false;

      try {
        // Get recipient's public key
        const recipientPublicKey = currentConversationDetails?.otherUser?.publicKey;
        
        let messageContent = content.trim();
        let encrypted = false;
        let nonce: string | undefined;

        // Encrypt if both parties have E2E enabled
        if (isE2EEnabled && keyPair && recipientPublicKey) {
          const encryptedData = encryptMessage(
            messageContent,
            recipientPublicKey,
            keyPair.secretKey
          );
          messageContent = encryptedData.ciphertext;
          nonce = encryptedData.nonce;
          encrypted = true;
        }

        const result = await sendMessageMutation({
          conversationId: currentConversationId,
          senderId: userId,
          content: messageContent,
          messageType: type,
          encrypted,
          nonce,
        });

        if (result.success && result.recipientPushToken) {
          // Send push notification (encrypted content not shown)
          const senderName = user?.username || "Someone";
          const pushBody = encrypted 
            ? "🔒 New encrypted message" 
            : (content.length > 100 ? content.substring(0, 100) + "..." : content);
          
          console.log("[DirectChat] Sending push notification to:", result.recipientPushToken.substring(0, 20) + "...");
          const sent = await sendPushNotification(
            result.recipientPushToken,
            senderName,
            pushBody,
            { conversationId: currentConversationId }
          );
          console.log("[DirectChat] Push notification sent:", sent);
        } else if (result.success && !result.recipientPushToken) {
          console.log("[DirectChat] No recipient push token available");
        }

        return result.success ?? false;
      } catch (error) {
        console.error("Failed to send message:", error);
        return false;
      }
    },
    [currentConversationId, userId, user, keyPair, isE2EEnabled, currentConversationDetails, sendMessageMutation]
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!currentConversationId || !userId) return;

    try {
      await markAsReadMutation({
        conversationId: currentConversationId,
        readerId: userId,
      });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }, [currentConversationId, userId, markAsReadMutation]);

  // Open or create conversation with user
  const openConversationWithUser = useCallback(
    async (otherUserId: string): Promise<Id<"conversations"> | null> => {
      if (!userId) return null;

      try {
        const conversation = await getOrCreateConversationMutation({
          userId1: userId,
          userId2: otherUserId,
        });

        if (conversation) {
          setCurrentConversationId(conversation._id);
          return conversation._id;
        }
        return null;
      } catch (error) {
        console.error("Failed to open conversation:", error);
        return null;
      }
    },
    [userId, getOrCreateConversationMutation]
  );

  // Set current conversation and mark as read
  const setCurrentConversation = useCallback(
    (id: Id<"conversations"> | null) => {
      setCurrentConversationId(id);
      if (id && userId) {
        markAsReadMutation({ conversationId: id, readerId: userId }).catch(
          console.error
        );
      }
    },
    [userId, markAsReadMutation]
  );

  return (
    <DirectChatContext.Provider
      value={{
        syncProfile,
        isProfileSynced,
        conversations: conversations || [],
        isLoadingConversations: conversations === undefined,
        totalUnreadCount: totalUnreadCount || 0,
        currentConversationId,
        currentMessages: decryptedMessages as DirectMessage[],
        setCurrentConversation,
        sendMessage,
        markAsRead,
        openConversationWithUser,
        pendingRequestCount: pendingRequestCount || 0,
        isE2EEnabled,
      }}
    >
      {children}
    </DirectChatContext.Provider>
  );
}

export function useDirectChat() {
  const context = useContext(DirectChatContext);
  if (context === undefined) {
    throw new Error("useDirectChat must be used within a DirectChatProvider");
  }
  return context;
}
