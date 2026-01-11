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
  addNotificationResponseListener,
} from "../utils/notifications";
import {
  getOrCreateKeyPair,
  restoreKeyPairFromSecret,
  encryptMessage,
  decryptMessage,
  KeyPair,
} from "../utils/crypto";
import { encryptPrivateKeyWithPin, decryptPrivateKeyWithPin } from "../utils/key-backup";
import KeyBackupModal from "@/components/chat/KeyBackupModal";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export const DECRYPTION_FAILED_FLAG = "___DECRYPTION_FAILED___";

export interface DirectMessage {
  _id: Id<"directMessages">;
  conversationId: Id<"conversations">;
  senderId: string;
  content: string;
  messageType: "text" | "emoji" | "system";
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
  conversations: ConversationPreview[];
  isLoadingConversations: boolean;
  totalUnreadCount: number;
  currentConversationId: Id<"conversations"> | null;
  currentMessages: DirectMessage[];
  setCurrentConversation: (id: Id<"conversations"> | null) => void;
  sendMessage: (content: string, type?: "text" | "emoji") => Promise<boolean>;
  markAsRead: (conversationId: Id<"conversations">) => Promise<void>;
  openConversationWithUser: (userId: string) => Promise<Id<"conversations"> | null>;
  pendingRequestCount: number;
  isE2EEnabled: boolean;
  isChatUnlocked: boolean;
  verifyBackupAccess: () => Promise<boolean>; 
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
  const [isBackupSetup, setIsBackupSetup] = useState(false);
  const [isChatUnlocked, setIsChatUnlocked] = useState(false); // Default locked
  
