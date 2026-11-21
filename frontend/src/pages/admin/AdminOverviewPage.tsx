import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Users, BarChart2, TrendingUp, Clock, Utensils, Leaf, Award } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import type { ImpactSummary } from "../../types/api";
import { formatMinutes } from "../../lib/format";

const LineChart = lazy(() => import("recharts").then((m) => ({ default: m.LineChart })));
const Line = lazy(() => import("recharts").then((m) => ({ default: m.Line })));
const XAxis = lazy(() => import("recharts").then((m) => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then((m) => ({ default: m.YAxis })));
const Tooltip = lazy(() => import("recharts").then((m) => ({ default: m.Tooltip })));
const CartesianGrid = lazy(() => import("recharts").then((m) => ({ default: m.CartesianGrid })));
const ResponsiveContainer = lazy(() => import("recharts").then((m) => ({ default: m.ResponsiveContainer })));

// Sample trend data (in lieu of a dedicated analytics endpoint)
const WEEKLY_TREND = [
  { week: "W-4", meals: 48, rescues: 3 },
  { week: "W-3", meals: 95, rescues: 6 },
  { week: "W-2", meals: 130, rescues: 8 },
  { week: "W-1", meals: 112, rescues: 7 },
  { week: "This", meals: 160, rescues: 10 },
];

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border p-4 ${accent ? "border-primary/20 bg-primaryLight" : "border-border bg-surface"}`}>
      <div className="flex items-center gap-2 text-muted text-xs font-semibold uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <p className="text-3xl font-black text-ink">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

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

  const co2eTotal = summary
    ? (summary.total_meals_rescued * 0.4 * 2.5).toFixed(1)
    : "—";

  return (
    <AppShell title="Operations overview" nav="admin">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Platform overview</h2>
            <p className="text-sm text-muted">Hyderabad · Sample data only</p>
          </div>
          <span className="rounded-full bg-warn/10 border border-warn/20 px-3 py-1 text-xs font-semibold text-warn">
            Demo mode
          </span>
        </div>

        {summaryQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : summaryQuery.isError ? (
          <p role="alert" className="text-sm text-urgent">
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : "Could not load the impact summary."}
          </p>
        ) : summary ? (
          <section aria-label="Platform metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={<Utensils className="h-3.5 w-3.5" />}
              label="Total meals rescued"
              value={summary.total_meals_rescued}
              sub={`${summary.meals_rescued_month} this month`}
              accent
            />
            <StatCard
              icon={<Award className="h-3.5 w-3.5" />}
              label="Completed rescues"
              value={summary.completed_rescues}
              sub={`${completionPct} completion rate`}
            />
            <StatCard
              icon={<Leaf className="h-3.5 w-3.5" />}
              label="CO₂e avoided"
              value={`${co2eTotal} kg`}
              sub="Estimate · see assumptions"
            />
            <StatCard
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Avg. completion time"
              value={
                summary.avg_completion_minutes != null
                  ? formatMinutes(summary.avg_completion_minutes)
                  : "—"
              }
              sub="From posted to delivered"
            />
            <StatCard
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Claim rate"
              value={completionPct}
              sub="Completed ÷ posted"
            />
            <StatCard
              icon={<Users className="h-3.5 w-3.5" />}
              label="Active receivers"
              value="12"
              sub="Orgs registered (sample)"
            />
          </section>
        ) : null}

        {/* Weekly trend chart */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-ink">Weekly trend — meals rescued</h3>
            <span className="ml-auto text-xs text-muted">Sample data</span>
          </div>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={WEEKLY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="meals"
                  stroke="#166534"
                  strokeWidth={2.5}
                  dot={{ fill: "#166534", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Suspense>
        </Card>

        {/* Nav links */}
        <Card>
          <nav aria-label="Admin sections" className="flex flex-wrap gap-3">
            {[
              { to: "/admin/organizations", label: "🏢 Organizations" },
              { to: "/admin/rescues", label: "📋 Rescues" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="inline-flex min-h-[44px] items-center rounded-button border border-border px-4 text-sm font-medium text-ink hover:border-primary hover:bg-primaryLight transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </Card>

        {/* Assumptions footer */}
        <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted">
          <strong>Assumptions:</strong> 1 meal = 0.4 kg food · 1 kg food waste = 2.5 kg CO₂e (WRAP UK estimate).
          All figures are illustrative estimates based on stated assumptions.{" "}
          <strong>No tax or legal claims made.</strong>
        </div>
      </div>
    </AppShell>
  );
}
