import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { generateRoomCode } from "./lib/utils";
import { buildDeck, dealHands } from "./lib/deck";

export const createGame = mutation({
  args: { nickname: v.string() },
  handler: async (ctx, { nickname }) => {
    const code = generateRoomCode();

    const gameId = await ctx.db.insert("games", {
      code,
      status: "waiting",
      direction: 1,
      drawStack: 0,
      deck: buildDeck(),
    });

    const playerId = await ctx.db.insert("players", {
      gameId,
      nickname,
      hand: [],
      order: 0,
      isConnected: true,
      isHost: true,
    });

    return { gameId, playerId, code };
  },
});

export const joinGame = mutation({
  args: { code: v.string(), nickname: v.string() },
  handler: async (ctx, { code, nickname }) => {
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .first();

    if (!game) throw new Error("Room not found");
    if (game.status !== "waiting") throw new Error("Game already started");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (players.length >= 6) throw new Error("Room is full");

    const nicknamesTaken = players.map((p) => p.nickname.toLowerCase());
    if (nicknamesTaken.includes(nickname.toLowerCase()))
      throw new Error("Nickname already taken in this room");

    const playerId = await ctx.db.insert("players", {
      gameId: game._id,
      nickname,
      hand: [],
      order: players.length,
      isConnected: true,
      isHost: false,
    });

    return { gameId: game._id, playerId, code: game.code };
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    return ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .first();
  },
});

export const listPlayers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
  },
});

export const startGame = mutation({
  args: { gameId: v.id("games"), playerId: v.id("players") },
  handler: async (ctx, { gameId, playerId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already started");

    const player = await ctx.db.get(playerId);
    if (!player?.isHost) throw new Error("Only the host can start the game");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    if (players.length < 2) throw new Error("Need at least 2 players to start");

    const sorted = players.sort((a, b) => a.order - b.order);
    const { hands, remaining } = dealHands(game.deck, sorted.length);

    // Deal hands to each player
    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.patch(sorted[i]._id, { hand: hands[i] });
    }

    // Flip first card — skip wilds as starting card
    let topCard = remaining.pop()!;
    while (topCard.color === "wild") {
      remaining.unshift(topCard);
      topCard = remaining.pop()!;
    }

    await ctx.db.patch(gameId, {
      status: "playing",
      deck: remaining,
      topCard,
      currentPlayerId: sorted[0]._id,
    });
  },
});
