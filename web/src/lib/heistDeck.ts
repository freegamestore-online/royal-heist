export type CardKind = "number" | "guard" | "loot";

export interface HeistCard {
  id: number;
  kind: CardKind;
  value: number; // guards = 0, loot = bonus value, numbers = face value
  label: string;
  emoji: string;
  faceUp: boolean;
}

/** Build and shuffle a 40-card heist deck */
export function buildDeck(): HeistCard[] {
  const cards: Omit<HeistCard, "id" | "faceUp">[] = [];

  // Number cards: 2–9 (four of each = 32 cards)
  for (const v of [2, 3, 4, 5, 6, 7, 8, 9]) {
    for (let i = 0; i < 4; i++) {
      cards.push({ kind: "number", value: v, label: String(v), emoji: numEmoji(v) });
    }
  }

  // Guard cards: 4 guards (bust if 2nd drawn in a round)
  for (let i = 0; i < 4; i++) {
    cards.push({ kind: "guard", value: 0, label: "GUARD", emoji: "👮" });
  }

  // Loot cards: 4 bonus loot cards worth 10 each
  for (let i = 0; i < 4; i++) {
    cards.push({ kind: "loot", value: 10, label: "LOOT", emoji: "💰" });
  }

  return shuffle(cards).map((c, i) => ({ ...c, id: i, faceUp: false }));
}

function numEmoji(v: number): string {
  const map: Record<number, string> = {
    2: "💎", 3: "🔑", 4: "📦", 5: "🖼️",
    6: "💍", 7: "🏺", 8: "🎭", 9: "🃏",
  };
  return map[v] ?? "🃏";
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
