import type { ReactNode } from "react";

type CardVariant = "default" | "accent" | "fresh" | "warn" | "urgent" | "info" | "gold";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "border-border bg-surface shadow-card",
  accent: "border-accent/30 bg-accentLight",
  fresh: "border-fresh/30 bg-freshBg/40",
  warn: "border-warn/30 bg-warnBg",
  urgent: "border-urgent/30 bg-urgentBg",
  info: "border-info/30 bg-infoLight",
  gold: "border-gold/40 bg-goldLight",
};

export default function Card({
  children,
  variant = "default",
  className = "",
  onClick,
  hover = false,
  id,
}: {
  id?: string;
  children: ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}) {
  const hoverClass = hover || onClick ? "hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer" : "";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      id={id}
      onClick={onClick}
      className={`min-w-0 rounded-2xl border p-4 transition-all duration-200 ${VARIANT_CLASSES[variant]} ${hoverClass} ${className}`}
    >
      {children}
    </Tag>
  );
}
