import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Send a new message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    content: v.string(), // Encrypted ciphertext (Base64) or plaintext
    messageType: v.union(v.literal("text"), v.literal("emoji")),
    // E2E encryption fields
    encrypted: v.optional(v.boolean()),
    nonce: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Verify sender is a participant
    if (
      conversation.participant1 !== args.senderId &&
      conversation.participant2 !== args.senderId
    ) {
      return { success: false, error: "Not authorized" };
    }

    const now = Date.now();

    // Create message with "sent" status
    const messageId = await ctx.db.insert("directMessages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      messageType: args.messageType,
      status: "sent",
      encrypted: args.encrypted || false,
      nonce: args.nonce,
      createdAt: now,
    });

    // Get sender profile for E2E public key (needed for encrypted preview)
    const senderProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.senderId))
      .first();

    // Update conversation with last message info
    // For encrypted messages, store data for client-side decryption
    const preview = args.encrypted
      ? "🔒 Encrypted message"
      : args.content.length > 50
        ? args.content.substring(0, 50) + "..."
        : args.content;

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: preview,
      // Store encrypted preview data for client-side decryption
      lastMessageEncrypted: args.encrypted || false,
      lastMessageCiphertext: args.encrypted ? args.content : undefined,
      lastMessageNonce: args.nonce,
      lastMessageSenderPublicKey: args.encrypted ? senderProfile?.publicKey : undefined,
    });

    // Get recipient for push notification
    const recipientId =
      conversation.participant1 === args.senderId
        ? conversation.participant2
        : conversation.participant1;

    const recipientProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", recipientId))
      .first();

    // Send push notification if recipient has a token
    if (recipientProfile?.pushToken) {
      const senderName = senderProfile?.displayName || senderProfile?.username || "Someone";
      
      // For encrypted messages, send data payload for client-side decryption
      // For unencrypted, send the actual content
      const pushBody = args.encrypted 
        ? "New message" // Fallback text (will be replaced by client)
        : (args.content.length > 100 ? args.content.substring(0, 100) + "..." : args.content);

      await ctx.scheduler.runAfter(0, (internal as any).notifications.sendPush, {
        pushToken: recipientProfile.pushToken,
        title: senderName,
        body: pushBody,
        data: { 
          conversationId: args.conversationId,
          // Encrypted payload for client-side decryption
          encrypted: args.encrypted,
          ciphertext: args.encrypted ? args.content : undefined,
          nonce: args.nonce,
          senderPublicKey: senderProfile?.publicKey,
          senderName,
        },
      });
    }

    // Return message info, push token, and recipient's public key
    return {
      success: true,
      messageId,
      recipientPushToken: recipientProfile?.pushToken,
      recipientPublicKey: recipientProfile?.publicKey,
    };
  },
});

// Get messages for a conversation (paginated, newest first)
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) return [];

    // Verify user is a participant
    if (
      conversation.participant1 !== args.currentUserId &&
      conversation.participant2 !== args.currentUserId
    ) {
      return [];
    }

    const limit = args.limit || 50;

    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(limit);

    // Reverse to get chronological order (oldest first)
    return messages.reverse();
  },
});

// Mark messages as delivered (when recipient opens the app/conversation list)
export const markAsDelivered = mutation({
  args: {
    conversationId: v.id("conversations"),
    recipientId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) return { success: false };

    // Get the sender ID (the other participant)
    const senderId =
      conversation.participant1 === args.recipientId
        ? conversation.participant2
        : conversation.participant1;

    // Update all "sent" messages from the sender to "delivered"
    const sentMessages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("senderId"), senderId),
          q.eq(q.field("status"), "sent")
        )
      )
      .collect();

    const now = Date.now();

    for (const msg of sentMessages) {
      await ctx.db.patch(msg._id, {
        status: "delivered",
        deliveredAt: now,
      });
    }

    return { success: true, updatedCount: sentMessages.length };
  },
});

// Mark messages as read (when recipient opens the specific conversation)
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    readerId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) return { success: false };

    // Get the sender ID (the other participant)
    const senderId =
      conversation.participant1 === args.readerId
        ? conversation.participant2
        : conversation.participant1;

    // Update all non-read messages from the sender to "read"
    const unreadMessages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("senderId"), senderId),
          q.neq(q.field("status"), "read")
        )
      )
      .collect();

    const now = Date.now();

    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, {
        status: "read",
        readAt: now,
        // Also set deliveredAt if not already set
        deliveredAt: msg.deliveredAt || now,
      });
    }

    return { success: true, updatedCount: unreadMessages.length };
  },
});

// Update single message status (for real-time updates)
export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("directMessages"),
    status: v.union(v.literal("delivered"), v.literal("read")),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);

    if (!message) return { success: false };

    const now = Date.now();
    const updates: Record<string, unknown> = { status: args.status };

    if (args.status === "delivered" && !message.deliveredAt) {
      updates.deliveredAt = now;
    }

    if (args.status === "read") {
      if (!message.deliveredAt) updates.deliveredAt = now;
      updates.readAt = now;
    }

    await ctx.db.patch(args.messageId, updates);

    return { success: true };
  },
});

// Subscribe to new messages in a conversation (real-time)
export const subscribeToConversation = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) return null;

    // Verify user is a participant
    if (
      conversation.participant1 !== args.currentUserId &&
      conversation.participant2 !== args.currentUserId
    ) {
      return null;
    }

    // Get latest 50 messages
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(50);

    return {
      conversation,
      messages: messages.reverse(),
    };
  },
});
