import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get current IST date as YYYY-MM-DD
function getISTDate(): string {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  return istDate.toISOString().split("T")[0];
}

// Daily message limit for "user" role
const DAILY_MESSAGE_LIMIT = 10;

// Sync user from Clerk - creates if not exists
export const syncUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      // Check if we need to reset daily count (new day in IST)
      const today = getISTDate();
      if (existing.lastResetDate !== today) {
        await ctx.db.patch(existing._id, {
          dailyMessageCount: 0,
          lastResetDate: today,
        });
        return { ...existing, dailyMessageCount: 0, lastResetDate: today };
      }
      return existing;
    }

    // Create new user with default "user" role
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      role: "user",
      dailyMessageCount: 0,
      lastResetDate: getISTDate(),
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

// Get user with rate limit info
export const getUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkId) return null;
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    // Check if daily reset is needed
    const today = getISTDate();
    const needsReset = user.lastResetDate !== today;
    
    const dailyMessageCount = needsReset ? 0 : user.dailyMessageCount;
    const remainingMessages = Math.max(0, DAILY_MESSAGE_LIMIT - dailyMessageCount);
    const isLimitReached = user.role === "user" && dailyMessageCount >= DAILY_MESSAGE_LIMIT;

    return {
      ...user,
      dailyMessageCount,
      remainingMessages,
      isLimitReached,
      limit: DAILY_MESSAGE_LIMIT,
    };
  },
});

// Check if user can send message and increment count
export const checkAndIncrementMessageCount = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const today = getISTDate();
    let currentCount = user.dailyMessageCount;

    // Reset if new day
    if (user.lastResetDate !== today) {
      currentCount = 0;
    }

    // Check rate limit for "user" role
    if (user.role === "user" && currentCount >= DAILY_MESSAGE_LIMIT) {
      return {
        allowed: false,
        remainingMessages: 0,
        message: "Daily message limit reached. Try again tomorrow.",
      };
    }

    // Increment count
    await ctx.db.patch(user._id, {
      dailyMessageCount: currentCount + 1,
      lastResetDate: today,
    });

    return {
      allowed: true,
      remainingMessages: Math.max(0, DAILY_MESSAGE_LIMIT - currentCount - 1),
      message: null,
    };
  },
});
