type Color = "red" | "blue" | "green" | "yellow";
type Value =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "+2" | "wild" | "+4";

export type Card = { color: Color | "wild"; value: Value };

const COLORS: Color[] = ["red", "blue", "green", "yellow"];
const NUMBERS: Value[] = ["1","2","3","4","5","6","7","8","9"];
const ACTIONS: Value[] = ["skip", "reverse", "+2"];

export function buildDeck(): Card[] {
  const deck: Card[] = [];

  for (const color of COLORS) {
    // One 0 per color
    deck.push({ color, value: "0" });
    // Two of each number and action per color
    for (const value of [...NUMBERS, ...ACTIONS]) {
      deck.push({ color, value });
      deck.push({ color, value });
    }
  }

  // 4 wilds + 4 wild draw fours
  for (let i = 0; i < 4; i++) {
    deck.push({ color: "wild", value: "wild" });
    deck.push({ color: "wild", value: "+4" });
  }

  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealHands(
  deck: Card[],
  playerCount: number,
  cardsEach = 7
): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  const remaining = [...deck];

  for (let i = 0; i < cardsEach; i++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p].push(remaining.pop()!);
    }
  }

  return { hands, remaining };
}

export function cardPoints(card: Card): number {
  if (card.value === "wild" || card.value === "+4") return 50;
  if (card.value === "skip" || card.value === "reverse" || card.value === "+2") return 20;
  return parseInt(card.value, 10);
}
