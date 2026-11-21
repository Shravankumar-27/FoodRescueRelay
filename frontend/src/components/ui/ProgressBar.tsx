export default function ProgressBar({
  value,
  max = 100,
  variant = "primary",
  className = "",
  showLabel = false,
}: {
  value: number;
  max?: number;
  variant?: "primary" | "success" | "warn" | "danger" | "accent";
  className?: string;
  showLabel?: boolean;
}) {
  const pct = Math.round(Math.min(100, Math.max(0, (value / max) * 100)));
  const color = {
    primary: "bg-primary",
    success: "bg-success",
    warn: "bg-warn",
    danger: "bg-danger",
    accent: "bg-accent",
  }[variant];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted tabular-nums">{pct}%</span>
      )}
    </div>
  );
}
