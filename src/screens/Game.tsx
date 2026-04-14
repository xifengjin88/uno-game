import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import CardView from "../components/CardView";

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
  const [error, setError] = useState("");

  const game = useQuery(api.games.getGame, { gameId: gameId as Id<"games"> });
  const allPlayers = useQuery(api.games.listPlayers, { gameId: gameId as Id<"games"> });
  const me = allPlayers?.find((p) => p._id === playerId);

  const playCardMutation = useMutation(api.games.playCard);
  const drawCardMutation = useMutation(api.games.drawCard);
  const passTurnMutation = useMutation(api.games.passTurn);

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

  // Find the drawn card index in hand for highlighting (last match to handle duplicates)
  const drawnCardIndex = hasDrawn
    ? (() => {
        const idx = [...me.hand].reverse().findIndex(
          (c) => c.color === game.drawnCard!.color && c.value === game.drawnCard!.value
        );
        return idx === -1 ? -1 : me.hand.length - 1 - idx;
      })()
    : -1;

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
      await playCardMutation({
        gameId: gameId as Id<"games">,
        playerId: playerId as Id<"players">,
        cardIndex: selectedIndex,
        chosenColor: color,
      });
      setSelectedIndex(null);
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data) : "Something went wrong");
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
            fontSize: 12, background: "#FAECE7", color: "#993C1D",
            padding: "3px 10px", borderRadius: 20, border: "0.5px solid #F0997B",
          }}>
            draw stack: +{game.drawStack}
          </div>
        )}
      </div>

      {/* Opponents */}
      <div style={{
        display: "flex", justifyContent: "space-around",
        background: "#0F6E56", borderRadius: 12,
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
              <div style={{ fontSize: 10, color: "#9FE1CB" }}>{opp.nickname}</div>
              <div style={{ fontSize: 11, color: "#E1F5EE", fontWeight: 500 }}>
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
          <CardView
            card={{ color: "wild", value: "wild" }}
            faceDown
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
          {game.topCard && <CardView card={game.topCard} />}
        </div>
      </div>

      {/* Turn indicator */}
      <div style={{
        textAlign: "center", fontSize: 12,
        color: isMyTurn ? "#3B6D11" : "var(--color-text-secondary)",
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

      {/* Your hand */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          your hand ({me.hand.length} cards)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {me.hand.map((card, i) => (
            <CardView
              key={i}
              card={card}
              small
              selected={selectedIndex === i}
              highlighted={i === drawnCardIndex && hasDrawn}
              onClick={() => handleCardClick(i)}
            />
          ))}
        </div>
      </div>

      {/* Play selected button */}
      {selectedIndex !== null && !showColorPicker && (
        <button
          style={{ marginTop: 12, width: "100%" }}
          onClick={() => handlePlayCard(selectedIndex)}
        >
          Play {me.hand[selectedIndex]?.value} card
        </button>
      )}

      {/* Pass button — only shown after drawing a playable card */}
      {hasDrawn && selectedIndex === null && (
        <button
          style={{
            marginTop: 12, width: "100%",
            background: "transparent",
            color: "var(--color-text-secondary)",
            border: "0.5px solid var(--color-border-secondary)",
          }}
          onClick={handlePass}
        >
          Pass turn
        </button>
      )}

      {/* UNO button */}
      {me.hand.length === 2 && isMyTurn && (
        <button style={{
          marginTop: 8, width: "100%",
          background: "#D85A30", color: "#fff", border: "none",
          borderRadius: "var(--border-radius-md)", padding: "10px",
          fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>
          UNO!
        </button>
      )}
    </div>
  );
}