  // Backup Modal State
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupMode, setBackupMode] = useState<"setup" | "restore" | "reset">("setup");
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);

  // Convex queries
  // Gate these queries with isChatUnlocked
  const conversations = useQuery(
    api.conversations.getConversations,
    userId && isChatUnlocked ? { userId } : "skip"
  );

  const totalUnreadCount = useQuery(
    api.conversations.getTotalUnreadCount,
    userId && isChatUnlocked ? { userId } : "skip"
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
  
  // Backup mutations
  const storeBackupMutation = useMutation(api.userKeys.storeBackup);
  const getBackupQuery = useQuery(api.userKeys.getBackup, userId ? { clerkId: userId } : "skip");

  // Reset state on auth change
  useEffect(() => {
    if (!userId) {
      console.log("[DirectChat] User signed out, locking chats");
      setIsChatUnlocked(false);
      setKeyPair(null);
      setIsE2EEnabled(false);
    }
  }, [userId]);

  // Initialize E2E encryption on mount
  useEffect(() => {
    const initE2E = async () => {
      console.log("[E2E] Initializing...");
      try {
        // 1. Check if we have local keys
        const localKeys = await getOrCreateKeyPair(); // This might generate NEW keys if none exist
        
        // 2. Check if a backup exists on server (using query result)
        // Note: query might be undefined initially. We rely on the effect re-running when query loads.
        
        setKeyPair(localKeys);
        setIsE2EEnabled(true);
        console.log("[E2E] Local keys loaded");

        // Check if unlocked previously
        const hasRestored = await SecureStore.getItemAsync("e2e_restored");
        if (hasRestored === "true") {
          setIsChatUnlocked(true);
        }
      } catch (error) {
        console.error("[E2E] Failed to initialize:", error);
        setIsE2EEnabled(false);
      }
    };
    initE2E();
  }, []); // Only run once for local init

  // Public method to verify/enforce backup access
  // Called when user enters chat screens
  const verifyBackupAccess = useCallback(async (): Promise<boolean> => {
    if (!userId || getBackupQuery === undefined) return false;
    
    // If already verified/restored locally
    const hasRestored = await SecureStore.getItemAsync("e2e_restored");
    if (hasRestored) {
        setIsBackupSetup(true);
        setIsChatUnlocked(true);
        return true;
    }

    // Check server status
    if (getBackupQuery) {
        // Needs restore
        setBackupMode("restore");
        setShowBackupModal(true);
        return false;
    } else {
        // Needs setup
        setBackupMode("setup");
        setShowBackupModal(true);
        return false;
    }
  }, [userId, getBackupQuery]);

  // Handle PIN Submission
  const handleBackupSubmit = async (pin: string): Promise<boolean> => {
    setIsProcessingBackup(true);
    try {
      if (backupMode === "setup") {
        if (!keyPair) throw new Error("No keys to backup");
        
        // Encrypt current private key
        const { encryptedPrivateKey, salt, iv } = await encryptPrivateKeyWithPin(keyPair.secretKey, pin);
        
        // Upload to Convex
        await storeBackupMutation({
          clerkId: userId!,
          encryptedPrivateKey,
          salt,
          iv,
        });
        
        await SecureStore.setItemAsync("e2e_restored", "true");
        setIsBackupSetup(true);
        setIsChatUnlocked(true);
        setShowBackupModal(false);
        return true;
        
      } else if (backupMode === "restore") {
        if (!getBackupQuery) throw new Error("No backup found");
        
        // Decrypt key from backup
        const decryptedSecretKey = await decryptPrivateKeyWithPin(
          getBackupQuery.encryptedPrivateKey,
          pin,
          getBackupQuery.salt,
          getBackupQuery.iv
        );
        
        if (!decryptedSecretKey) {
          alert("Incorrect PIN");
          setIsProcessingBackup(false);
          return false;
        }
        
        if (!decryptedSecretKey) {
          alert("Incorrect PIN");
          setIsProcessingBackup(false);
          return false;
        }
        
        // Restore key pair properly
        const restoredKeys = await restoreKeyPairFromSecret(decryptedSecretKey);
        setKeyPair(restoredKeys);
        
        await SecureStore.setItemAsync("e2e_restored", "true");
        setIsChatUnlocked(true);
        setShowBackupModal(false);
        return true;
      } else if (backupMode === "reset") {
        // RESET FLOW
        // 1. Generate NEW Key Pair (overwriting old)
        // 2. Encrypt with NEW PIN
        // 3. Upload
        // 4. Notify everyone? (Optional, handled by "System Message" later if we add it)
        
        setIsProcessingBackup(false); // Done later
        return true;
      }
      return true;
    } catch (e) {
      console.error(e);
      alert("Operation failed");
      return false;
    } finally {
      setIsProcessingBackup(false);
    }
  };


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
    // Helper to process messages when keys are missing
    const processMissingKeys = (msg: DirectMessage) => {
      if (msg.encrypted) {
        return {
          ...msg,
          decryptedContent: DECRYPTION_FAILED_FLAG,
          content: DECRYPTION_FAILED_FLAG,
        };
      }
      return msg;
    };

    if (!keyPair || !currentConversationDetails?.otherUser) {
      return messages.map(processMissingKeys);
    }

    const otherUserPublicKey = currentConversationDetails.otherUser.publicKey;
    
    if (!otherUserPublicKey) {
      return messages.map(processMissingKeys);
    }

    return messages.map((msg) => {
      if (!msg.encrypted || !msg.nonce) {
        // Not encrypted, return as-is
        return msg;
      }

      // Determine which public key to use to derive the shared secret
      // The shared secret is derived from (MyPriv + TheirPub) OR (TheirPriv + MyPub)
      
      // If I am the SENDER:
      // I have MyPriv. I need TheirPub to derive the secret.
      // So I pass "TheirPub" as the public key argument to box.open
      
      // If I am the RECEIVER:
      // I have MyPriv. I need TheirPub (The Sender's Pub) to derive the secret.
      // So I pass "TheirPub" (SenderPub) as the public key argument.
      
      // In BOTH cases, I simply need the "Other Person's Public Key" to combine with "My Private Key".
      const otherPersonPublicKey = otherUserPublicKey;

      const decryptedContent = decryptMessage(
        msg.content,
        msg.nonce,
        otherPersonPublicKey, // Always use the OTHER person's public key
        keyPair.secretKey     // Always use MY private key
      );

      return {
        ...msg,
        decryptedContent: decryptedContent || DECRYPTION_FAILED_FLAG,
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

        if (result.success) {
          console.log("[DirectChat] Message sent successfully");
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
  
  // Public function to trigger reset
  const resetKeys = () => {
    setBackupMode("reset");
    setShowBackupModal(true);
  };

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
        isChatUnlocked,
        verifyBackupAccess,
      }}
    >
      {children}
      <KeyBackupModal
        visible={showBackupModal}
        mode={backupMode}
        onSubmit={handleBackupSubmit}
        isLoading={isProcessingBackup}
        onCancel={backupMode === "reset" ? () => setShowBackupModal(false) : undefined}
      />
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
