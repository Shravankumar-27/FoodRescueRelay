import BackButton from "../components/ui/BackButton";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../features/auth/AuthContext";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export const PROPOSAL = "Illustrative proposal. Billing is not active.";
export const SYNTHETIC = "Synthetic demo data";
export const SAFETY = "Not a food-safety certification.";
export const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

export function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-semibold">{label}<input className="mt-2 min-h-12 w-full rounded-xl border border-border px-3" type="number" min="0" step="any" value={value} onChange={e => onChange(Math.max(0, Number(e.target.value) || 0))}/></label>;
}

export function BusinessShell({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAuth();
  const content = <div className="space-y-5">
    <p className="rounded-xl border border-amber-200 bg-accentLight p-3 text-sm font-semibold">{PROPOSAL}</p>
    <nav aria-label="Business pack" className="flex flex-wrap gap-2">
      {([["/pricing", "Pricing & donor ROI"], ["/business/sponsors", "Sponsors"], ["/business/city", "City coverage"], ["/business/economics", "Unit economics"], ["/business/pilot", "Pilot feedback"]]).map(([to, label]) =>
        <Link className="view-toggle" key={to} to={to}>{label}</Link>)}
    </nav>
    {children}
  </div>;
  return user ? <AppShell title={title} nav={user.role === "DONOR" ? "donor" : user.role === "ADMIN" ? "admin" : "receiver"}>{content}</AppShell>
    : <main className="mx-auto max-w-6xl p-4 sm:p-8"><BackButton/><h1 className="mb-5 text-2xl font-bold">{title}</h1>{content}<footer className="mt-6 text-xs text-muted">{SYNTHETIC}</footer></main>;
}
