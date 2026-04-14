import { useState, useEffect } from "react";
import { loadPlayer, clearPlayer } from "./lib/storage";
import Home from "./screens/Home";

type Session = { playerId: string; gameId: string; code: string };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  // Restore session on page refresh
  useEffect(() => {
    const stored = loadPlayer();
    if (stored) setSession(stored);
  }, []);

  function handleJoined(data: Session) {
    setSession(data);
  }

  if (!session) {
    return <Home onJoined={handleJoined} />;
  }

  // Placeholder — replaced in Step 3 with <Lobby />
  return (
    <div style={{ padding: 20 }}>
      <p>Joined! Code: <strong>{session.code}</strong></p>
      <p>Player ID: {session.playerId}</p>
      <button onClick={() => { clearPlayer(); setSession(null); }}>
        Leave
      </button>
    </div>
  );
}
