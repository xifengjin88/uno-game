import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { savePlayer } from "../lib/storage";

type Props = {
  onJoined: (data: { playerId: string; gameId: string; code: string }) => void;
};

export default function Home({ onJoined }: Props) {
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const createGame = useMutation(api.games.createGame);
  const joinGame = useMutation(api.games.joinGame);

  const nicknameValid = nickname.trim().length >= 2;

  async function handleCreate() {
    if (!nicknameValid) return;
    setLoading(true);
    setError("");
    try {
      const result = await createGame({ nickname: nickname.trim() });
      savePlayer(result);
      onJoined(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!nicknameValid || roomCode.trim().length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const result = await joinGame({
        nickname: nickname.trim(),
        code: roomCode.trim().toUpperCase(),
      });
      savePlayer(result);
      onJoined(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          display: "inline-block",
          background: "#D85A30",
          color: "#fff",
          fontSize: 40,
          fontWeight: 500,
          padding: "10px 24px",
          borderRadius: 12,
          letterSpacing: 4,
        }}>
          UNO
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8 }}>
          real-time multiplayer
        </p>
      </div>

      <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        Your nickname
      </label>
      <input
        style={{ width: "100%", marginTop: 4, marginBottom: 16 }}
        placeholder="e.g. CoolPlayer99"
        value={nickname}
        maxLength={20}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
      />

      <button
        style={{ width: "100%", marginBottom: 8 }}
        disabled={!nicknameValid || loading}
        onClick={handleCreate}
      >
        {loading ? "Creating…" : "Create a room"}
      </button>

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        margin: "16px 0", color: "var(--color-text-secondary)", fontSize: 12,
      }}>
        <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
        or
        <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
      </div>

      <label style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        Room code
      </label>
      <input
        style={{
          width: "100%", marginTop: 4, marginBottom: 12,
          textTransform: "uppercase", letterSpacing: 4, fontSize: 18,
        }}
        placeholder="XKQP"
        value={roomCode}
        maxLength={4}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
      />

      <button
        style={{
          width: "100%", background: "transparent",
          color: "#534AB7", border: "0.5px solid #534AB7",
        }}
        disabled={!nicknameValid || roomCode.length !== 4 || loading}
        onClick={handleJoin}
      >
        {loading ? "Joining…" : "Join room"}
      </button>

      {error && (
        <p style={{
          color: "var(--color-text-danger)", fontSize: 13,
          marginTop: 12, textAlign: "center",
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
