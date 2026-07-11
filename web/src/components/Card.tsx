import type { ReactNode } from "react";

interface Props {
  faceUp: boolean;
  matched: boolean;
  front: ReactNode;
  back?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export function Card({ faceUp, matched, front, back, onClick, disabled }: Props) {
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
          opacity: matched ? 0.7 : 1,
          boxShadow: matched ? "0 0 12px rgba(22,163,74,0.5)" : undefined,
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
