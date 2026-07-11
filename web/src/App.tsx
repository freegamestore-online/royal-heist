import { useCallback, useEffect, useState } from "react";
import { Card } from "./components/Card";
import { CardGrid } from "./components/CardGrid";
import { useHighScore } from "./hooks/useHighScore";
import { useTimer } from "./hooks/useTimer";
import { animalEmojis, createPairs } from "./lib/deck";

interface CardData {
  id: number;
  symbol: string;
  faceUp: boolean;
  matched: boolean;
}

type Difficulty = "easy" | "medium" | "hard";

const GRID_CONFIG: Record<Difficulty, { cols: number; rows: number }> = {
  easy: { cols: 4, rows: 3 },
  medium: { cols: 4, rows: 4 },
  hard: { cols: 6, rows: 4 },
};

function createDeck(difficulty: Difficulty): CardData[] {
  const { cols, rows } = GRID_CONFIG[difficulty];
  const pairCount = (cols * rows) / 2;
  const symbols = createPairs(animalEmojis, pairCount);
  return symbols.map((symbol, i) => ({
    id: i,
    symbol,
    faceUp: false,
    matched: false,
  }));
}

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [cards, setCards] = useState<CardData[]>(() => createDeck(difficulty));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const { seconds, start, stop, reset } = useTimer();
  const { best, submit } = useHighScore(difficulty);
  const [isNewBest, setIsNewBest] = useState(false);

  const { cols } = GRID_CONFIG[difficulty];

  const resetGame = useCallback(
    (diff: Difficulty) => {
      setDifficulty(diff);
      setCards(createDeck(diff));
      setFlipped([]);
      setMoves(0);
      setWon(false);
      setStarted(false);
      setIsNewBest(false);
      reset();
    },
    [reset],
  );

  // Check for win
  useEffect(() => {
    if (cards.length > 0 && cards.every((c) => c.matched)) {
      setWon(true);
      stop();
      const result = submit(moves, seconds);
      setIsNewBest(result);
    }
  }, [cards, moves, seconds, stop, submit]);

  // Handle match checking
  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      const cardA = cards[first!];
      const cardB = cards[second!];

      if (cardA && cardB && cardA.symbol === cardB.symbol) {
        // Match found
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, matched: true } : c,
            ),
          );
          setFlipped([]);
        }, 400);
      } else {
        // No match — flip back
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === first || c.id === second ? { ...c, faceUp: false } : c,
            ),
          );
          setFlipped([]);
        }, 800);
      }
    }
  }, [flipped, cards]);

  const handleCardClick = (id: number) => {
    if (flipped.length >= 2) return;
    const card = cards[id];
    if (!card || card.faceUp || card.matched) return;

    if (!started) {
      setStarted(true);
      start();
    }

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, faceUp: true } : c)),
    );

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="game-wrapper">
      {/* Header */}
      <header className="game-header">
        <h1 className="game-title">Memory Match</h1>
        <div className="game-stats">
          <span className="stat">Moves: {moves}</span>
          <span className="stat">Time: {formatTime(seconds)}</span>
        </div>
      </header>

      {/* Difficulty selector */}
      <div className="difficulty-row">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            type="button"
            className={`diff-btn ${d === difficulty ? "diff-btn-active" : ""}`}
            onClick={() => resetGame(d)}
          >
            {d === "easy" ? "4x3" : d === "medium" ? "4x4" : "6x4"}
          </button>
        ))}
      </div>

      {/* Best score */}
      {best && (
        <div className="best-score">
          Best: {best.moves} moves in {formatTime(best.seconds)}
        </div>
      )}

      {/* Card grid */}
      <CardGrid columns={cols}>
        {cards.map((card) => (
          <Card
            key={card.id}
            faceUp={card.faceUp}
            matched={card.matched}
            front={<span className="card-emoji">{card.symbol}</span>}
            onClick={() => handleCardClick(card.id)}
            disabled={card.faceUp || card.matched || flipped.length >= 2}
          />
        ))}
      </CardGrid>

      {/* Win overlay */}
      {won && (
        <div className="win-overlay">
          <div className="win-card">
            <h2 className="win-title">You Win!</h2>
            <p className="win-stats">
              {moves} moves in {formatTime(seconds)}
            </p>
            {isNewBest && <p className="win-best">New Best Score!</p>}
            <button
              type="button"
              className="play-again-btn"
              onClick={() => resetGame(difficulty)}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="game-footer">
        <a
          href="https://freegamestore.online"
          target="_blank"
          rel="noopener noreferrer"
        >
          Part of FreeGameStore — free forever
        </a>
      </footer>
    </div>
  );
}
