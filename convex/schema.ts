import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const card = v.object({
  color: v.union(
    v.literal("red"),
    v.literal("blue"),
    v.literal("green"),
    v.literal("yellow"),
    v.literal("wild")
  ),
  value: v.union(
    v.literal("0"), v.literal("1"), v.literal("2"), v.literal("3"),
    v.literal("4"), v.literal("5"), v.literal("6"), v.literal("7"),
    v.literal("8"), v.literal("9"),
    v.literal("skip"), v.literal("reverse"),
    v.literal("+2"), v.literal("wild"), v.literal("+4")
  ),
});

export default defineSchema({
  games: defineTable({
    code: v.string(),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    currentPlayerId: v.optional(v.id("players")),
    direction: v.union(v.literal(1), v.literal(-1)),
    drawStack: v.number(),
    topCard: v.optional(card),
    deck: v.array(card),
    drawnCard: v.optional(card),
    winnerId: v.optional(v.id("players")),
  }).index("by_code", ["code"]),

  players: defineTable({
    gameId: v.id("games"),
    nickname: v.string(),
    hand: v.array(card),
    order: v.number(),
    isConnected: v.boolean(),
    isHost: v.boolean(),
  }).index("by_game", ["gameId"]),
});
