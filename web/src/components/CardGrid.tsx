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
        gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
        maxWidth: columns <= 3 ? `${columns * 96}px` : undefined,
      }}
    >
      {children}
    </div>
  );
}
