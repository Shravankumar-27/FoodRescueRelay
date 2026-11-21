export default function Skeleton({
  className = "",
  lines,
}: {
  className?: string;
  lines?: number;
}) {
  if (lines) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton rounded-lg ${i === lines - 1 ? "w-3/4" : "w-full"} h-4`}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={`skeleton rounded-lg ${className}`}
      aria-hidden="true"
      aria-busy="true"
    />
  );
}
