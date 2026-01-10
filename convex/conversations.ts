import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper to order participants consistently (alphabetically)
function orderParticipants(
  userId1: string,
  userId2: string
): [string, string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

// Get all conversations for a user
export const getConversations = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    // Get conversations where user is participant1
    const asP1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1", args.userId))
      .collect();

    // Get conversations where user is participant2
    const asP2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2", args.userId))
      .collect();

    const allConversations = [...asP1, ...asP2];

    // Sort by last message time (most recent first)
    allConversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    // Get other participant profiles and unread counts
    const conversationsWithDetails = await Promise.all(
      allConversations.map(async (conv) => {
        const otherUserId =
          conv.participant1 === args.userId
            ? conv.participant2
            : conv.participant1;

        const otherProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", otherUserId))
          .first();

        // Count unread messages (messages sent by other user that are not read)
        const unreadMessages = await ctx.db
          .query("directMessages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("senderId"), otherUserId),
              q.neq(q.field("status"), "read")
            )
          )
          .collect();

        return {
          _id: conv._id,
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: conv.lastMessagePreview,
          otherUser: otherProfile
            ? {
                clerkId: otherProfile.clerkId,
                username: otherProfile.username,
                displayName: otherProfile.displayName,
                avatarUrl: otherProfile.avatarUrl,
                isOnline: otherProfile.isOnline,
                lastSeen: otherProfile.lastSeen,
                publicKey: otherProfile.publicKey, // E2E encryption
              }
            : null,
          unreadCount: unreadMessages.length,
        };
      })
    );

    return conversationsWithDetails;
  },
});

// Get or create conversation between two users
export const getOrCreateConversation = mutation({
  args: {
    userId1: v.string(),
    userId2: v.string(),
  },
  handler: async (ctx, args) => {
    const [p1, p2] = orderParticipants(args.userId1, args.userId2);

    // Check if conversation already exists
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1", p1).eq("participant2", p2)
      )
      .first();

    if (existing) {
      return existing;
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      participant1: p1,
      participant2: p2,
      lastMessageAt: now,
      createdAt: now,
    });

    return await ctx.db.get(conversationId);
  },
});

// Get conversation by ID with participant info
export const getConversation = query({
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

    const otherUserId =
      conversation.participant1 === args.currentUserId
        ? conversation.participant2
        : conversation.participant1;

    const otherProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", otherUserId))
      .first();

    return {
      ...conversation,
      otherUser: otherProfile
        ? {
            clerkId: otherProfile.clerkId,
            username: otherProfile.username,
            displayName: otherProfile.displayName,
            avatarUrl: otherProfile.avatarUrl,
            isOnline: otherProfile.isOnline,
            lastSeen: otherProfile.lastSeen,
            publicKey: otherProfile.publicKey, // E2E encryption
          }
        : null,
    };
  },
});

// Get total unread message count across all conversations
export const getTotalUnreadCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return 0;

    // Get all conversations for user
    const asP1 = await ctx.db
      .query("conversations")
      .withIndex("by_participant1", (q) => q.eq("participant1", args.userId))
      .collect();

    const asP2 = await ctx.db
      .query("conversations")
      .withIndex("by_participant2", (q) => q.eq("participant2", args.userId))
      .collect();

    const allConversations = [...asP1, ...asP2];

    let totalUnread = 0;

    for (const conv of allConversations) {
      const otherUserId =
        conv.participant1 === args.userId
          ? conv.participant2
          : conv.participant1;

      const unread = await ctx.db
        .query("directMessages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("senderId"), otherUserId),
            q.neq(q.field("status"), "read")
          )
        )
        .collect();

      totalUnread += unread.length;
    }

    return totalUnread;
  },
});
