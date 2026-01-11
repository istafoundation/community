import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store encrypted key backup
export const storeBackup = mutation({
  args: {
    clerkId: v.string(),
    encryptedPrivateKey: v.string(),
    salt: v.string(),
    iv: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if backup exists
    const existing = await ctx.db
      .query("userKeys")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedPrivateKey: args.encryptedPrivateKey,
        salt: args.salt,
        iv: args.iv,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userKeys", {
        clerkId: args.clerkId,
        encryptedPrivateKey: args.encryptedPrivateKey,
        salt: args.salt,
        iv: args.iv,
        createdAt: Date.now(),
      });
    }
  },
});

// Get encrypted key backup
export const getBackup = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const backup = await ctx.db
      .query("userKeys")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    return backup;
  },
});
