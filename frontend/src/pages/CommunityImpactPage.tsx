import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Leaf, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
  const content = <div className="space-y-5"><section className="harvest-hero"><Leaf className="mb-3 text-lime-200"/><p className="eyebrow text-white/70">{personal ? "Your contribution" : "Our collective impact"}</p><h2 className="mt-2 text-3xl font-extrabold">More meals. Less waste.<br/>A healthier community.</h2><p className="mt-3 max-w-xl text-sm text-white/80">Only receiver-confirmed deliveries count. Environmental figures are illustrative estimates, with the calculation shown below.</p></section>{summary.isError && <button className="view-toggle" onClick={() => void summary.refetch()}>Retry impact totals</button>}<section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Meals delivered" value={s?.total_meals_rescued ?? "—"} note="Receiver-confirmed servings"/><Metric label="Food rescued" value={s ? `${s.food_kg_estimate} kg` : "—"} note="Estimated weight"/><Metric label="CO₂e avoided" value={s ? `${s.co2e_kg_estimate} kg` : "—"} note="Illustrative climate model"/><Metric label="Household meal equivalents" value={s?.household_meal_equivalents ?? "—"} note="4 meals = one equivalent"/></section>{personal && s && <ContributionDetails summary={s} receiver={user?.role === "RECEIVER"}/>}<div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><Card><div className="section-heading"><h3>Eight weeks of shared meals</h3><span className="text-sm text-muted">Confirmed deliveries · UTC</span></div><div className="h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={s?.weekly ?? []}><XAxis dataKey="week" tick={{fontSize:12}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} width={40} tick={{fontSize:12}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="meals" fill="#2d6a4f" radius={[6,6,0,0]} name="Meals delivered"/></BarChart></ResponsiveContainer></div>{s?.total_meals_rescued === 0 && <p className="text-sm text-muted">Complete a delivery to see your first impact here.</p>}</Card><Card variant="accent"><h3 className="text-lg font-bold">Behind every number</h3><p className="mt-3 text-sm leading-relaxed text-muted">{s?.assumptions ?? "Loading the calculation assumptions…"}</p><p className="mt-3 text-sm leading-relaxed text-muted">These are not carbon credits, measured emissions reductions, or proof of tax benefits. Water and methane savings need local food and disposal data, so we do not invent them.</p><a className="mt-3 inline-block text-sm font-semibold text-primary underline" href="https://www.epa.gov/sustainable-management-food/wasted-food-scale" target="_blank" rel="noreferrer">Why prevention and donation matter · EPA</a></Card></div>{personal && user?.role === "DONOR" && <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">A record you can share</h3><p className="mt-1 text-sm text-muted">Download all your confirmed deliveries with the estimate assumptions.</p></div><button className="hero-cta" onClick={() => report.mutate()} disabled={report.isPending}><Download size={16}/>Download CSV report</button></div></Card>}<div className="flex flex-wrap gap-4 text-sm font-semibold text-primary"><Link to={personal ? "/community/impact" : "/"}>{personal ? "Explore community impact" : "Return to dashboard"}</Link><Link to="/pricing">How sponsors can help</Link></div></div>;
  return user ? <AppShell title={personal ? "Your impact" : "Community impact"} nav={user.role === "DONOR" ? "donor" : user.role === "ADMIN" ? "admin" : "receiver"}>{content}</AppShell> : <main className="mx-auto max-w-6xl p-4 sm:p-8"><Link to="/home" className="mb-5 inline-block font-bold text-primary">RescueRelay</Link>{content}</main>;
}
