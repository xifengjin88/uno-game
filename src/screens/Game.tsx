import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import React, { useState } from "react";
import { UnoCard } from "../components/UnoCards";

type Props = {
  gameId: string;
  playerId: string;
  onGameOver: () => void;
};

const COLORS = ["#CECBF6", "#F5C4B3", "#9FE1CB", "#FAC775", "#B5D4F4", "#C0DD97"];
const TEXT_COLORS = ["#3C3489", "#993C1D", "#0F6E56", "#854F0B", "#185FA5", "#3B6D11"];
const WILD_COLORS = ["red", "blue", "green", "yellow"] as const;

export default function Game({ gameId, playerId, onGameOver }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingJumpIn, setPendingJumpIn] = useState(false);
  const [error, setError] = useState("");

  const game = useQuery(api.games.getGame, { gameId: gameId as Id<"games"> });
  const allPlayers = useQuery(api.games.listPlayers, { gameId: gameId as Id<"games"> });
  const me = allPlayers?.find((p) => p._id === playerId);

  const playCardMutation = useMutation(api.games.playCard);
  const drawCardMutation = useMutation(api.games.drawCard);
  const passTurnMutation = useMutation(api.games.passTurn);
  const jumpInMutation = useMutation(api.games.jumpIn);

  if (!game || !allPlayers || !me) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)" }}>
        Loading…
      </div>
    );
  }

  if (game.status === "finished") {
    onGameOver();
    return null;
  }

  const isMyTurn = game.currentPlayerId === playerId;
  const hasDrawn = !!game.drawnCard && isMyTurn;
  const opponents = allPlayers
    .filter((p) => p._id !== playerId)
    .sort((a, b) => a.order - b.order);
  const currentPlayer = allPlayers.find((p) => p._id === game.currentPlayerId);

  // Cards eligible for jump-in — exact match to top card, not your turn, no draw stack
  const jumpInIndices: number[] =
    !isMyTurn && game.drawStack === 0 && game.topCard
      ? me.hand.reduce<number[]>((acc, card, i) => {
          if (card.color === game.topCard!.color && card.value === game.topCard!.value) {
            acc.push(i);
          }
          return acc;
        }, [])
      : [];

  const canJumpIn = jumpInIndices.length > 0;

  // Cards that can counter an active draw stack
  const counterIndices: number[] =
    isMyTurn && game.drawStack > 0 && game.topCard
      ? me.hand.reduce<number[]>((acc, card, i) => {
          if (
            (game.topCard!.value === "+2" && (card.value === "+2" || card.value === "+4")) ||
            (game.topCard!.value === "+4" && card.value === "+4")
          ) {
            acc.push(i);
          }
          return acc;
        }, [])
      : [];

  // Find the drawn card index in hand for highlighting (last match to handle duplicates)
  const drawnCardIndex = hasDrawn
    ? (() => {
        const idx = [...me.hand].reverse().findIndex(
          (c) => c.color === game.drawnCard!.color && c.value === game.drawnCard!.value
        );
        return idx === -1 ? -1 : me.hand.length - 1 - idx;
      })()
    : -1;

  function toUnoProps(card: { color: string; value: string }) {
    if (card.value === "+4")      return { color: "wild"       as const, type: "wild4"   as const };
    if (card.value === "wild")    return { color: "wild"       as const, type: "wild"    as const };
    if (card.value === "skip")    return { color: card.color   as any,   type: "skip"    as const };
    if (card.value === "reverse") return { color: card.color   as any,   type: "reverse" as const };
    if (card.value === "+2")      return { color: card.color   as any,   type: "draw2"   as const };
    return { color: card.color as any, type: "number" as const, value: parseInt(card.value) };
  }

  function cardStyle(i: number): React.CSSProperties {
    if (selectedIndex === i)
      return { outline: "2.5px solid #FAC775", outlineOffset: 3, transform: "translateY(-10px)", transition: "transform 0.15s ease" };
    if ((i === drawnCardIndex && hasDrawn) || jumpInIndices.includes(i) || counterIndices.includes(i))
      return { outline: "2.5px solid #9FE1CB", outlineOffset: 3, transform: "translateY(-5px)", transition: "transform 0.15s ease" };
    return { transition: "transform 0.15s ease" };
  }

  function initials(name: string) {
    return name.slice(0, 2).toUpperCase();
  }

  function turnIndicatorText() {
    if (!isMyTurn) return `waiting for ${currentPlayer?.nickname}…`;
    if (hasDrawn) return "play the drawn card or pass your turn";
    if (game.drawStack > 0) return `draw +${game.drawStack} or counter with a matching card`;
    return "your turn — play a card or draw";
  }

  async function handleCardClick(index: number) {
    if (!isMyTurn) return;
    // When in drawn state, only the drawn card is interactive
    if (hasDrawn && index !== drawnCardIndex) return;

    const card = me.hand[index];

    if (card.color === "wild") {
      setSelectedIndex(index);
      setShowColorPicker(true);
      return;
    }

    if (selectedIndex === index) {
      await handlePlayCard(index);
    } else {
      setSelectedIndex(index);
    }
  }

  async function handlePlayCard(index: number) {
    setError("");
    try {
      await playCardMutation({
        gameId: gameId as Id<"games">,
        playerId: playerId as Id<"players">,
        cardIndex: index,
      });
      setSelectedIndex(null);
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : "Something went wrong");
    }
  }

  async function handleColorPick(color: typeof WILD_COLORS[number]) {
    if (selectedIndex === null) return;
    setShowColorPicker(false);
    setError("");
    try {
      if (pendingJumpIn) {
        await jumpInMutation({
          gameId: gameId as Id<"games">,
          playerId: playerId as Id<"players">,
          cardIndex: selectedIndex,
          chosenColor: color,
        });
      } else {
        await playCardMutation({
          gameId: gameId as Id<"games">,
          playerId: playerId as Id<"players">,
          cardIndex: selectedIndex,
          chosenColor: color,
        });
      }
      setSelectedIndex(null);
      setPendingJumpIn(false);
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : "Something went wrong");
      setPendingJumpIn(false);
    }
  }

  async function handleDraw() {
    if (!isMyTurn || hasDrawn) return;
    setError("");
    try {
      await drawCardMutation({
        gameId: gameId as Id<"games">,
        playerId: playerId as Id<"players">,
      });
      setSelectedIndex(null);
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : "Something went wrong");
    }
  }

  async function handleJumpIn(index: number) {
    setError("");
    const card = me.hand[index];

    if (card.color === "wild") {
      setSelectedIndex(index);
      setPendingJumpIn(true);
      setShowColorPicker(true);
      return;
    }

    try {
      await jumpInMutation({
        gameId: gameId as Id<"games">,
        playerId: playerId as Id<"players">,
        cardIndex: index,
      });
      setSelectedIndex(null);
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : "Something went wrong");
    }
  }

  async function handlePass() {
    setError("");
    try {
      await passTurnMutation({
        gameId: gameId as Id<"games">,
        playerId: playerId as Id<"players">,
      });
      setSelectedIndex(null);
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : "Something went wrong");
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 32px" }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          {game.direction === 1 ? "▶ clockwise" : "◀ counter-clockwise"}
        </div>
        {game.drawStack > 0 && (
          <div style={{
            fontSize: 12, background: "rgba(232,25,44,0.15)", color: "#ff8a8a",
            padding: "3px 10px", borderRadius: 20, border: "0.5px solid rgba(232,25,44,0.4)",
          }}>
            draw stack: +{game.drawStack}
          </div>
        )}
      </div>

      {/* Opponents */}
      <div style={{
        display: "flex", justifyContent: "space-around",
        background: "rgba(26,168,51,0.12)", borderRadius: 12,
        border: "0.5px solid rgba(26,168,51,0.2)",
        padding: "14px 10px", marginBottom: 16,
      }}>
        {opponents.map((opp) => {
          const ci = opp.order % COLORS.length;
          const isTheirTurn = game.currentPlayerId === opp._id;
          return (
            <div key={opp._id} style={{ textAlign: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: COLORS[ci], color: TEXT_COLORS[ci],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 500, margin: "0 auto 4px",
                outline: isTheirTurn ? "2px solid #FAC775" : "none",
                outlineOffset: 2,
                opacity: opp.isConnected ? 1 : 0.5,
              }}>
                {initials(opp.nickname)}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{opp.nickname}</div>
              <div style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 500 }}>
                {opp.hand.length} cards
                {!opp.isConnected && " 💤"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table center */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 24, marginBottom: 8,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            draw pile
          </div>
          <UnoCard
            color="wild" type="wild" faceDown size="md"
            onClick={isMyTurn && !hasDrawn ? handleDraw : undefined}
          />
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 3 }}>
            {game.deck.length} left
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginBottom: 4 }}>
            discard
          </div>
          {game.topCard && <UnoCard {...toUnoProps(game.topCard)} size="md" />}
        </div>
      </div>

      {/* Turn indicator */}
      <div style={{
        textAlign: "center", fontSize: 12,
        color: isMyTurn ? "var(--uno-green)" : "var(--color-text-secondary)",
        fontWeight: isMyTurn ? 500 : 400,
        marginBottom: 16, minHeight: 20,
      }}>
        {turnIndicatorText()}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize: 12, color: "var(--color-text-danger)",
          textAlign: "center", marginBottom: 10,
        }}>
          {error}
        </div>
      )}

      {/* Wild color picker */}
      {showColorPicker && (
        <div style={{
          display: "flex", justifyContent: "center",
          gap: 10, marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", alignSelf: "center" }}>
            pick color:
          </div>
          {WILD_COLORS.map((c) => (
            <div
              key={c}
              onClick={() => handleColorPick(c)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: { red: "#E24B4A", blue: "#185FA5", green: "#3B6D11", yellow: "#BA7517" }[c],
                cursor: "pointer", border: "2px solid rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}

      {/* Jump-in banner */}
      {canJumpIn && (
        <div style={{
          fontSize: 12, background: "rgba(26,168,51,0.12)", color: "#6ee07e",
          padding: "6px 12px", borderRadius: "var(--border-radius-md)",
          border: "0.5px solid rgba(26,168,51,0.35)", textAlign: "center",
          marginBottom: 10,
        }}>
          you can jump in — tap the highlighted card
        </div>
      )}

      {/* Your hand */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          your hand ({me.hand.length} cards)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {me.hand.map((card, i) => (
            <UnoCard
              key={i}
              {...toUnoProps(card)}
              size="sm"
              style={cardStyle(i)}
              onClick={() => {
                if (jumpInIndices.includes(i)) {
                  handleJumpIn(i);
                } else {
                  handleCardClick(i);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Play selected button */}
      {selectedIndex !== null && !showColorPicker && (
        <button style={{ marginTop: 12, width: "100%" }} onClick={() => handlePlayCard(selectedIndex)}>
          Play {me.hand[selectedIndex]?.value} card
        </button>
      )}

      {/* Pass button — only shown after drawing a playable card */}
      {hasDrawn && selectedIndex === null && (
        <button
          className="secondary"
          style={{ marginTop: 12, width: "100%" }}
          onClick={handlePass}
        >
          Pass turn
        </button>
      )}

      {/* UNO button */}
      {me.hand.length === 2 && isMyTurn && (
        <button className="uno" style={{ marginTop: 8, width: "100%" }}>
          UNO!
        </button>
      )}
    </div>
  );
}
