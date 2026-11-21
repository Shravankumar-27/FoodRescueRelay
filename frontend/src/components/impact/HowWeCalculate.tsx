export default function HowWeCalculate() {
  return (
    <details className="rounded-card border border-border bg-surface p-4 text-sm text-ink">
      <summary className="cursor-pointer font-medium text-primary">How we calculate this</summary>
      <p className="mt-2 text-muted">
        Meals rescued = receiver-confirmed delivered servings. Impact counts only after delivery is
        confirmed. Estimated food weight = delivered servings × 0.4 kg. Estimated avoided
        emissions = estimated weight × 2.5 kg CO₂e/kg. These are illustrative planning
        assumptions, not measured weight, verified emissions reductions or carbon credits.
      </p>
    </details>
  );
}
