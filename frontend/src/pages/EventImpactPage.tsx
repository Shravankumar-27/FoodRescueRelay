import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { apiRequest } from "../lib/api";
import { printImpact } from "../lib/impactPrint";

interface EventImpact {
  meals: number;
  estimated_kg: number;
  estimated_co2e_kg: number;
  kg_per_meal: number;
  co2e_per_kg: number;
  receiver_names: string[];
  data_notice: string;
  safety_notice: string;
}

export default function EventImpactPage() {
  const { token } = useParams();
  const [copied, setCopied] = useState(false);
  const report = useQuery({ queryKey: ["event-impact", token], queryFn: () => apiRequest<EventImpact>(`/event-impact/${token}`), retry: false });
  const d = report.data;
  return <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-8">
    <Link to="/home" className="text-sm font-bold text-primary">RescueRelay</Link>
    {report.isPending && <p role="status">Loading event impact…</p>}
    {report.isError && <Card>This event report is unavailable.</Card>}
    {d && <>
      <Card className="recognition-print space-y-4">
        <p className="text-sm text-muted">RescueRelay · {d.data_notice}</p>
        <h1 className="text-3xl font-extrabold text-primary">Your event fed {d.meals} {d.meals === 1 ? "meal" : "meals"}</h1>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt>Estimated food weight</dt><dd className="text-xl font-bold">{d.estimated_kg} kg</dd></div>
          <div><dt>Estimated CO₂e avoided</dt><dd className="text-xl font-bold">{d.estimated_co2e_kg} kg</dd></div>
        </dl>
        <p><strong>Receiving organisations</strong> {d.receiver_names.join(", ")}</p>
        <p className="text-sm text-muted">One receiver-confirmed serving counts as one meal. Estimated weight = meals × {d.kg_per_meal} kg. Estimated CO₂e = weight × {d.co2e_per_kg} kg CO₂e per kg. Transport emissions are excluded.</p>
        <p className="text-sm">{d.safety_notice}</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button onClick={printImpact}>Print / save event PDF</Button>
        <Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch { setCopied(false); } }}>Copy report link</Button>
      </div>
      {copied && <p role="status">Report link copied.</p>}
      <label className="block text-sm text-muted">Shareable link<input className="mt-1 w-full rounded-xl border border-border p-2" readOnly value={window.location.href} onFocus={e => e.currentTarget.select()}/></label>
    </>}
    <footer className="text-xs text-muted">Synthetic demo data</footer>
  </main>;
}
