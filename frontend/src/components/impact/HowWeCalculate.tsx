export default function HowWeCalculate() {
  return (
    <details className="rounded-card border border-border bg-surface p-4 text-sm text-ink">
      <summary className="cursor-pointer font-medium text-primary">How we calculate this</summary>
      <p className="mt-2 text-muted">
        Meals rescued = receiver-confirmed delivered servings. Impact counts only after delivery is
        confirmed. Weight-based metrics are omitted because no kilogram data is recorded.
      </p>
    </details>
  );
}
