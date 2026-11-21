import type { ReactNode } from "react";

type BadgeVariant = "neutral" | "success" | "warn" | "danger" | "info" | "fresh";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-successLight text-success",
  warn: "bg-accentLight text-warn",
  danger: "bg-dangerLight text-danger",
  info: "bg-infoLight text-info",
  fresh: "bg-freshBg text-fresh",
};

export default function Badge({
  children,
  variant = "neutral",
  dot = false,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${VARIANT_CLASSES[variant]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${variant === "danger" ? "bg-danger" : variant === "warn" ? "bg-warn" : variant === "success" || variant === "fresh" ? "bg-fresh" : "bg-info"}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
