/** Fisher-Yates shuffle (in-place, returns same array) */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Create `count` matched pairs from the given symbols */
export function createPairs(symbols: string[], count: number): string[] {
  const selected = symbols.slice(0, count);
  const pairs = [...selected, ...selected];
  return shuffleArray(pairs);
}

/** Emoji sets for memory match */
export const animalEmojis = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼",
  "🐨", "🐯", "🦁", "🐮", "🐷", "🐸",
];

export const fruitEmojis = [
  "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓",
  "🫐", "🍒", "🍑", "🥭", "🍍", "🥝",
];

export const symbolEmojis = [
  "⭐", "🌙", "☀️", "🔥", "💧", "🌈", "⚡", "❄️",
  "🎵", "💎", "🎯", "🚀", "🌸", "🍀",
];
