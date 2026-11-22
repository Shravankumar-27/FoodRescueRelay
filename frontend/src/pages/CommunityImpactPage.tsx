import BackButton from "../components/ui/BackButton";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Leaf, Download } from "lucide-react";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import ContributionDetails from "../components/impact/ContributionDetails";
import Metric from "../components/ui/Metric";
import { useAuth } from "../features/auth/AuthContext";
import { apiRequest } from "../lib/api";
import { API_BASE } from "../lib/config";
import type { ImpactSummary } from "../types/api";
export default function CommunityImpactPage({ personal = false }: { personal?: boolean }) {
  const { user, token } = useAuth();
  const summary = useQuery({ queryKey: ["impact", personal ? "summary" : "community"], queryFn: () => apiRequest<ImpactSummary>(personal ? "/impact/summary" : "/impact/community", { token }), refetchInterval: 15000 });
  const s = summary.data;
  const report = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE}/impact/report/donor`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not download your report. Please try again.");
      const url = URL.createObjectURL(await response.blob()); const a = document.createElement("a"); a.href = url; a.download = "rescuerelay-impact.csv"; a.click(); URL.revokeObjectURL(url);
    },
  });
  const content = <div className="space-y-5">
    <section className="harvest-hero">
      <Leaf className="mb-3 text-lime-200"/>
      <h2 className="text-3xl font-extrabold">{personal ? "Your impact, meal by meal" : "More meals. Less waste."}</h2>
    </section>
    {summary.isError && <button className="view-toggle" onClick={() => void summary.refetch()}>Retry impact totals</button>}
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Metric label="Meals delivered" value={s?.total_meals_rescued ?? "—"} note="Receiver-confirmed servings"/>
      <Metric label="Food rescued" value={s ? s.food_kg_estimate + " kg" : "—"} note="Estimated weight"/>
      <Metric label="CO₂e avoided" value={s ? s.co2e_kg_estimate + " kg" : "—"} note="Estimated emissions"/>
      <Metric label="Household meal equivalents" value={s?.household_meal_equivalents ?? "—"} note="4 meals per equivalent"/>
    </section>
    {personal && s && <ContributionDetails summary={s} receiver={user?.role === "RECEIVER"}/>}
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card className="min-w-0">
        <h3 className="font-bold">Meals delivered by week</h3>
        <p className="mb-3 text-sm text-muted">Last eight weeks · UTC</p>
        <div className="h-64 min-w-0 rounded-xl bg-background/70 py-3 pr-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={s?.weekly ?? []} accessibilityLayer margin={{ top: 24, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#dedbd4" strokeDasharray="4 4"/>
              <XAxis dataKey="week" tick={{ fontSize: 12 }} minTickGap={18} tickMargin={8} axisLine={false} tickLine={false}/>
              <YAxis allowDecimals={false} width={44} tick={{ fontSize: 12 }} axisLine={false} tickLine={false}/>
              <Tooltip cursor={{ fill: "#e1eee5" }} contentStyle={{ borderRadius: 12, borderColor: "#dcded4", fontSize: 14 }}/>
              <Bar dataKey="meals" fill="#2d6a4f" maxBarSize={48} radius={[6, 6, 0, 0]} name="Meals delivered">
                <LabelList dataKey="meals" position="top" fontSize={12} fill="#2d6a4f" formatter={(value: unknown) => Number(value) > 0 ? String(value) : ""}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {s?.total_meals_rescued === 0 && <p className="mt-3 text-sm text-muted">No confirmed deliveries yet.</p>}
      </Card>
      <Card variant="accent">
        <h3 className="text-lg font-bold">How estimates are calculated</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">Every confirmed serving counts as one meal. We use the same simple factors across your impact report.</p>
        <dl className="my-3 divide-y divide-border">
          {[["Food weight", "0.4 kg per meal"], ["Emissions avoided", "2.5 kg CO₂e per kg of food"], ["Household meal equivalent", "4 meals"]].map(([label, value]) => (
            <div key={label} className="grid gap-1 py-2 text-sm sm:grid-cols-2">
              <dt className="text-muted">{label}</dt><dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <a className="text-sm font-semibold text-primary underline" href="https://www.epa.gov/sustainable-management-food/wasted-food-scale" target="_blank" rel="noreferrer">Why prevention and donation matter · EPA</a>
      </Card>
    </div>
    {personal && user?.role === "DONOR" && <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">Confirmed deliveries</h3>
        <button className="hero-cta" onClick={() => report.mutate()} disabled={report.isPending}><Download size={16}/>Download CSV report</button>
      </div>
    </Card>}
    <div className="flex flex-wrap gap-4 text-sm font-semibold text-primary">
      <Link to={personal ? "/community/impact" : "/"}>{personal ? "Explore community impact" : "Return to dashboard"}</Link>
      <Link to="/pricing">How sponsors can help</Link>
    </div>
  </div>;
  return user ? <AppShell title={personal ? "Your impact" : "Community impact"} nav={user.role === "DONOR" ? "donor" : user.role === "ADMIN" ? "admin" : "receiver"}>{content}</AppShell> : <main className="mx-auto max-w-6xl p-4 sm:p-8"><BackButton/><Link to="/home" className="mb-5 inline-block font-bold text-primary">RescueRelay</Link>{content}</main>;
}
