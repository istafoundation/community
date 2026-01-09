import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // App users linked to Clerk
  users: defineTable({
    clerkId: v.string(),
    role: v.union(v.literal("user"), v.literal("professional"), v.literal("admin")),
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
});
