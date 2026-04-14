import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect } from "react";
import { clearPlayer } from "../lib/storage";

type Props = {
  gameId: string;
  playerId: string;
  code: string;
  onGameStarted: () => void;
  onLeft: () => void;
};

const COLORS = ["#CECBF6", "#F5C4B3", "#9FE1CB", "#FAC775", "#B5D4F4", "#C0DD97"];
const TEXT_COLORS = ["#3C3489", "#993C1D", "#0F6E56", "#854F0B", "#185FA5", "#3B6D11"];

export default function Lobby({ gameId, playerId, code, onGameStarted, onLeft }: Props) {
  const players = useQuery(api.games.listPlayers, {
    gameId: gameId as Id<"games">,
  });
  const game = useQuery(api.games.getByCode, { code });

  const startGame = useMutation(api.games.startGame);
  const leaveGame = useMutation(api.players.leaveGame);
  const setConnected = useMutation(api.players.setConnected);

  const me = players?.find((p) => p._id === playerId);
  const isHost = me?.isHost ?? false;
  const canStart = (players?.length ?? 0) >= 2;

  // Mark connected on mount, disconnected on unmount
  useEffect(() => {
    setConnected({ playerId: playerId as Id<"players">, isConnected: true });
    return () => {
      setConnected({ playerId: playerId as Id<"players">, isConnected: false });
    };
  }, [playerId]);

  // Detect when host starts the game — all clients transition together
  useEffect(() => {
    if (game?.status === "playing") onGameStarted();
  }, [game?.status]);

  async function handleStart() {
    try {
      await startGame({
        gameId: gameId as Id<"games">,
        playerId: playerId as Id<"players">,
      });
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleLeave() {
    await leaveGame({ playerId: playerId as Id<"players"> });
    clearPlayer();
    onLeft();
  }

  function initials(name: string) {
    return name.slice(0, 2).toUpperCase();
  }

  if (!players) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--color-text-secondary)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 360, margin: "40px auto", padding: "0 20px" }}>

      {/* Room code */}
      <div style={{
        textAlign: "center",
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-secondary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "16px",
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>
          room code
        </div>
        <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: 8, color: "#3C3489" }}>
          {code}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
          share with friends
        </div>
      </div>

      {/* Player list */}
      <div style={{ marginBottom: 20 }}>
        {players.sort((a, b) => a.order - b.order).map((player, i) => (
          <div key={player._id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 0",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: COLORS[i % COLORS.length],
              color: TEXT_COLORS[i % TEXT_COLORS.length],
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 500, flexShrink: 0,
            }}>
              {initials(player.nickname)}
            </div>
            <div style={{ flex: 1, fontSize: 14, color: "var(--color-text-primary)" }}>
              {player.nickname}
              {player._id === playerId && (
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 6 }}>
                  (you)
                </span>
              )}
            </div>
            {player.isHost && (
              <span style={{
                fontSize: 10, background: "#EEEDFE", color: "#534AB7",
                padding: "2px 8px", borderRadius: 20, border: "0.5px solid #AFA9EC",
              }}>
                host
              </span>
            )}
            {!player.isHost && (
              <span style={{
                fontSize: 10,
                background: player.isConnected ? "#E1F5EE" : "var(--color-background-secondary)",
                color: player.isConnected ? "#0F6E56" : "var(--color-text-secondary)",
                padding: "2px 8px", borderRadius: 20,
                border: `0.5px solid ${player.isConnected ? "#5DCAA5" : "var(--color-border-secondary)"}`,
              }}>
                {player.isConnected ? "ready" : "away"}
              </span>
            )}
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, i) => (
          <div key={i} style={{
            fontSize: 12, color: "var(--color-text-secondary)",
            padding: "8px 0",
            borderBottom: "0.5px solid var(--color-border-tertiary)",
          }}>
            — waiting for player {players.length + i + 1} —
          </div>
        ))}
      </div>

      {/* Status */}
      <p style={{
        fontSize: 12, color: "var(--color-text-secondary)",
        textAlign: "center", marginBottom: 16,
      }}>
        {players.length} / 6 players joined
        {!canStart && " · need at least 2 to start"}
      </p>

      {/* Actions */}
      {isHost && (
        <button
          style={{ width: "100%", marginBottom: 8 }}
          disabled={!canStart}
          onClick={handleStart}
        >
          Start game
        </button>
      )}
      {!isHost && (
        <div style={{
          textAlign: "center", fontSize: 13,
          color: "var(--color-text-secondary)", marginBottom: 12,
        }}>
          Waiting for host to start…
        </div>
      )}
      <button
        style={{
          width: "100%", background: "transparent",
          color: "var(--color-text-secondary)",
          border: "0.5px solid var(--color-border-secondary)",
        }}
        onClick={handleLeave}
      >
        Leave room
      </button>
    </div>
  );
}
