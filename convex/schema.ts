import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // App users linked to Clerk
  users: defineTable({
    clerkId: v.string(),
    role: v.union(
      v.literal("user"),
      v.literal("professional"),
      v.literal("admin")
    ),
    dailyMessageCount: v.number(),
    lastResetDate: v.string(), // YYYY-MM-DD in IST (GMT+5:30)
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Chat messages per user
  chatMessages: defineTable({
    clerkId: v.string(),
    messages: v.array(
      v.object({
        id: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    updatedAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  // Community events
  events: defineTable({
    title: v.string(),
    heroImage: v.string(),
    location: v.string(),
    dateTime: v.number(), // Unix timestamp
    content: v.string(), // Markdown content
    authorClerkId: v.string(),
    authorUsername: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date_time", ["dateTime"])
    .index("by_author", ["authorClerkId"]),

  // ============================================
  // P2P Chat System Tables
  // ============================================

  // User profiles for chat (synced from Clerk)
  userProfiles: defineTable({
    clerkId: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lastSeen: v.number(),
    isOnline: v.boolean(),
    pushToken: v.optional(v.string()), // Expo push token
    publicKey: v.optional(v.string()), // E2E encryption public key (Base64)
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_username", ["username"]),

  // Friend requests between users
  friendRequests: defineTable({
    fromUserId: v.string(), // clerkId
    toUserId: v.string(), // clerkId
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"])
    .index("by_users", ["fromUserId", "toUserId"]),

  // Conversations (1-on-1 chat threads)
  conversations: defineTable({
    participant1: v.string(), // clerkId (alphabetically first)
    participant2: v.string(), // clerkId (alphabetically second)
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_participant1", ["participant1"])
    .index("by_participant2", ["participant2"])
    .index("by_participants", ["participant1", "participant2"])
    .index("by_last_message", ["lastMessageAt"]),

  // Direct messages in conversations
  directMessages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(), // clerkId
    content: v.string(), // Encrypted ciphertext (Base64) or plaintext for legacy
    messageType: v.union(v.literal("text"), v.literal("emoji"), v.literal("system")),
    status: v.union(
      v.literal("sent"), // Single grey tick - server received
      v.literal("delivered"), // Double grey tick - recipient received
      v.literal("read") // Double green tick - recipient read
    ),
    // E2E encryption fields
    encrypted: v.optional(v.boolean()), // True if message is E2E encrypted
    nonce: v.optional(v.string()), // Encryption nonce (Base64)
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_sender", ["senderId"])
    .index("by_status", ["conversationId", "status"]),

  // Encrypted Key Backups
  userKeys: defineTable({
    clerkId: v.string(),
    encryptedPrivateKey: v.string(), // Base64 encrypted private key
    salt: v.string(), // PBKDF2 salt
    iv: v.string(), // AES IV
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
});
