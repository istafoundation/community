import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const messageSchema = v.object({
  id: v.string(),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  timestamp: v.number(),
});

// Get chat history for a user
export const getChatHistory = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkId) return [];

    const chat = await ctx.db
      .query("chatMessages")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return chat?.messages || [];
  },
});

// Save messages (replace all messages for user)
export const saveMessages = mutation({
  args: {
    clerkId: v.string(),
    messages: v.array(messageSchema),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatMessages")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: args.messages,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("chatMessages", {
        clerkId: args.clerkId,
        messages: args.messages,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Add a single message to chat history
export const addMessage = mutation({
  args: {
    clerkId: v.string(),
    message: messageSchema,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatMessages")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        messages: [...existing.messages, args.message],
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("chatMessages", {
        clerkId: args.clerkId,
        messages: [args.message],
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Clear chat history for a user
export const clearChat = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chatMessages")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { success: true };
  },
});
