import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import Skeleton from "../components/ui/Skeleton";
import { useAuth } from "../features/auth/AuthContext";
import { apiRequest } from "../lib/api";
import type { LeaderboardData } from "../types/api";

export default function LeaderboardPage() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<"donors" | "receivers">(user?.role === "RECEIVER" ? "receivers" : "donors");
  const [area, setArea] = useState("");
  const data = useQuery({ queryKey: ["leaderboard"],
    queryFn: () => apiRequest<LeaderboardData>("/impact/leaderboard", { token }), refetchInterval: 30000 });
  const rows = data.data?.[tab] ?? [];
  const filtered = rows.filter(row => !area || row.locality === area);

  return <AppShell title="Community rankings" nav={user?.role === "DONOR" ? "donor" : user?.role === "ADMIN" ? "admin" : "receiver"}>
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {(["donors", "receivers"] as const).map(role => <button key={role} aria-pressed={tab === role} onClick={() => {
        setTab(role); setArea("");
      }} className={`view-toggle ${tab === role ? "selected" : ""}`}>{role === "donors" ? "Donors" : "Receivers"}</button>)}
      <select aria-label="Ranking locality" value={area} onChange={event => setArea(event.target.value)} className="ml-auto">
        <option value="">All localities</option>{[...new Set(rows.map(row => row.locality))].sort().map(location => <option key={location}>{location}</option>)}
      </select>
    </div>
    <p className="mb-3 text-sm text-muted">Ranked by confirmed meals. Every confirmed meal earns 10 kindness coins.</p>
    {data.isPending ? <Skeleton className="h-56 w-full"/> : data.isError && !data.data ?
      <button className="view-toggle" onClick={() => void data.refetch()}>Retry rankings</button> :
      !filtered.length ? <Card>No partners in this area.</Card> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((row, index) => <Card key={row.name}>
          <div className="flex items-start gap-2">
            <span className={`rounded-lg px-2 py-1 text-sm font-bold ${index < 3 ? "bg-accentLight text-warn" : "bg-background text-primary"}`}>#{index + 1}</span>
            <div><h3 className="font-bold">{row.name}</h3><p className="text-xs text-muted">{row.locality} · {row.badge}</p></div>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2">
            <div><dt className="text-xs text-muted">Meals delivered</dt><dd className="text-lg font-bold">{row.meals.toLocaleString("en-IN")}</dd></div>
            <div><dt className="text-xs text-muted">Kindness coins</dt><dd className="flex items-center gap-1 text-lg font-bold"><Coins size={16}/>{row.kindness_coins.toLocaleString("en-IN")}</dd></div>
          </dl>
          {(row.rating || row.contribution_medal) && <p className="mt-2 text-xs text-muted">
            {[row.contribution_medal, row.rating ? `${row.rating}/5 (${row.rating_count} ratings)` : ""].filter(Boolean).join(" · ")}
          </p>}
        </Card>)}
      </div>}
  </AppShell>;
}
