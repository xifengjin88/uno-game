import { useState, useEffect } from "react";
import { loadPlayer, clearPlayer } from "./lib/storage";
import Home from "./screens/Home";
import Lobby from "./screens/Lobby";
import Game from "./screens/Game";

type Session = { playerId: string; gameId: string; code: string };
type Screen = "home" | "lobby" | "game" | "end";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>("home");

  useEffect(() => {
    const stored = loadPlayer();
    if (stored) {
      setSession(stored);
      setScreen("lobby");
    }
  }, []);

  function handleJoined(data: Session) {
    setSession(data);
    setScreen("lobby");
  }

  function handleLeft() {
    clearPlayer();
    setSession(null);
    setScreen("home");
  }

  if (screen === "home" || !session) return <Home onJoined={handleJoined} />;

  if (screen === "lobby") {
    return (
      <Lobby
        gameId={session.gameId}
        playerId={session.playerId}
        code={session.code}
        onGameStarted={() => setScreen("game")}
        onLeft={handleLeft}
      />
    );
  }

  if (screen === "game") {
    return (
      <Game
        gameId={session.gameId}
        playerId={session.playerId}
        onGameOver={() => setScreen("end")}
      />
    );
  }

  // Placeholder — replaced in Step 7 with <End />
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2 style={{ marginBottom: 16 }}>Game over!</h2>
      <button onClick={handleLeft}>Back to home</button>
    </div>
  );
}
