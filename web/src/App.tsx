import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "./components/Card";
import { CardGrid } from "./components/CardGrid";
import { buildDeck, type HeistCard } from "./lib/heistDeck";
import { aiShouldDraw } from "./lib/aiPlayer";

// ─── Constants ───────────────────────────────────────────────────────────────
const TARGET_SCORE = 100;
const AI_DRAW_DELAY_MS = 900;
const AI_BANK_DELAY_MS = 700;

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase =
  | "player-turn"   // player draws / banks
  | "ai-turn"       // AI is taking its turn (animated)
  | "round-bust"    // player busted this round
  | "ai-bust"       // AI busted
  | "game-over";    // someone hit TARGET_SCORE

type Winner = "player" | "ai" | null;

interface GameState {
  deck: HeistCard[];
  playerTotal: number;
  aiTotal: number;
  playerRound: number;    // current round score
  aiRound: number;
  playerGuards: number;   // guards drawn this round
  aiGuards: number;
  drawnCards: HeistCard[]; // cards flipped this round (shared display)
  phase: Phase;
  winner: Winner;
  message: string;
  highScore: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function loadHighScore(): number {
  try {
    return parseInt(localStorage.getItem("royal-heist-hs") ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    localStorage.setItem("royal-heist-hs", String(score));
  } catch {
    // ignore
  }
}

function guardsLeft(deck: HeistCard[]): number {
  return deck.filter((c) => c.kind === "guard").length;
}

function initGame(): GameState {
  return {
    deck: buildDeck(),
    playerTotal: 0,
    aiTotal: 0,
    playerRound: 0,
    aiRound: 0,
    playerGuards: 0,
    aiGuards: 0,
    drawnCards: [],
    phase: "player-turn",
    winner: null,
    message: "Draw a card or Bank your score!",
    highScore: loadHighScore(),
  };
}

// ─── Card face renderer ───────────────────────────────────────────────────────
function HeistCardFace({ card }: { card: HeistCard }) {
  const bg =
    card.kind === "guard"
      ? "linear-gradient(135deg,#7f1d1d,#b91c1c)"
      : card.kind === "loot"
        ? "linear-gradient(135deg,#713f12,#ca8a04)"
        : "linear-gradient(135deg,#1e3a5f,#1d4ed8)";

  const borderColor =
    card.kind === "guard"
      ? "#ef4444"
      : card.kind === "loot"
        ? "#fbbf24"
        : "#60a5fa";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        border: `2px solid ${borderColor}`,
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        color: "#fff",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", lineHeight: 1 }}>
        {card.emoji}
      </span>
      <span
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: "clamp(0.7rem, 2vw, 0.95rem)",
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          opacity: 0.9,
        }}
      >
        {card.kind === "number" ? `+${card.value}` : card.label}
      </span>
    </div>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────
function ScoreBar({
  label,
  total,
  round,
  isActive,
  isBust,
}: {
  label: string;
  total: number;
  round: number;
  isActive: boolean;
  isBust: boolean;
}) {
  const pct = Math.min((total / TARGET_SCORE) * 100, 100);
  return (
    <div
      style={{
        background: "var(--panel)",
        border: `2px solid ${isActive ? "var(--accent)" : "var(--line)"}`,
        borderRadius: "10px",
        padding: "10px 14px",
        flex: 1,
        minWidth: 0,
        transition: "border-color 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            color: isActive ? "var(--accent)" : "var(--muted)",
          }}
        >
          {label}
        </span>
        <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>
          {total}
          {round > 0 && (
            <span
              style={{
                fontSize: "0.75rem",
                color: isBust ? "var(--error)" : "var(--success)",
                marginLeft: 4,
              }}
            >
              {isBust ? "BUST" : `+${round}`}
            </span>
          )}
        </span>
      </div>
      {/* Progress bar */}
      <div
        style={{
          height: 6,
          background: "var(--line)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: isActive ? "var(--accent)" : "var(--muted)",
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }}>
        {TARGET_SCORE - total > 0 ? `${TARGET_SCORE - total} to win` : "🏆 Winner!"}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [gs, setGs] = useState<GameState>(initGame);
  const [flippingId, setFlippingId] = useState<number | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear AI timers on unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // ── Draw a card (player) ──────────────────────────────────────────────────
  const playerDraw = useCallback(() => {
    setGs((prev) => {
      if (prev.phase !== "player-turn" || prev.deck.length === 0) return prev;

      const [topCard, ...rest] = prev.deck;
      if (!topCard) return prev;

      const revealed: HeistCard = { ...topCard, faceUp: true };
      const newDrawn = [...prev.drawnCards, revealed];

      // Animate flip
      setFlippingId(topCard.id);
      setTimeout(() => setFlippingId(null), 420);

      if (revealed.kind === "guard") {
        const newGuards = prev.playerGuards + 1;
        if (newGuards >= 2) {
          // BUST
          return {
            ...prev,
            deck: rest,
            drawnCards: newDrawn,
            playerGuards: newGuards,
            playerRound: 0,
            phase: "round-bust",
            message: "🚨 Busted! Guards caught you — round score lost!",
          };
        }
        return {
          ...prev,
          deck: rest,
          drawnCards: newDrawn,
          playerGuards: newGuards,
          message: "⚠️ One guard! Draw carefully or Bank now.",
        };
      }

      const newRound = prev.playerRound + revealed.value;
      const newTotal = prev.playerTotal;

      // Check if drawing this would win (round + total)
      if (newTotal + newRound >= TARGET_SCORE) {
        const finalTotal = newTotal + newRound;
        const hs = Math.max(prev.highScore, finalTotal);
        saveHighScore(hs);
        return {
          ...prev,
          deck: rest,
          drawnCards: newDrawn,
          playerRound: newRound,
          playerTotal: finalTotal,
          highScore: hs,
          phase: "game-over",
          winner: "player",
          message: "🎉 You win the heist!",
        };
      }

      return {
        ...prev,
        deck: rest,
        drawnCards: newDrawn,
        playerRound: newRound,
        message:
          revealed.kind === "loot"
            ? `💰 Loot! +${revealed.value} — round score: ${newRound}`
            : `+${revealed.value} — round score: ${newRound}. Draw more or Bank!`,
      };
    });
  }, []);

  // ── Bank (player) ─────────────────────────────────────────────────────────
  const playerBank = useCallback(() => {
    setGs((prev) => {
      if (prev.phase !== "player-turn" || prev.playerRound === 0) return prev;

      const newTotal = prev.playerTotal + prev.playerRound;
      const hs = Math.max(prev.highScore, newTotal);
      saveHighScore(hs);

      if (newTotal >= TARGET_SCORE) {
        return {
          ...prev,
          playerTotal: newTotal,
          playerRound: 0,
          highScore: hs,
          phase: "game-over",
          winner: "player",
          message: "🎉 You win the heist!",
        };
      }

      return {
        ...prev,
        playerTotal: newTotal,
        playerRound: 0,
        playerGuards: 0,
        drawnCards: [],
        phase: "ai-turn",
        highScore: hs,
        message: `Banked ${prev.playerRound} pts! Total: ${newTotal}. AI's turn…`,
      };
    });
  }, []);

  // ── End player bust round → hand to AI ───────────────────────────────────
  const endBustRound = useCallback(() => {
    setGs((prev) => {
      if (prev.phase !== "round-bust") return prev;
      return {
        ...prev,
        playerRound: 0,
        playerGuards: 0,
        drawnCards: [],
        phase: "ai-turn",
        message: "AI's turn…",
      };
    });
  }, []);

  // ── AI turn logic (runs as a chain of timeouts) ───────────────────────────
  useEffect(() => {
    if (gs.phase !== "ai-turn") return;

    const runAiStep = (state: GameState) => {
      const shouldDraw = aiShouldDraw({
        roundScore: state.aiRound,
        totalScore: state.aiTotal,
        guardsDrawn: state.aiGuards,
        cardsLeft: state.deck.length,
        guardsLeft: guardsLeft(state.deck),
        targetScore: TARGET_SCORE,
      });

      if (!shouldDraw || state.deck.length === 0) {
        // AI banks
        aiTimerRef.current = setTimeout(() => {
          setGs((prev) => {
            if (prev.phase !== "ai-turn") return prev;
            const newTotal = prev.aiTotal + prev.aiRound;
            if (newTotal >= TARGET_SCORE) {
              return {
                ...prev,
                aiTotal: newTotal,
                aiRound: 0,
                phase: "game-over",
                winner: "ai",
                message: "🤖 AI wins the heist! Better luck next time.",
              };
            }
            return {
              ...prev,
              aiTotal: newTotal,
              aiRound: 0,
              aiGuards: 0,
              drawnCards: [],
              phase: "player-turn",
              message: `AI banked ${prev.aiRound} pts (total ${newTotal}). Your turn!`,
            };
          });
        }, AI_BANK_DELAY_MS);
        return;
      }

      // AI draws
      aiTimerRef.current = setTimeout(() => {
        setGs((prev) => {
          if (prev.phase !== "ai-turn") return prev;
          const [topCard, ...rest] = prev.deck;
          if (!topCard) return prev;

          const revealed: HeistCard = { ...topCard, faceUp: true };
          const newDrawn = [...prev.drawnCards, revealed];

          if (revealed.kind === "guard") {
            const newGuards = prev.aiGuards + 1;
            if (newGuards >= 2) {
              // AI busts
              return {
                ...prev,
                deck: rest,
                drawnCards: newDrawn,
                aiGuards: newGuards,
                aiRound: 0,
                phase: "ai-bust",
                message: "🚨 AI busted! Guards caught the AI.",
              };
            }
            const next: GameState = {
              ...prev,
              deck: rest,
              drawnCards: newDrawn,
              aiGuards: newGuards,
              message: "⚠️ AI drew a guard…",
            };
            // Schedule next step
            setTimeout(() => runAiStep(next), AI_DRAW_DELAY_MS);
            return next;
          }

          const newRound = prev.aiRound + revealed.value;
          const next: GameState = {
            ...prev,
            deck: rest,
            drawnCards: newDrawn,
            aiRound: newRound,
            message: `🤖 AI draws ${revealed.emoji} +${revealed.value} → round: ${newRound}`,
          };
          setTimeout(() => runAiStep(next), AI_DRAW_DELAY_MS);
          return next;
        });
      }, AI_DRAW_DELAY_MS);
    };

    runAiStep(gs);

    // Intentional: we only want this to fire when phase transitions to ai-turn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gs.phase]);

  // ── End AI bust round → back to player ───────────────────────────────────
  const endAiBust = useCallback(() => {
    setGs((prev) => {
      if (prev.phase !== "ai-bust") return prev;
      return {
        ...prev,
        aiRound: 0,
        aiGuards: 0,
        drawnCards: [],
        phase: "player-turn",
        message: "AI busted! Your turn — draw or bank.",
      };
    });
  }, []);

  const restart = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setGs(initGame);
    setFlippingId(null);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isPlayerTurn = gs.phase === "player-turn";
  const isAiTurn = gs.phase === "ai-turn";
  const isBust = gs.phase === "round-bust";
  const isAiBust = gs.phase === "ai-bust";
  const isOver = gs.phase === "game-over";
  const canDraw = isPlayerTurn && gs.deck.length > 0;
  const canBank = isPlayerTurn && gs.playerRound > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "Manrope, system-ui, sans-serif",
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          height: 52,
          borderBottom: "1px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "Fraunces, serif",
            fontWeight: 700,
            fontSize: "1.15rem",
            letterSpacing: "-0.01em",
          }}
        >
          👑 Royal Heist
        </span>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            🏆 Best: {gs.highScore}
          </span>
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--muted)",
              background: "var(--line)",
              borderRadius: 6,
              padding: "2px 8px",
            }}
          >
            {gs.deck.length} cards left
          </span>
        </div>
      </header>

      {/* ── Score bars ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "10px 14px",
          flexShrink: 0,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <ScoreBar
          label="You"
          total={gs.playerTotal}
          round={gs.playerRound}
          isActive={isPlayerTurn}
          isBust={isBust}
        />
        <ScoreBar
          label="AI"
          total={gs.aiTotal}
          round={gs.aiRound}
          isActive={isAiTurn}
          isBust={isAiBust}
        />
      </div>

      {/* ── Message bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "8px 16px",
          fontSize: "0.85rem",
          color: "var(--muted)",
          borderBottom: "1px solid var(--line)",
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {gs.message}
      </div>

      {/* ── Card area ────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Drawn cards this round */}
        {gs.drawnCards.length > 0 ? (
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              This round
            </div>
            <CardGrid columns={Math.min(gs.drawnCards.length, 6)}>
              {gs.drawnCards.map((card) => {
                const isGuard = card.kind === "guard";
                const isLoot = card.kind === "loot";
                const isBusting =
                  isGuard &&
                  gs.drawnCards.filter((c) => c.kind === "guard").indexOf(card) === 1;
                return (
                  <Card
                    key={card.id}
                    faceUp={card.faceUp || flippingId === card.id}
                    matched={false}
                    front={<HeistCardFace card={card} />}
                    back={
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background:
                            "repeating-linear-gradient(45deg,#1e293b,#1e293b 6px,#0f172a 6px,#0f172a 12px)",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                        }}
                      >
                        🃏
                      </div>
                    }
                    onClick={() => {}}
                    disabled={true}
                    highlight={
                      isBusting ? "bust" : isGuard ? "guard" : isLoot ? "loot" : "none"
                    }
                  />
                );
              })}
            </CardGrid>
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              fontSize: "0.9rem",
              opacity: 0.6,
            }}
          >
            No cards drawn yet this round
          </div>
        )}

        {/* Deck (face-down pile) */}
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              marginBottom: 8,
            }}
          >
            Deck
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Show top 3 stacked cards as visual pile */}
            <div style={{ position: "relative", width: 72, height: 96 }}>
              {[2, 1, 0].map((offset) =>
                gs.deck.length > offset ? (
                  <div
                    key={offset}
                    style={{
                      position: "absolute",
                      top: offset * -2,
                      left: offset * 2,
                      width: 64,
                      height: 88,
                      background:
                        "repeating-linear-gradient(45deg,#1e293b,#1e293b 6px,#0f172a 6px,#0f172a 12px)",
                      borderRadius: 8,
                      border: "1px solid #334155",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.2rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                  >
                    {offset === 0 ? "🃏" : ""}
                  </div>
                ) : null,
              )}
            </div>
            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {gs.deck.length} card{gs.deck.length !== 1 ? "s" : ""} remaining
            </span>
          </div>
        </div>
      </div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "12px 14px",
          borderTop: "1px solid var(--line)",
          background: "var(--panel)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={playerDraw}
          disabled={!canDraw}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 10,
            border: "none",
            background: canDraw ? "var(--accent)" : "var(--line)",
            color: canDraw ? "#fff" : "var(--muted)",
            fontFamily: "Fraunces, serif",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: canDraw ? "pointer" : "default",
            transition: "background 0.15s, transform 0.1s",
          }}
          onMouseDown={(e) => {
            if (canDraw) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          🃏 Draw Card
        </button>

        <button
          type="button"
          onClick={canBank ? playerBank : isBust ? endBustRound : isAiBust ? endAiBust : undefined}
          disabled={!canBank && !isBust && !isAiBust}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 10,
            border: "none",
            background:
              canBank
                ? "#16a34a"
                : isBust || isAiBust
                  ? "#d97706"
                  : "var(--line)",
            color: canBank || isBust || isAiBust ? "#fff" : "var(--muted)",
            fontFamily: "Fraunces, serif",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: canBank || isBust || isAiBust ? "pointer" : "default",
            transition: "background 0.15s, transform 0.1s",
          }}
          onMouseDown={(e) => {
            if (canBank || isBust || isAiBust)
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          {isBust || isAiBust ? "⚡ Continue" : `🏦 Bank ${canBank ? gs.playerRound + " pts" : ""}`}
        </button>
      </div>

      {/* ── AI thinking indicator ─────────────────────────────────────────── */}
      {isAiTurn && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,15,15,0.85)",
            color: "#fff",
            borderRadius: 20,
            padding: "6px 16px",
            fontSize: "0.8rem",
            backdropFilter: "blur(8px)",
            pointerEvents: "none",
          }}
        >
          🤖 AI is thinking…
        </div>
      )}

      {/* ── Win / Game-over overlay ───────────────────────────────────────── */}
      {isOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              background: "var(--paper)",
              border: "2px solid var(--line-strong)",
              borderRadius: 20,
              padding: "36px 32px",
              maxWidth: 340,
              width: "90%",
              textAlign: "center",
              boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 8 }}>
              {gs.winner === "player" ? "🎉" : "🤖"}
            </div>
            <h2
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: "1.6rem",
                fontWeight: 900,
                margin: "0 0 8px",
                color: gs.winner === "player" ? "var(--success)" : "var(--error)",
              }}
            >
              {gs.winner === "player" ? "Heist Complete!" : "Caught!"}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 20px" }}>
              {gs.winner === "player"
                ? `You reached ${gs.playerTotal} points — the vault is yours!`
                : `AI reached ${gs.aiTotal} points — better luck next time.`}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "space-around",
                marginBottom: 24,
                padding: "12px 0",
                borderTop: "1px solid var(--line)",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" }}>
                  Your score
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.4rem" }}>{gs.playerTotal}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" }}>
                  AI score
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.4rem" }}>{gs.aiTotal}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" }}>
                  Best
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.4rem" }}>{gs.highScore}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={restart}
              style={{
                width: "100%",
                height: 50,
                borderRadius: 12,
                border: "none",
                background: "var(--accent)",
                color: "#fff",
                fontFamily: "Fraunces, serif",
                fontWeight: 700,
                fontSize: "1.05rem",
                cursor: "pointer",
              }}
            >
              Play Again
            </button>

            <div style={{ marginTop: 16, fontSize: "0.72rem", color: "var(--muted)" }}>
              <a
                href="https://freegamestore.online"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--muted)" }}
              >
                Part of FreeGameStore — free forever
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
