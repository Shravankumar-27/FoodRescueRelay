import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warn" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-success",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-danger",
  info: "bg-sky-100 text-info",
};

export default function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
