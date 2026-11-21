import type { ReactNode } from "react";
export default function Metric({ label, value, note, icon }: { label: string; value: ReactNode; note?: string; icon?: ReactNode }) {
  return <div className="metric"><div className="flex items-center justify-between gap-2 text-muted"><span className="text-sm font-medium">{label}</span>{icon}</div><p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>{note && <p className="mt-1 text-sm text-muted">{note}</p>}</div>;
}
