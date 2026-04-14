import { useState, useEffect } from "react";
import { loadPlayer, clearPlayer } from "./lib/storage";
import Home from "./screens/Home";
import Lobby from "./screens/Lobby";

type Session = { playerId: string; gameId: string; code: string };
type Screen = "home" | "lobby" | "game";

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

  function handleGameStarted() {
    setScreen("game");
  }

  if (screen === "home" || !session) {
    return <Home onJoined={handleJoined} />;
  }

  if (screen === "lobby") {
    return (
      <Lobby
        gameId={session.gameId}
        playerId={session.playerId}
        code={session.code}
        onGameStarted={handleGameStarted}
        onLeft={handleLeft}
      />
    );
  }

  // Placeholder — replaced in Step 4 with <Game />
  return (
    <div style={{ padding: 20 }}>
      <p>Game started!</p>
      <button onClick={handleLeft}>Leave</button>
    </div>
  );
}
