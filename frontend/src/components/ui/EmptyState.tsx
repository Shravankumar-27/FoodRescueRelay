import type { ReactNode } from "react";

export default function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-border bg-surface p-6 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {body && <p className="mt-1 text-sm text-muted">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
