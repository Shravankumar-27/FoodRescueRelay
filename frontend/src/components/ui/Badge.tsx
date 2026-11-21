import type { ReactNode } from "react";

type Tone = "default" | "fresh" | "warn" | "urgent" | "info" | "muted" | "gold" | "silver" | "bronze";

const TONE: Record<Tone, string> = {
  default: "bg-background text-ink border-border",
  fresh: "bg-freshBg text-fresh border-fresh/20",
  warn: "bg-warnBg text-warn border-warn/20",
  urgent: "bg-urgentBg text-urgent border-urgent/20",
  info: "bg-infoLight text-info border-info/20",
  muted: "bg-background text-muted border-border",
  gold: "bg-goldLight text-gold border-gold/30",
  silver: "bg-silverLight text-silver border-silver/30",
  bronze: "bg-bronzeLight text-bronze border-bronze/30",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

// Legacy default export for backwards compatibility with existing imports
export default Badge;
