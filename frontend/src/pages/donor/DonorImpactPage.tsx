import { useQuery } from "@tanstack/react-query";

import HowWeCalculate from "../../components/impact/HowWeCalculate";
import ImpactMetric from "../../components/impact/ImpactMetric";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatDateTime, formatMinutes } from "../../lib/format";
import type { ImpactSummary } from "../../types/api";

export default function DonorImpactPage() {
  const { token } = useAuth();

  const summary = useQuery({
    queryKey: ["impact", "summary"],
    queryFn: () => apiRequest<ImpactSummary>("/impact/summary", { token }),
    enabled: !!token,
  });

  const s = summary.data;

  return (
    <AppShell title="Your impact" nav="donor">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {summary.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading impact">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {summary.isError && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {summary.error instanceof ApiError ? summary.error.message : "We couldn't load your impact."}
          </div>
        )}

        {s && (
          <>
            <section aria-label="Impact metrics" className="grid gap-3 sm:grid-cols-2">
              <ImpactMetric label="Meals rescued this month" value={s.meals_rescued_month} />
              <ImpactMetric label="Total meals rescued" value={s.total_meals_rescued} />
              <ImpactMetric label="Completed rescues" value={s.completed_rescues} />
              <ImpactMetric label="Completion rate" value={`${Math.round(s.completion_rate * 100)}%`} />
              <ImpactMetric
                label="Avg. completion time"
                value={
                  s.avg_completion_minutes !== null && s.avg_completion_minutes !== undefined
                    ? formatMinutes(s.avg_completion_minutes)
                    : "—"
                }
              />
            </section>

            <section aria-labelledby="recent-completed-heading" className="flex flex-col gap-3">
              <h2 id="recent-completed-heading" className="text-lg font-semibold text-gray-900">
                Recent completed rescues
              </h2>
              {s.recent_completed.length === 0 ? (
                <p className="text-sm text-gray-600">Completed rescues will appear here.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {s.recent_completed.map((r) => (
                    <li key={r.display_id}>
                      <div
                        
                        className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-700"
                      >
                        <span className="font-medium text-gray-900">{r.display_id}</span>
                        <span className="text-sm text-gray-800">{r.delivered_servings} meals</span>
                        <span className="text-sm text-gray-600">{formatDateTime(r.delivered_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <HowWeCalculate />

            {s.methodology_note && (
              <Card>
                <p className="text-sm text-gray-700">{s.methodology_note}</p>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
