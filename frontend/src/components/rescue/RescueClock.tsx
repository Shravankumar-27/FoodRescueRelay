import { useEffect, useState } from "react";

export default function RescueClock({ pickupBy }: { pickupBy: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Date.parse(pickupBy) - now;

  let text: string;
  let note: string | null = null;
  let tone: string;

  if (!Number.isFinite(diff)) {
    text = "Pickup time unavailable";
    tone = "text-muted";
  } else if (diff <= 0) {
    text = "Pickup window ended";
    tone = "text-danger";
  } else {
    const minutes = Math.floor(diff / 60000);
    text = `${minutes} min left`;
    if (minutes > 60) {
      tone = "text-ink";
    } else if (minutes >= 20) {
      tone = "text-amber-700";
      note = "Closing soon";
    } else {
      tone = "text-danger";
      note = "Very close to deadline";
    }
  }

  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <h2 className="text-xs font-semibold tracking-wide text-muted">RESCUE CLOCK</h2>
      <p aria-live="polite" className={`text-2xl font-bold ${tone}`}>
        {text}
      </p>
      {note && <p className={`text-sm font-medium ${tone}`}>{note}</p>}
    </section>
  );
}
