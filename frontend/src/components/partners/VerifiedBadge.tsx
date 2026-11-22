export default function VerifiedBadge({ checked }: { checked: boolean }) {
  return <details className="relative my-1 w-fit">
    <summary className="min-h-8 cursor-pointer rounded-lg bg-primaryLight px-2 py-1 text-xs font-semibold text-primary">
      {checked ? "Verified (ID checked)" : "Partner approved"}
    </summary>
    <p className="mt-1 rounded-lg border border-border bg-surface p-2 text-xs text-ink">Not a food-safety certification.</p>
  </details>;
}
