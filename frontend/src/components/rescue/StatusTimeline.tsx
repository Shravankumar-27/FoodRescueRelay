import { Check, CircleDot, Dot } from "lucide-react";
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
  const timestamps = new Map(events.map(event => [event.to_status, event.created_at]));
  return (
    <ol className="grid sm:grid-cols-5">
      {STEPS.map((step, index) => {
        const state: StepState =
          index < currentIndex || ((stopped || status === "DELIVERED") && index === currentIndex)
            ? "done" : index === currentIndex ? "current" : "pending";
        const Icon = state === "done" ? Check : state === "current" ? CircleDot : Dot;
        const timestamp = state === "pending" ? undefined
          : step.key === "MATCHING" && status !== "MATCHING" ? timestamps.get("OFFERED") ?? timestamps.get(step.key)
          : timestamps.get(step.key);
        const iconClass = state === "done" ? "border-primary bg-primary text-white"
          : state === "current" ? "border-primary bg-surface text-primary ring-4 ring-primary/10"
          : "border-border bg-surface text-muted";
        const labelClass = state === "pending" ? "text-muted" : "font-medium text-ink";

        return (
          <li key={step.key} aria-current={state === "current" ? "step" : undefined}
            className="relative flex min-w-0 items-start gap-3 pb-4 last:pb-0 sm:flex-col sm:items-center sm:gap-2 sm:px-1 sm:pb-0 sm:text-center">
            {index < STEPS.length - 1 && <span aria-hidden="true"
              className={`absolute bottom-0 left-4 top-4 w-0.5 -translate-x-1/2 sm:bottom-auto sm:left-1/2 sm:h-0.5 sm:w-full sm:translate-x-0 ${index < currentIndex ? "bg-primary" : "bg-border"}`}/>}
            {index > 0 && <span aria-hidden="true"
              className={`absolute left-4 top-0 h-4 w-0.5 -translate-x-1/2 sm:hidden ${index <= currentIndex ? "bg-primary" : "bg-border"}`}/>}
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${iconClass}`}>
              <Icon aria-hidden="true" className="h-4 w-4"/>
            </span>
            <div className="min-w-0 pt-1 sm:pt-0">
              <p className={`text-sm ${labelClass}`}>
                {step.key === "MATCHING" && (status === "MATCHING" || (stopped && !events.some(e => ["OFFERED", "CLAIMED", "COLLECTED", "DELIVERED"].includes(e.to_status)))) ? "Matching" : step.label}
                <span className="sr-only"> ({state})</span>
              </p>
              {timestamp && <time dateTime={timestamp} className="mt-1 block text-xs text-muted">{formatDateTime(timestamp)}</time>}
            </div>
          </li>
        );
      })}
      {stopped && <li className="col-span-full mt-3 rounded-xl bg-accentLight p-3 text-sm font-semibold text-warn">{status === "EXPIRED" ? "Pickup window expired — do not collect" : "Rescue cancelled"}</li>}
    </ol>
  );
}
