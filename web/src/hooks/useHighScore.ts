import { useCallback, useState } from "react";

const STORAGE_KEY = "memory-match-highscores";

interface HighScore {
  moves: number;
  seconds: number;
}

type Scores = Record<string, HighScore>;

function loadScores(): Scores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Scores;
  } catch {
    // ignore
  }
  return {};
}

export function useHighScore(difficulty: string) {
  const [scores, setScores] = useState<Scores>(loadScores);

  const best = scores[difficulty] ?? null;

  const submit = useCallback(
    (moves: number, seconds: number) => {
      const current = scores[difficulty];
      if (!current || moves < current.moves || (moves === current.moves && seconds < current.seconds)) {
        const updated = { ...scores, [difficulty]: { moves, seconds } };
        setScores(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return true; // new high score
      }
      return false;
    },
    [scores, difficulty],
  );

  return { best, submit };
}
