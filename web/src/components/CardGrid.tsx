import type { ReactNode } from "react";

interface Props {
  columns: number;
  children: ReactNode;
}

export function CardGrid({ columns, children }: Props) {
  return (
    <div
      className="card-grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {children}
    </div>
  );
}
