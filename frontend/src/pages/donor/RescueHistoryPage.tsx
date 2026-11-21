import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import StatusBadge from "../../components/rescue/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { RescueSummary } from "../../types/api";

export default function RescueHistoryPage() {
  const { token } = useAuth();

  const mine = useQuery({
    queryKey: ["rescues", "mine"],
    queryFn: () => apiRequest<RescueSummary[]>("/rescues/mine", { token }),
    enabled: !!token,
  });

  const rescues = [...(mine.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <AppShell title="Rescue history" nav="donor">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {mine.isLoading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading rescue history">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {mine.isError && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {mine.error instanceof ApiError ? mine.error.message : "We couldn't load your rescue history."}
          </div>
        )}

        {!mine.isLoading && !mine.isError && rescues.length === 0 && (
          <EmptyState
            title="No rescues yet"
            body="Your rescues will appear here once you post your first listing."
            action={
              <Link to="/donor/rescue/new" className="font-semibold text-emerald-700 underline">
                Rescue food
              </Link>
            }
          />
        )}

        {rescues.length > 0 && (
          <ul className="flex flex-col gap-3">
            {rescues.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/donor/rescue/${r.id}`}
                  className="flex min-h-[44px] flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{r.display_id}</p>
                    <p className="text-sm text-gray-600">Pickup by {formatDateTime(r.pickup_by)}</p>
                    {r.delivered_servings ? (
                      <p className="text-sm text-gray-800">{r.delivered_servings} meals delivered</p>
                    ) : null}
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
