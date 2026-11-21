import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const BASE =
  "inline-flex items-center justify-center min-h-[44px] px-4 rounded-button font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primaryDark",
  secondary: "border border-border bg-surface text-ink hover:bg-background",
  ghost: "text-primary hover:bg-primary/10",
  danger: "bg-danger text-white hover:opacity-90",
};

export default function Button({
  variant = "primary",
  type = "button",
  className = "",
  ...rest
}: ButtonProps) {
  const classes = [BASE, VARIANT_CLASSES[variant], className].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...rest} />;
}
