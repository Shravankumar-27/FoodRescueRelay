import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StatusBadge from "../../components/rescue/StatusBadge";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { RescueDetail, RescueSummary } from "../../types/api";

const ACTIVE_STATUSES: string[] = ["POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED"];

export default function DonorHomePage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [repeating, setRepeating] = useState(false);
  const [repeatError, setRepeatError] = useState<string | null>(null);

  const mine = useQuery({
    queryKey: ["rescues", "mine"],
    queryFn: () => apiRequest<RescueSummary[]>("/rescues/mine", { token }),
    enabled: !!token,
  });

  const rescues = [...(mine.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = rescues[0];
  const activeRescue = latest && ACTIVE_STATUSES.includes(latest.status) ? latest : null;

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const thisMonth = rescues.filter((r) => new Date(r.created_at).getTime() >= monthStart);
  const mealsThisMonth = thisMonth.reduce((sum, r) => sum + (r.delivered_servings ?? 0), 0);
  const recent = rescues.slice(0, 5);

  async function repeatLast() {
    if (!latest) return;
    setRepeating(true);
    setRepeatError(null);
    try {
      const detail = await apiRequest<RescueDetail>(`/rescues/${latest.id}`, { token });
      sessionStorage.setItem(
        "rr.repeat",
        JSON.stringify({
          food_items: detail.food_items.map((f) => ({
            name: f.name,
            quantity_servings: f.quantity_servings,
            dietary_type: f.dietary_type,
          })),
        }),
      );
      navigate("/donor/rescue/new");
    } catch (e) {
      setRepeatError(e instanceof ApiError ? e.message : "We couldn't load your last rescue. Please try again.");
    } finally {
      setRepeating(false);
    }
  }

  return (
    <AppShell title="Home" nav="donor">
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold text-gray-900">Hi, {user?.name ?? "there"}</h2>

        <Link
          to="/donor/rescue/new"
          className="flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 px-6 py-5 text-xl font-bold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        >
          Rescue food
        </Link>

        {mine.isLoading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading your rescues">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {mine.isError && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {mine.error instanceof ApiError ? mine.error.message : "We couldn't load your rescues."}
          </div>
        )}

        {!mine.isLoading && !mine.isError && rescues.length === 0 && (
          <EmptyState
            title="No rescues yet"
            body="When you have untouched surplus food, start a rescue. We'll find a nearby receiver who can collect it in time."
            action={
              <Link to="/donor/rescue/new" className="font-semibold text-emerald-700 underline">
                Rescue food
              </Link>
            }
          />
        )}

        {activeRescue && (
          <Card>
            <p className="text-sm font-medium text-gray-600">Active rescue</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{activeRescue.display_id}</p>
                <p className="text-sm text-gray-600">Pickup by {formatDateTime(activeRescue.pickup_by)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={activeRescue.status} />
                <Link
                  to={`/donor/rescue/${activeRescue.id}`}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-emerald-700 px-4 font-semibold text-emerald-700"
                >
                  View
                </Link>
              </div>
            </div>
          </Card>
        )}

        {rescues.length > 0 && (
          <section aria-labelledby="stats-heading" className="grid gap-3 sm:grid-cols-2">
            <h3 id="stats-heading" className="sr-only">
              This month
            </h3>
            <Card>
              <p className="text-sm text-gray-600">Rescues this month</p>
              <p className="text-3xl font-bold text-gray-900">{thisMonth.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-600">Meals delivered this month</p>
              <p className="text-3xl font-bold text-gray-900">{mealsThisMonth}</p>
            </Card>
          </section>
        )}

        {latest && (
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={repeatLast} disabled={repeating} className="min-h-[44px]">
              {repeating ? "Loading..." : "Repeat last event"}
            </Button>
            {repeatError && (
              <p role="alert" className="text-sm text-red-700">
                {repeatError}
              </p>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
            <h3 id="recent-heading" className="text-lg font-semibold text-gray-900">
              Previous rescues
            </h3>
            <ul className="flex flex-col gap-3">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/donor/rescue/${r.id}`}
                    className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-4 hover:border-emerald-700"
                  >
                    <span className="font-medium text-gray-900">{r.display_id}</span>
                    <span className="text-sm text-gray-600">{formatDateTime(r.pickup_by)}</span>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
