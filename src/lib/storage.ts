const PLAYER_KEY = "uno_player";

export type StoredPlayer = {
  playerId: string;
  gameId: string;
  code: string;
};

export function savePlayer(data: StoredPlayer) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(data));
}

export function loadPlayer(): StoredPlayer | null {
  const raw = localStorage.getItem(PLAYER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPlayer() {
  localStorage.removeItem(PLAYER_KEY);
}
