import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all events, sorted by date (upcoming first)
export const listEvents = query({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_date_time")
      .order("desc")
      .collect();
    return events;
  },
});

// Get single event by ID
export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

// Helper to check if user is admin
async function isUserAdmin(ctx: any, clerkId: string): Promise<boolean> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();
  return user?.role === "admin";
}

// Create new event (admin only)
export const createEvent = mutation({
  args: {
    clerkId: v.string(),
    username: v.string(),
    title: v.string(),
    heroImage: v.string(),
    location: v.string(),
    dateTime: v.number(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify admin role
    const isAdmin = await isUserAdmin(ctx, args.clerkId);
    if (!isAdmin) {
      throw new Error("Only admins can create events");
    }

    const now = Date.now();
    const eventId = await ctx.db.insert("events", {
      title: args.title,
      heroImage: args.heroImage,
      location: args.location,
      dateTime: args.dateTime,
      content: args.content,
      authorClerkId: args.clerkId,
      authorUsername: args.username,
      createdAt: now,
      updatedAt: now,
    });

    return eventId;
  },
});

// Update event (admin only)
export const updateEvent = mutation({
  args: {
    clerkId: v.string(),
    eventId: v.id("events"),
    title: v.optional(v.string()),
    heroImage: v.optional(v.string()),
    location: v.optional(v.string()),
    dateTime: v.optional(v.number()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify admin role
    const isAdmin = await isUserAdmin(ctx, args.clerkId);
    if (!isAdmin) {
      throw new Error("Only admins can update events");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const updates: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.heroImage !== undefined) updates.heroImage = args.heroImage;
    if (args.location !== undefined) updates.location = args.location;
    if (args.dateTime !== undefined) updates.dateTime = args.dateTime;
    if (args.content !== undefined) updates.content = args.content;

    await ctx.db.patch(args.eventId, updates);
    return await ctx.db.get(args.eventId);
  },
});

// Delete event (admin only)
export const deleteEvent = mutation({
  args: {
    clerkId: v.string(),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Verify admin role
    const isAdmin = await isUserAdmin(ctx, args.clerkId);
    if (!isAdmin) {
      throw new Error("Only admins can delete events");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.delete(args.eventId);
    return { success: true };
  },
});
