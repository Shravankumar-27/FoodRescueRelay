import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const BASE =
  "inline-flex items-center justify-center rounded-button font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primaryDark active:scale-[0.98] shadow-sm",
  secondary:
    "border border-border bg-surface text-ink hover:bg-background hover:border-muted active:scale-[0.98]",
  ghost: "text-primary hover:bg-primaryLight active:scale-[0.98]",
  danger: "bg-danger text-white hover:opacity-90 active:scale-[0.98] shadow-sm",
  accent: "bg-accent text-white hover:opacity-90 active:scale-[0.98] shadow-sm",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "min-h-[36px] px-3 text-sm gap-1.5",
  md: "min-h-[44px] px-4 text-sm gap-2",
  lg: "min-h-[52px] px-6 text-base gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  const classes = [BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
