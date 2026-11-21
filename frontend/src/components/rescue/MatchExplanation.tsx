import Card from "../ui/Card";
import type { MatchCandidate } from "../../types/api";

export default function MatchExplanation({ candidates }: { candidates: MatchCandidate[] }) {
  const feasible = candidates.filter((c) => c.feasible);
  const infeasible = candidates.filter((c) => !c.feasible);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-ink">Why this match?</h2>

      {feasible.map((c) => (
        <Card key={`feasible-${c.receiver_name}`}>
          <p className="font-medium text-ink">
            {c.receiver_name}
            <span className="text-muted"> · {c.locality}</span>
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink">
            {c.why.map((reason, i) => (
              <li key={i}>{`✓ ${reason}`}</li>
            ))}
          </ul>
        </Card>
      ))}

      {infeasible.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-ink">Not feasible</h3>
          {infeasible.map((c) => (
            <Card key={`infeasible-${c.receiver_name}`}>
              <p className="font-medium text-ink">
                {c.receiver_name}
                <span className="text-muted"> · {c.locality}</span>
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
                {c.rejection_reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
