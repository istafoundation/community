import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to get the other participant in a conversation
function getOtherParticipant(
  participant1: string,
  participant2: string,
  currentUserId: string
): string {
  return participant1 === currentUserId ? participant2 : participant1;
}

// Helper to order participants consistently (alphabetically)
function orderParticipants(
  userId1: string,
  userId2: string
): [string, string] {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
}

// Send friend request
export const sendRequest = mutation({
  args: {
    fromUserId: v.string(),
    toUsername: v.string(),
  },
  handler: async (ctx, args) => {
    // Find target user by username
    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", args.toUsername))
      .first();

    if (!targetProfile) {
      return { success: false, error: "User not found" };
    }

    if (targetProfile.clerkId === args.fromUserId) {
      return { success: false, error: "Cannot send request to yourself" };
    }

    // Check if request already exists
    const [p1, p2] = orderParticipants(args.fromUserId, targetProfile.clerkId);
    
    const existingRequest = await ctx.db
      .query("friendRequests")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("fromUserId"), args.fromUserId),
            q.eq(q.field("toUserId"), targetProfile.clerkId)
          ),
          q.and(
            q.eq(q.field("fromUserId"), targetProfile.clerkId),
            q.eq(q.field("toUserId"), args.fromUserId)
          )
        )
      )
      .first();

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return { success: false, error: "Already friends" };
      }
      if (existingRequest.status === "pending") {
        return { success: false, error: "Request already pending" };
      }
      // If rejected, allow re-sending
      if (existingRequest.status === "rejected") {
        await ctx.db.patch(existingRequest._id, {
          fromUserId: args.fromUserId,
          toUserId: targetProfile.clerkId,
          status: "pending",
          updatedAt: Date.now(),
        });
        return { success: true, requestId: existingRequest._id };
      }
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("friendRequests", {
      fromUserId: args.fromUserId,
      toUserId: targetProfile.clerkId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, requestId };
  },
});

// Accept friend request
export const acceptRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    if (request.toUserId !== args.currentUserId) {
      return { success: false, error: "Not authorized" };
    }

    if (request.status !== "pending") {
      return { success: false, error: "Request is not pending" };
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    // Create conversation if it doesn't exist
    const [p1, p2] = orderParticipants(request.fromUserId, request.toUserId);

    const existingConversation = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1", p1).eq("participant2", p2)
      )
      .first();

    let conversationId: Id<"conversations">;

    if (existingConversation) {
      conversationId = existingConversation._id;
    } else {
      const now = Date.now();
      conversationId = await ctx.db.insert("conversations", {
        participant1: p1,
        participant2: p2,
        lastMessageAt: now,
        createdAt: now,
      });
    }

    return { success: true, conversationId };
  },
});

// Reject friend request
export const rejectRequest = mutation({
  args: {
    requestId: v.id("friendRequests"),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      return { success: false, error: "Request not found" };
    }

    if (request.toUserId !== args.currentUserId) {
      return { success: false, error: "Not authorized" };
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get pending incoming requests
export const getPendingReceived = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get sender profiles
    const requestsWithProfiles = await Promise.all(
      requests.map(async (req) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", req.fromUserId))
          .first();
        return {
          ...req,
          fromUser: profile
            ? {
                username: profile.username,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
              }
            : null,
        };
      })
    );

    return requestsWithProfiles;
  },
});

// Get pending outgoing requests
export const getPendingSent = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Get recipient profiles
    const requestsWithProfiles = await Promise.all(
      requests.map(async (req) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", req.toUserId))
          .first();
        return {
          ...req,
          toUser: profile
            ? {
                username: profile.username,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
              }
            : null,
        };
      })
    );

    return requestsWithProfiles;
  },
});

// Get all friends (accepted requests)
export const getFriends = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return [];

    // Get all accepted requests where user is either sender or receiver
    const sentRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const receivedRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const friendIds = [
      ...sentRequests.map((r) => r.toUserId),
      ...receivedRequests.map((r) => r.fromUserId),
    ];

    // Get friend profiles
    const friends = await Promise.all(
      friendIds.map(async (clerkId) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
          .first();
        return profile;
      })
    );

    return friends.filter(Boolean);
  },
});

// Get pending request count
export const getPendingCount = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    if (!args.userId) return 0;

    const requests = await ctx.db
      .query("friendRequests")
      .withIndex("by_to_user", (q) => q.eq("toUserId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return requests.length;
  },
});
