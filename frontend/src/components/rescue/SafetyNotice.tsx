export const SAFETY_TEXT =
  "Handling information provided by donor. Receiver must independently verify suitability before accepting or distributing the food.";

export default function SafetyNotice() {
  return (
    <div role="note" className="rounded-card border border-accent bg-amber-50 p-4 text-sm text-ink">
      <p>{SAFETY_TEXT}</p>
      <p className="mt-2 text-muted">
        RescueRelay coordinates food recovery and does not certify food safety.
      </p>
    </div>
  );
}
