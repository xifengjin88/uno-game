import type { Card } from "./deck";

export function isValidPlay(card: Card, topCard: Card, drawStack: number): boolean {
  // If there's an active draw stack, you can only counter with another +2 or +4
  if (drawStack > 0) {
    if (topCard.value === "+2") return card.value === "+2" || card.value === "+4";
    if (topCard.value === "+4") return card.value === "+4";
  }

  // Wilds are always valid
  if (card.color === "wild") return true;

  // Match by color or value
  return card.color === topCard.color || card.value === topCard.value;
}

export function isJumpIn(card: Card, topCard: Card): boolean {
  return card.color === topCard.color && card.value === topCard.value;
}

export function nextPlayerIndex(
  currentOrder: number,
  playerCount: number,
  direction: 1 | -1,
  skip = false
): number {
  const steps = skip ? 2 : 1;
  return ((currentOrder + direction * steps) % playerCount + playerCount) % playerCount;
}
