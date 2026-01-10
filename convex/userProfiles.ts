import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update user profile (sync from Clerk)
export const syncProfile = mutation({
  args: {
    clerkId: v.string(),
    username: v.string(),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    publicKey: v.optional(v.string()), // E2E encryption public key
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existing) {
      const updates: Record<string, unknown> = {
        username: args.username,
        displayName: args.displayName,
        avatarUrl: args.avatarUrl,
        lastSeen: now,
        isOnline: true,
      };
      // Only update publicKey if provided
      if (args.publicKey) {
        updates.publicKey = args.publicKey;
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("userProfiles", {
      clerkId: args.clerkId,
      username: args.username,
      displayName: args.displayName,
      avatarUrl: args.avatarUrl,
      publicKey: args.publicKey,
      lastSeen: now,
      isOnline: true,
      createdAt: now,
    });
  },
});

// Get profile by clerkId
export const getProfile = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkId) return null;
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get profile by username
export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    if (!args.username) return null;
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

// Search users by username (partial match)
export const searchByUsername = query({
  args: { 
    query: v.string(),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.query || args.query.length < 2) return [];
    
    const searchLower = args.query.toLowerCase();
    
    // Get all profiles and filter (Convex doesn't support LIKE queries natively)
    const allProfiles = await ctx.db.query("userProfiles").collect();
    
    return allProfiles
      .filter(
        (profile) =>
          profile.clerkId !== args.currentUserId &&
          profile.username.toLowerCase().includes(searchLower)
      )
      .slice(0, 20) // Limit results
      .map((profile) => ({
        clerkId: profile.clerkId,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        isOnline: profile.isOnline,
      }));
  },
});

// Update push token for notifications
export const updatePushToken = mutation({
  args: {
    clerkId: v.string(),
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { pushToken: args.pushToken });
      return { success: true };
    }
    return { success: false, error: "Profile not found" };
  },
});

// Update online status
export const updateOnlineStatus = mutation({
  args: {
    clerkId: v.string(),
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
      return { success: true };
    }
    return { success: false };
  },
});

// Get multiple profiles by IDs
export const getProfiles = query({
  args: { clerkIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const profiles = await Promise.all(
      args.clerkIds.map((clerkId) =>
        ctx.db
          .query("userProfiles")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
          .first()
      )
    );
    return profiles.filter(Boolean);
  },
});

// Get user's public key for E2E encryption
export const getPublicKey = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    return profile?.publicKey || null;
  },
});

// Update E2E encryption public key
export const updatePublicKey = mutation({
  args: {
    clerkId: v.string(),
    publicKey: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, { publicKey: args.publicKey });
      return { success: true };
    }
    return { success: false, error: "Profile not found" };
  },
});
