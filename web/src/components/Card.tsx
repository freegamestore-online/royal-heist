import type { ReactNode } from "react";

interface Props {
  faceUp: boolean;
  matched?: boolean;
  front: ReactNode;
  back?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  highlight?: "bust" | "loot" | "guard" | "none";
}

export function Card({
  faceUp,
  matched = false,
  front,
  back,
  onClick,
  disabled = false,
  highlight = "none",
}: Props) {
  const glowColor =
    highlight === "bust"
      ? "rgba(220,38,38,0.55)"
      : highlight === "loot"
        ? "rgba(234,179,8,0.55)"
        : highlight === "guard"
          ? "rgba(249,115,22,0.55)"
          : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="card-container"
      style={{
        perspective: "1000px",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <div
        className="card-inner"
        style={{
          transform: faceUp ? "rotateY(180deg)" : "rotateY(0deg)",
          opacity: matched ? 0.55 : 1,
          boxShadow: glowColor
            ? `0 0 16px 4px ${glowColor}`
            : matched
              ? "0 0 12px rgba(22,163,74,0.4)"
              : undefined,
          transition: "transform 0.38s cubic-bezier(.4,0,.2,1), box-shadow 0.2s",
        }}
      >
        {/* Back face */}
        <div className="card-face card-back">
          {back ?? <div className="card-back-pattern" />}
        </div>
        {/* Front face */}
        <div className="card-face card-front">{front}</div>
      </div>
    </button>
  );
}
