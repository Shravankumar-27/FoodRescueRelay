import { useQuery } from "@tanstack/react-query";
import { Leaf, TrendingUp, Clock, Award, BarChart2, Info } from "lucide-react";
import { useState } from "react";
import HowWeCalculate from "../../components/impact/HowWeCalculate";
import ImpactMetric from "../../components/impact/ImpactMetric";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatDateTime, formatMinutes } from "../../lib/format";
import type { ImpactSummary } from "../../types/api";
import { lazy, Suspense } from "react";

const BarChart = lazy(() => import("recharts").then((m) => ({ default: m.BarChart })));
const Bar = lazy(() => import("recharts").then((m) => ({ default: m.Bar })));
const XAxis = lazy(() => import("recharts").then((m) => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then((m) => ({ default: m.YAxis })));
const Tooltip = lazy(() => import("recharts").then((m) => ({ default: m.Tooltip })));
const ResponsiveContainer = lazy(() => import("recharts").then((m) => ({ default: m.ResponsiveContainer })));

// Impact assumptions (single source of truth)
const ASSUMPTIONS = {
  KG_PER_MEAL: 0.4,
  CO2E_PER_KG_FOOD_WASTE: 2.5,
  CO2E_SOURCE: "WRAP UK food waste data (assumption — verify before citing)",
};

function co2eFromMeals(meals: number) {
  return (meals * ASSUMPTIONS.KG_PER_MEAL * ASSUMPTIONS.CO2E_PER_KG_FOOD_WASTE).toFixed(1);
}

function kgFromMeals(meals: number) {
  return (meals * ASSUMPTIONS.KG_PER_MEAL).toFixed(1);
}

function AssumptionTooltip({ children }: { children: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-1 text-muted hover:text-ink"
        aria-label="Show assumption"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span className="absolute bottom-6 left-0 z-10 w-56 rounded-xl border border-border bg-surface p-3 text-xs text-muted shadow-card">
          {children}
        </span>
      )}
    </span>
  );
}

function BigImpactStat({ icon, value, label, assumption }: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  assumption?: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primaryLight">
        {icon}
      </div>
      <p className="text-3xl font-black text-ink mt-2">{value}</p>
      <p className="text-sm text-muted flex items-center">
        {label}
        {assumption && <AssumptionTooltip>{assumption}</AssumptionTooltip>}
      </p>
    </div>
  );
}

export default function DonorImpactPage() {
  const { token } = useAuth();

  const summary = useQuery({
    queryKey: ["impact", "summary"],
    queryFn: () => apiRequest<ImpactSummary>("/impact/summary", { token }),
    enabled: !!token,
  });

  const s = summary.data;

  // Build chart data from recent rescues
  const chartData = s?.recent_completed.slice(0, 8).reverse().map((r, i) => ({
    name: `R${i + 1}`,
    meals: r.delivered_servings ?? 0,
  })) ?? [];

  return (
    <AppShell title="Your impact" nav="donor">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {summary.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading impact">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {summary.isError && (
          <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-4 text-urgent">
            {summary.error instanceof ApiError ? summary.error.message : "We couldn't load your impact."}
          </div>
        )}

        {s && (
          <>
            {/* Hero impact numbers */}
            <section aria-label="Impact summary" className="grid gap-3 sm:grid-cols-2">
              <BigImpactStat
                icon={<Award className="h-5 w-5 text-primary" />}
                value={s.total_meals_rescued}
                label="Total meals rescued"
              />
              <BigImpactStat
                icon={<Leaf className="h-5 w-5 text-fresh" />}
                value={`${kgFromMeals(s.total_meals_rescued)} kg`}
                label="Food waste avoided"
                assumption={`1 meal = ${ASSUMPTIONS.KG_PER_MEAL} kg. Source: estimate based on typical Indian meal portions.`}
              />
              <BigImpactStat
                icon={<BarChart2 className="h-5 w-5 text-info" />}
                value={`${co2eFromMeals(s.total_meals_rescued)} kg`}
                label="CO₂e avoided"
                assumption={`1 kg food waste = ${ASSUMPTIONS.CO2E_PER_KG_FOOD_WASTE} kg CO₂e. ${ASSUMPTIONS.CO2E_SOURCE}`}
              />
              <BigImpactStat
                icon={<TrendingUp className="h-5 w-5 text-warn" />}
                value={`${Math.round(s.completion_rate * 100)}%`}
                label="Completion rate"
              />
            </section>

            {/* This month */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ink">This month</h3>
                <span className="text-xs text-muted">Sample data</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ImpactMetric label="Meals rescued" value={s.meals_rescued_month} />
                <ImpactMetric label="Completed rescues" value={s.completed_rescues} />
                <ImpactMetric
                  label="Avg. completion time"
                  value={
                    s.avg_completion_minutes !== null && s.avg_completion_minutes !== undefined
                      ? formatMinutes(s.avg_completion_minutes)
                      : "—"
                  }
                />
                <ImpactMetric
                  label="CO₂e avoided"
                  value={`${co2eFromMeals(s.meals_rescued_month)} kg`}
                />
              </div>
            </Card>

            {/* Bar chart of recent rescues */}
            {chartData.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-ink">Recent rescues (meals rescued)</h3>
                </div>
                <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} barSize={24}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        formatter={(v) => [`${v} meals`, "Meals"]}
                      />
                      <Bar dataKey="meals" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              </Card>
            )}

            {/* Recent completed */}
            {s.recent_completed.length > 0 && (
              <section aria-labelledby="recent-completed-heading" className="flex flex-col gap-3">
                <h2 id="recent-completed-heading" className="text-sm font-semibold uppercase tracking-wider text-muted">
                  Recent completed rescues
                </h2>
                <ul className="flex flex-col gap-2">
                  {s.recent_completed.map((r) => (
                    <li key={r.display_id}>
                      <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4">
                        <div>
                          <p className="font-medium text-ink">{r.display_id}</p>
                          <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(r.delivered_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{r.delivered_servings} meals</p>
                          <p className="text-xs text-muted">{co2eFromMeals(r.delivered_servings ?? 0)} kg CO₂e</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <HowWeCalculate />

            {/* Shareable impact summary */}
            <Card variant="accent">
              <div className="flex items-start gap-3">
                <Award className="h-6 w-6 text-warn shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-ink">Share your impact</p>
                  <p className="text-sm text-muted mt-1">
                    You've helped rescue <strong>{s.total_meals_rescued} meals</strong>, avoiding an
                    estimated <strong>{kgFromMeals(s.total_meals_rescued)} kg</strong> of food waste. Thank you!
                  </p>
                  <p className="text-xs text-muted mt-2 italic">
                    Impact figures are estimates based on stated assumptions. Labels as sustainability estimates,
                    not certified values.
                  </p>
                </div>
              </div>
            </Card>

            {s.methodology_note && (
              <Card>
                <p className="text-sm text-muted">{s.methodology_note}</p>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
