const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const STATUS_LABELS = new Map<string, string>([
  ["POSTED", "Posted"],
  ["MATCHING", "Matching"],
  ["OFFERED", "Offered"],
  ["CLAIMED", "Claimed"],
  ["COLLECTED", "Collected"],
  ["DELIVERED", "Delivered"],
  ["EXPIRED", "Expired"],
  ["CANCELLED", "Cancelled"],
]);

export function formatDateTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "—";
  }
  return DATE_TIME_FORMAT.format(new Date(ms));
}

export function formatMinutes(n: number): string {
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${Math.round(n)} min`;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS.get(status) ?? status;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function formatKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toFixed(1)} kg`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
