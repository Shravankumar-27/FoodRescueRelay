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
