import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Repeat2, TrendingUp, Utensils, Clock, ChevronRight, Flame } from "lucide-react";
import StatusBadge from "../../components/rescue/StatusBadge";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { RescueDetail, RescueSummary } from "../../types/api";

const ACTIVE_STATUSES: string[] = ["POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED"];

function urgencyColor(pickupBy: string): "fresh" | "warn" | "urgent" {
  const mins = (new Date(pickupBy).getTime() - Date.now()) / 60000;
  if (mins > 60) return "fresh";
  if (mins > 20) return "warn";
  return "urgent";
}

function UrgencyBar({ pickupBy }: { pickupBy: string }) {
  const color = urgencyColor(pickupBy);
  const colorMap = {
    fresh: "bg-fresh",
    warn: "bg-warn",
    urgent: "bg-urgent animate-pulse",
  };
  const mins = Math.max(0, Math.round((new Date(pickupBy).getTime() - Date.now()) / 60000));
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`h-2 w-2 rounded-full ${colorMap[color]}`} />
      <span className={color === "urgent" ? "text-urgent font-semibold" : "text-muted"}>
        {mins > 0 ? `${mins} min left` : "Expired"}
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: boolean }) {
  return (
    <Card variant={accent ? "accent" : "default"} className="flex items-center gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent ? "bg-primary/10" : "bg-background"}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-2xl font-bold text-ink">{value}</p>
      </div>
    </Card>
  );
}

export default function DonorHomePage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [repeating, setRepeating] = useState(false);

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
  const completionRate =
    rescues.length > 0
      ? Math.round((rescues.filter((r) => r.status === "DELIVERED").length / rescues.length) * 100)
      : 0;
  const recent = rescues.slice(0, 5);

  async function repeatLast() {
    if (!latest) return;
    setRepeating(true);
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
      toast({
        variant: "error",
        title: "Couldn't load last rescue",
        message: e instanceof ApiError ? e.message : "Please try again.",
      });
    } finally {
      setRepeating(false);
    }
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <AppShell title="Home" nav="donor">
      <div className="flex flex-col gap-6">
        {/* Greeting */}
        <div>
          <p className="text-sm text-muted">Welcome back</p>
          <h2 className="text-2xl font-bold text-ink">Hi, {firstName} 👋</h2>
          <p className="text-sm text-muted mt-0.5">Hyderabad · Sample data</p>
        </div>

        {/* Primary CTA */}
        <Link
          to="/donor/rescue/new"
          className="flex min-h-[60px] items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-lg font-bold text-white shadow-card hover:bg-primaryDark focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 transition-all active:scale-[0.98]"
        >
          <Plus className="h-6 w-6" />
          Post Surplus Food
        </Link>

        {/* Loading skeleton */}
        {mine.isLoading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading your rescues">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {/* Error */}
        {mine.isError && (
          <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-4 text-urgent">
            {mine.error instanceof ApiError ? mine.error.message : "We couldn't load your rescues."}
          </div>
        )}

        {/* Active rescue */}
        {activeRescue && (
          <Card variant="fresh" className="relative overflow-hidden">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-fresh">
                <Flame className="h-4 w-4" />
                Active rescue
              </div>
              <UrgencyBar pickupBy={activeRescue.pickup_by} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-ink">{activeRescue.display_id}</p>
                <p className="text-sm text-muted flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  Pickup by {formatDateTime(activeRescue.pickup_by)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={activeRescue.status} />
                <Link
                  to={`/donor/rescue/${activeRescue.id}`}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-button border border-primary px-4 text-sm font-semibold text-primary hover:bg-primaryLight transition-colors"
                >
                  View <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!mine.isLoading && !mine.isError && rescues.length === 0 && (
          <EmptyState
            title="No rescues yet"
            body="When you have untouched surplus food, post it here. We'll find a nearby receiver who can collect it in time."
            action={
              <Link to="/donor/rescue/new" className="font-semibold text-primary underline">
                Post your first rescue
              </Link>
            }
          />
        )}

        {/* Stats grid */}
        {rescues.length > 0 && (
          <section aria-labelledby="stats-heading" className="grid gap-3 sm:grid-cols-3">
            <h3 id="stats-heading" className="sr-only">Your stats</h3>
            <StatCard
              icon={<Utensils className="h-5 w-5 text-primary" />}
              label="Meals rescued this month"
              value={mealsThisMonth}
              accent
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-info" />}
              label="Rescues this month"
              value={thisMonth.length}
            />
            <StatCard
              icon={<div className="text-base font-bold text-warn">%</div>}
              label="Completion rate"
              value={`${completionRate}%`}
            />
          </section>
        )}

        {/* Repeat last + recent */}
        {latest && (
          <div className="flex flex-col gap-4">
            <Button
              variant="secondary"
              onClick={repeatLast}
              disabled={repeating}
              className="min-h-[44px] flex items-center gap-2"
            >
              <Repeat2 className="h-4 w-4" />
              {repeating ? "Loading..." : "Repost last listing"}
            </Button>

            {recent.length > 0 && (
              <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
                <h3 id="recent-heading" className="text-sm font-semibold text-muted uppercase tracking-wider">
                  Previous rescues
                </h3>
                <ul className="flex flex-col gap-2">
                  {recent.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={`/donor/rescue/${r.id}`}
                        className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4 hover:border-primary hover:bg-primaryLight/30 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-ink">{r.display_id}</p>
                          <p className="text-xs text-muted">{formatDateTime(r.pickup_by)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          <ChevronRight className="h-4 w-4 text-muted" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
