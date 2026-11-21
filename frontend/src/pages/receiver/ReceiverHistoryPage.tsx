import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import StatusBadge from "../../components/rescue/StatusBadge";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { ReceiverHistoryItem } from "../../types/api";

export default function ReceiverHistoryPage() {
  const { token } = useAuth();

  const historyQuery = useQuery({
    queryKey: ["receiver", "history"],
    queryFn: () => apiRequest<ReceiverHistoryItem[]>("/offers/history", { token }),
    enabled: !!token,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  const notFound = historyQuery.error instanceof ApiError && historyQuery.error.status === 404;
  const otherError =
    historyQuery.isError && !notFound
      ? historyQuery.error instanceof Error
        ? historyQuery.error.message
        : "Could not load your history."
      : null;

  return (
    <AppShell title="Your rescue history" nav="receiver">
      <div className="flex flex-col gap-4">
        <Link
          to="/receiver"
          className="inline-flex min-h-11 items-center text-sm font-medium underline"
        >
          Back to available rescues
        </Link>

        {historyQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : otherError ? (
          <p role="alert" className="text-sm text-red-700">
            {otherError}
          </p>
        ) : notFound || (historyQuery.data ?? []).length === 0 ? (
          <EmptyState title="Your completed rescues will appear here." />
        ) : (
          <ul className="flex flex-col gap-3">
            {(historyQuery.data ?? []).map((item) => (
              <li key={item.offer_id}>
                <Card>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{item.rescue_display_id}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-sm">
                      Delivered: {item.delivered_servings ?? "—"} servings
                    </p>
                    <p className="text-sm">Pick up by: {formatDateTime(item.pickup_by)}</p>
                    <Link
                      to={`/receiver/pickup/${item.rescue_id}`}
                      className="inline-flex min-h-11 items-center font-medium underline"
                    >
                      Open rescue {item.rescue_display_id}
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
