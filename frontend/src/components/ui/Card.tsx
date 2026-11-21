import type { ReactNode } from "react";

type CardVariant = "default" | "elevated" | "flat" | "accent" | "success" | "warn" | "danger" | "fresh";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "bg-surface border border-border shadow-card",
  elevated: "bg-surface border border-border shadow-card-hover",
  flat: "bg-background border border-border",
  accent: "bg-accentLight border border-accent/30",
  success: "bg-successLight border border-success/30",
  warn: "bg-accentLight border border-accent/30",
  danger: "bg-dangerLight border border-danger/30",
  fresh: "bg-freshBg border border-fresh/30",
};

export default function Card({
  children,
  className = "",
  variant = "default",
  onClick,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  onClick?: () => void;
  hover?: boolean;
}) {
  const hoverClass = hover || onClick ? "cursor-pointer hover:shadow-card-hover hover:border-primary/30 transition-all duration-150" : "";
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      className={`rounded-card p-4 ${VARIANT_CLASSES[variant]} ${hoverClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
