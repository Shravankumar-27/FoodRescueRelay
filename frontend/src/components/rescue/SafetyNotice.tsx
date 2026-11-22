export const SAFETY_TEXT =
  "Check storage, packaging, and allergens before pickup.";

export default function SafetyNotice() {
  return (
    <div role="note" className="rounded-card border border-accent bg-amber-50 p-4 text-sm text-ink">
      <p>{SAFETY_TEXT}</p>
    </div>
  );
}
