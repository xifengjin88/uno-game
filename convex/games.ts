import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { generateRoomCode } from "./lib/utils";
import { buildDeck, dealHands, shuffle } from "./lib/deck";
import { isValidPlay, nextPlayerIndex } from "./lib/rules";

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

    if (!game) throw new ConvexError("Room not found");
    if (game.status !== "waiting") throw new ConvexError("Game already started");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", game._id))
      .collect();

    if (players.length >= 6) throw new ConvexError("Room is full");

    const nicknamesTaken = players.map((p) => p.nickname.toLowerCase());
    if (nicknamesTaken.includes(nickname.toLowerCase()))
      throw new ConvexError("Nickname already taken in this room");

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

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return ctx.db.get(gameId);
  },
});

export const playCard = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
    cardIndex: v.number(),
    chosenColor: v.optional(
      v.union(v.literal("red"), v.literal("blue"), v.literal("green"), v.literal("yellow"))
    ),
  },
  handler: async (ctx, { gameId, playerId, cardIndex, chosenColor }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    if (game.status !== "playing") throw new ConvexError("Game is not in progress");
    if (game.currentPlayerId !== playerId) throw new ConvexError("Not your turn");

    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("Player not found");

    const card = player.hand[cardIndex];
    if (!card) throw new ConvexError("Card not found");

    // If player already drew this turn, they may only play the drawn card
    if (game.drawnCard) {
      const isDrawnCard =
        card.color === game.drawnCard.color && card.value === game.drawnCard.value;
      if (!isDrawnCard) throw new ConvexError("You can only play the card you just drew");
    }

    const topCard = game.topCard!;
    if (!isValidPlay(card, topCard, game.drawStack)) {
      throw new ConvexError("Invalid play — card doesn't match color or value");
    }

    // Remove card from hand
    const newHand = player.hand.filter((_, i) => i !== cardIndex);
    await ctx.db.patch(playerId, { hand: newHand });

    // Check win
    if (newHand.length === 0) {
      await ctx.db.patch(gameId, {
        status: "finished",
        winnerId: playerId,
        topCard: card,
        drawnCard: undefined,
      });
      return;
    }

    // Apply wild color choice
    const playedCard = card.color === "wild" && chosenColor
      ? { ...card, color: chosenColor }
      : card;

    // Get all players for turn logic
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    const sorted = players.sort((a, b) => a.order - b.order);

    let newDirection = game.direction;
    let newDrawStack = game.drawStack;
    let skipNext = false;

    // Apply card effects
    if (card.value === "reverse") {
      newDirection = (game.direction * -1) as 1 | -1;
    } else if (card.value === "skip") {
      skipNext = true;
    } else if (card.value === "+2") {
      newDrawStack = game.drawStack + 2;
      skipNext = true;
    } else if (card.value === "+4") {
      newDrawStack = game.drawStack + 4;
      skipNext = true;
    }

    // Advance turn
    const currentOrder = sorted.find((p) => p._id === playerId)!.order;
    const nextOrder = nextPlayerIndex(currentOrder, sorted.length, newDirection, skipNext);
    const nextPlayer = sorted.find((p) => p.order === nextOrder)!;

    await ctx.db.patch(gameId, {
      topCard: playedCard,
      direction: newDirection,
      drawStack: newDrawStack,
      drawnCard: undefined,
      currentPlayerId: nextPlayer._id,
    });
  },
});

export const drawCard = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    if (game.status !== "playing") throw new ConvexError("Game is not in progress");
    if (game.currentPlayerId !== playerId) throw new ConvexError("Not your turn");
    if (game.drawnCard) throw new ConvexError("You have already drawn this turn");

    const player = await ctx.db.get(playerId);
    if (!player) throw new ConvexError("Player not found");

    let deck = [...game.deck];
    if (deck.length === 0) deck = shuffle([...deck]);

    // Draw stack penalty — draw all stacked cards, turn always ends immediately
    if (game.drawStack > 0) {
      const drawn = deck.splice(-game.drawStack);
      await ctx.db.patch(playerId, { hand: [...player.hand, ...drawn] });

      const players = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect();
      const sorted = players.sort((a, b) => a.order - b.order);
      const currentOrder = sorted.find((p) => p._id === playerId)!.order;
      const nextOrder = nextPlayerIndex(currentOrder, sorted.length, game.direction);
      const nextPlayer = sorted.find((p) => p.order === nextOrder)!;

      await ctx.db.patch(gameId, {
        deck,
        drawStack: 0,
        drawnCard: undefined,
        currentPlayerId: nextPlayer._id,
      });
      return;
    }

    // Normal draw — 1 card
    const drawn = deck.splice(-1)[0];
    await ctx.db.patch(playerId, { hand: [...player.hand, drawn] });

    const playable = isValidPlay(drawn, game.topCard!, 0);

    if (playable) {
      // Player may play it immediately or pass — turn does NOT advance yet
      await ctx.db.patch(gameId, { deck, drawnCard: drawn });
    } else {
      // Not playable — advance turn immediately
      const players = await ctx.db
        .query("players")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect();
      const sorted = players.sort((a, b) => a.order - b.order);
      const currentOrder = sorted.find((p) => p._id === playerId)!.order;
      const nextOrder = nextPlayerIndex(currentOrder, sorted.length, game.direction);
      const nextPlayer = sorted.find((p) => p.order === nextOrder)!;

      await ctx.db.patch(gameId, {
        deck,
        drawnCard: undefined,
        currentPlayerId: nextPlayer._id,
      });
    }
  },
});

export const passTurn = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("players"),
  },
  handler: async (ctx, { gameId, playerId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    if (game.status !== "playing") throw new ConvexError("Game is not in progress");
    if (game.currentPlayerId !== playerId) throw new ConvexError("Not your turn");
    if (!game.drawnCard) throw new ConvexError("Nothing to pass — you haven't drawn yet");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    const sorted = players.sort((a, b) => a.order - b.order);
    const currentOrder = sorted.find((p) => p._id === playerId)!.order;
    const nextOrder = nextPlayerIndex(currentOrder, sorted.length, game.direction);
    const nextPlayer = sorted.find((p) => p.order === nextOrder)!;

    await ctx.db.patch(gameId, {
      drawnCard: undefined,
      currentPlayerId: nextPlayer._id,
    });
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
    if (!game) throw new ConvexError("Game not found");
    if (game.status !== "waiting") throw new ConvexError("Game already started");

    const player = await ctx.db.get(playerId);
    if (!player?.isHost) throw new ConvexError("Only the host can start the game");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    if (players.length < 2) throw new ConvexError("Need at least 2 players to start");

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
