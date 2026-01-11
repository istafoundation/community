import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const sendPush = internalAction({
  args: {
    pushToken: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    if (!args.pushToken) return;

    // Check if this is an encrypted message that should be handled by native service
    const isEncrypted = args.data?.encrypted === true;

    // Always include title/body so notification displays
    // For encrypted messages, also include encrypted data in case native service can decrypt
    const message = {
      to: args.pushToken,
      sound: "default",
      title: args.title,
      body: args.body,
      data: args.data || {},
      priority: "high",
      channelId: "chat",
      // For Android: mutableContent allows modification. contentAvailable for data delivery
      ...(isEncrypted ? { mutableContent: true } : {}),
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log(`[Convex] Push notification sent to ${args.pushToken}:`, result);
      
      return result.data?.status === "ok";
    } catch (error) {
      console.error("[Convex] Error sending push notification:", error);
      return false;
    }
  },
});
