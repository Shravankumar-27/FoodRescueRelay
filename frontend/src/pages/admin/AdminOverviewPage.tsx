import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import ImpactMetric from "../../components/impact/ImpactMetric";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import type { ImpactSummary } from "../../types/api";

export default function AdminOverviewPage() {
  const { token } = useAuth();

  const summaryQuery = useQuery({
    queryKey: ["admin", "impact-summary"],
    queryFn: () => apiRequest<ImpactSummary>("/impact/summary", { token }),
    enabled: !!token,
  });

  const summary = summaryQuery.data;
  const completionPct =
    summary && summary.completion_rate != null
      ? `${Math.round(summary.completion_rate * 100)}%`
      : "—";

  return (
    <AppShell title="Operations overview" nav="admin">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600">Synthetic demo data only.</p>

        {summaryQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : summaryQuery.isError ? (
          <p role="alert" className="text-sm text-red-700">
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : "Could not load the impact summary."}
          </p>
        ) : summary ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ImpactMetric label="Total meals rescued" value={summary.total_meals_rescued} />
            <ImpactMetric label="Completed rescues" value={summary.completed_rescues} />
            <ImpactMetric label="Completion rate" value={completionPct} />
          </div>
        ) : null}

        <Card>
          <nav aria-label="Admin sections" className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <Link
              to="/admin/organizations"
              className="inline-flex min-h-11 items-center font-medium underline"
            >
              Organizations
            </Link>
            <Link
              to="/admin/rescues"
              className="inline-flex min-h-11 items-center font-medium underline"
            >
              Rescues
            </Link>
          </nav>
        </Card>
      </div>
    </AppShell>
  );
}
