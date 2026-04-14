import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    return ctx.db.get(playerId);
  },
});

export const setConnected = mutation({
  args: { playerId: v.id("players"), isConnected: v.boolean() },
  handler: async (ctx, { playerId, isConnected }) => {
    await ctx.db.patch(playerId, { isConnected });
  },
});
