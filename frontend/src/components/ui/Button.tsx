import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primaryDark active:scale-[0.98] shadow-sm",
  secondary: "border border-border bg-surface text-ink hover:bg-background hover:border-borderDark",
  ghost: "text-primary hover:bg-primaryLight",
  danger: "bg-danger text-white hover:bg-red-700 active:scale-[0.98]",
  accent: "bg-accent text-white hover:bg-accentDark active:scale-[0.98] shadow-sm",
};

const SIZE: Record<Size, string> = {
  sm: "min-h-[36px] px-3 text-sm rounded-button",
  md: "min-h-[44px] px-5 text-sm rounded-button",
  lg: "min-h-[52px] px-6 text-base rounded-button",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
    >
      {children}
    </button>
  );
}
