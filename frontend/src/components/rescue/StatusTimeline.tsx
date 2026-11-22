import { Check, Circle, CircleDot } from "lucide-react";
import { formatDateTime } from "../../lib/format";

const ORDER = ["POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED", "DELIVERED"];

interface Step {
  key: string;
  label: string;
  reachedBy: string[];
}

const STEPS: Step[] = [
  { key: "POSTED", label: "Posted", reachedBy: ORDER },
  {
    key: "MATCHING",
    label: "Matched",
    reachedBy: ["MATCHING", "OFFERED", "CLAIMED", "COLLECTED", "DELIVERED"],
  },
  { key: "CLAIMED", label: "Claimed", reachedBy: ["CLAIMED", "COLLECTED", "DELIVERED"] },
  { key: "COLLECTED", label: "Collection", reachedBy: ["COLLECTED", "DELIVERED"] },
  { key: "DELIVERED", label: "Delivered", reachedBy: ["DELIVERED"] },
];

type StepState = "done" | "current" | "pending";

export default function StatusTimeline({
  events,
  status,
}: {
  events: { to_status: string; created_at: string }[];
  status: string;
}) {
  // The current step is the last step whose reachedBy list includes the rescue's status.
  let currentIndex = -1;
  STEPS.forEach((step, index) => {
    if (step.reachedBy.includes(status)) {
      currentIndex = index;
    }
  });

  const stopped = status === "EXPIRED" || status === "CANCELLED";
  if (stopped) {
    STEPS.forEach((step, index) => { if (events.some(e => step.reachedBy.includes(e.to_status))) currentIndex = Math.max(currentIndex, index); });
  }
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {STEPS.map((step, index) => {
        const state: StepState =
          index < currentIndex || ((stopped || status === "DELIVERED") && index === currentIndex)
            ? "done" : index === currentIndex ? "current" : "pending";
        const Icon = state === "done" ? Check : state === "current" ? CircleDot : Circle;
        const event = state === "pending" ? undefined : [...events].reverse().find((e) => e.to_status === step.key);
        const iconClass =
          state === "pending" ? "text-slate-400" : state === "done" ? "text-success" : "text-primary";
        const labelClass = state === "pending" ? "text-muted" : "font-medium text-ink";

        return (
          <li key={step.key} className="flex min-w-0 items-start gap-2">
            <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`} />
            <div>
              <p className={labelClass}>
                {step.key === "MATCHING" && (status === "MATCHING" || (stopped && !events.some(e => ["OFFERED", "CLAIMED", "COLLECTED", "DELIVERED"].includes(e.to_status)))) ? "Matching" : step.label}
                <span className="sr-only"> ({state})</span>
              </p>
              {event && <p className="text-xs text-muted">{formatDateTime(event.created_at)}</p>}
            </div>
          </li>
        );
      })}
      {stopped && <li className="col-span-full rounded-xl bg-accentLight p-3 text-sm font-semibold text-warn">{status === "EXPIRED" ? "Pickup window expired — do not collect" : "Rescue cancelled"}</li>}
    </ol>
  );
}
