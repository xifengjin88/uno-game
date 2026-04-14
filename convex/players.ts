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

export const leaveGame = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) return;

    await ctx.db.delete(playerId);

    // If host left, promote next player
    if (player.isHost) {
      const remaining = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", player.gameId))
        .collect();

      if (remaining.length > 0) {
        const next = remaining.sort((a, b) => a.order - b.order)[0];
        await ctx.db.patch(next._id, { isHost: true });
      } else {
        // No players left — delete the game
        await ctx.db.delete(player.gameId);
      }
    }
  },
});
