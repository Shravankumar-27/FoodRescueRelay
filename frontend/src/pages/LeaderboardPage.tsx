import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins, ShieldCheck, Trophy } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import { useAuth } from "../features/auth/AuthContext";
import { apiRequest } from "../lib/api";
import type { LeaderboardData } from "../types/api";
export default function LeaderboardPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"donors" | "receivers">("donors");
  const [area, setArea] = useState("");
  const data = useQuery({ queryKey: ["leaderboard"], queryFn: () => apiRequest<LeaderboardData>("/impact/leaderboard", { token }), refetchInterval: 30000 });
  const rows = data.data?.[tab] ?? [];
  const filtered = rows.filter(r => !area || r.locality === area);
  return <AppShell title="Community rankings" nav={user?.role === "DONOR" ? "donor" : user?.role === "ADMIN" ? "admin" : "receiver"}>
    <section className="harvest-hero mb-5">
      <Trophy className="mb-3 text-amber-300" aria-hidden="true"/>
      <h2 className="text-3xl font-bold">Meet the people making it happen.</h2>
      <p className="mt-3 text-sm text-white/80">Ranked by receiver-confirmed meals, then trust.</p>
    </section>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {(["donors", "receivers"] as const).map(group => (
        <button key={group} type="button" aria-pressed={tab === group}
          onClick={() => { setTab(group); setArea(""); }}
          className={"view-toggle " + (tab === group ? "selected" : "")}>Top {group}</button>
      ))}
      <select aria-label="Filter rankings by locality" value={area} onChange={e => setArea(e.target.value)} className="sm:ml-auto">
        <option value="">All localities</option>
        {[...new Set(rows.map(row => row.locality))].sort().map(locality => <option key={locality}>{locality}</option>)}
      </select>
    </div>
    {data.isError && <button type="button" className="view-toggle mb-3" onClick={() => void data.refetch()}>Retry rankings</button>}
    {data.isPending ? <p>Loading rankings…</p> : !filtered.length ? <Card>No partners in this area yet.</Card> :
      <div className="space-y-3">
        {filtered.map((row, index) => <Card key={row.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(6rem,.45fr)_minmax(7rem,.65fr)] sm:gap-4">
          <span className={"grid h-11 w-11 place-items-center rounded-xl font-extrabold " + (index === 0 ? "bg-accentLight text-warn" : "bg-background text-primary")}>#{index + 1}</span>
          <div className="min-w-0 break-words">
            <h3 className="font-bold">{row.name}</h3>
            <p className="mt-1 text-sm text-muted">{row.locality} · {row.badge} trust tier</p>
            {row.contribution_medal && <p className="mt-2 text-xs font-semibold text-amber-800">
              {row.contribution_medal} · {row.kindness_coins.toLocaleString("en-IN")} kindness coins
            </p>}
          </div>
          <div className="col-start-2 sm:col-auto">
            <p className="text-xl font-extrabold">{row.meals.toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted">meals delivered</p>
          </div>
          <div className="col-start-2 text-sm sm:col-auto">
            <p>{row.completion_rate === null ? "No completed outcomes" : Math.round(row.completion_rate * 100) + "% completion"}</p>
            <p className="mt-1 text-muted">{row.rating ? row.rating + "/5 · " + row.rating_count + " reviews" : "No handoff ratings yet"}</p>
          </div>
        </Card>)}
      </div>}
    <section className="mt-5 grid gap-4 lg:grid-cols-2" aria-label="How rankings work">
      <Card variant="accent">
        <h3 className="flex items-center gap-2 font-bold"><Coins size={19} aria-hidden="true"/>Kindness coins</h3>
        <p className="mt-3 text-2xl font-black text-primaryDark">10 coins per meal</p>
        <p className="mt-2 text-sm text-muted">Receiver-confirmed meals earn coins and contribution medals. Coins have no cash value or effect on food access.</p>
      </Card>
      <Card>
        <h3 className="flex items-center gap-2 font-bold"><ShieldCheck size={19} className="text-primary" aria-hidden="true"/>Trust score</h3>
        <dl className="my-3 grid grid-cols-3 gap-2 text-sm">
          {[["40%", "Completed outcomes"], ["30%", "Reliability"], ["30%", "Handoff ratings"]].map(([weight, label]) => (
            <div key={label} className="rounded-lg bg-background p-2">
              <dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-bold">{weight}</dd>
            </div>
          ))}
        </dl>
        <ul className="flex flex-wrap gap-2 text-xs font-semibold">
          <li className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900">Gold ≥ 85%</li>
          <li className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-800">Silver ≥ 70%</li>
          <li className="rounded-full bg-orange-100 px-2.5 py-1 text-orange-900">Bronze ≥ 50%</li>
        </ul>
        <p className="mt-3 text-xs text-muted">Partners without completed outcomes are New. Missing ratings use a neutral baseline.</p>
      </Card>
    </section>
  </AppShell>;
}
