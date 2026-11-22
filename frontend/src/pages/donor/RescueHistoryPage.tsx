import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import StatusBadge from "../../components/rescue/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatDateTime, statusLabel } from "../../lib/format";
import type { RescueSummary } from "../../types/api";

export default function RescueHistoryPage() {
  const { token } = useAuth();
  const [status,setStatus] = useState("");
  const [search,setSearch] = useState("");
  const [month,setMonth] = useState(false);

  const mine = useQuery({meta: { errorDisplay: "inline" }, 
    queryKey: ["rescues", "mine"],
    queryFn: () => apiRequest<RescueSummary[]>("/rescues/mine", { token }),
    enabled: !!token,
  });

  const now = new Date();
  const term = search.trim().toLowerCase();
  const rescues = (mine.data ?? []).filter(rescue => {
    const created = new Date(rescue.created_at);
    const matchesMonth = created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    return (!status || rescue.status === status) && (!month || matchesMonth)
      && (!term || (rescue.display_id + " " + rescue.locality).toLowerCase().includes(term));
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <AppShell title="Rescue history" nav="donor">
      <div className="flex flex-col gap-4">
        <section className="harvest-hero"><p className="eyebrow text-white/70">Your contribution journal</p><h2 className="mt-2 text-3xl font-bold">Every handoff has a story.</h2><p className="mt-3 text-sm text-white/80">Review deliveries, revisit a pickup and find your receiver-issued appreciation.</p></section>
        <Card className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_auto_auto]">
          <label className="grid gap-1 text-sm font-semibold">
            Search
            <input aria-label="Search donation history" placeholder="Rescue ID or locality" value={search}
              onChange={e => setSearch(e.target.value)} className="min-h-11 w-full rounded-xl border border-border px-3 font-normal"/>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Status
            <select aria-label="Filter donation status" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {["POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED", "DELIVERED", "EXPIRED", "CANCELLED"].map(value =>
                <option key={value} value={value}>{statusLabel(value)}</option>)}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">
            <input type="checkbox" checked={month} onChange={e => setMonth(e.target.checked)}/>This month
          </label>
          <button type="button" className="min-h-11 px-3 text-sm font-semibold text-primary disabled:text-muted"
            disabled={!status && !search && !month} onClick={() => { setStatus(""); setSearch(""); setMonth(false); }}>Clear filters</button>
        </Card>
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
            title={mine.data?.length ? "No donations match these filters" : "No rescues yet"}
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
                    {r.delivered_servings != null ? (
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
