import type { ReactNode } from "react";

export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card bg-surface border border-border p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
