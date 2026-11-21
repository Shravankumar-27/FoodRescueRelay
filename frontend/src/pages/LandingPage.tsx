import { Link } from "react-router-dom";
import {
  Utensils,
  Heart,
  Zap,
  MapPin,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Leaf,
} from "lucide-react";

const STATS = [
  { label: "Meals rescued", value: "12,480+", icon: <Utensils className="h-5 w-5" /> },
  { label: "Partner receivers", value: "38", icon: <Heart className="h-5 w-5" /> },
  { label: "Avg. pickup time", value: "23 min", icon: <Zap className="h-5 w-5" /> },
  { label: "CO₂e avoided", value: "4.9 tonnes", icon: <Leaf className="h-5 w-5" /> },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Donor posts surplus in <60s",
    desc: "Food type, quantity, handling info and pickup deadline. We validate safety fields before posting.",
    icon: <Utensils className="h-6 w-6 text-primary" />,
  },
  {
    step: "2",
    title: "Smart matching finds the best receiver",
    desc: "We rank NGOs and community kitchens by distance, need level, capacity and reliability — in seconds.",
    icon: <MapPin className="h-6 w-6 text-primary" />,
  },
  {
    step: "3",
    title: "Pickup confirmed, impact recorded",
    desc: "Live status: Posted → Claimed → Collected → Delivered. Every rescue logged for your impact report.",
    icon: <TrendingUp className="h-6 w-6 text-primary" />,
  },
];

const ROLES = [
  {
    role: "Donor",
    desc: "Post surplus, track impact, repeat with one tap.",
    cta: "Post surplus food",
    color: "bg-primary hover:bg-primaryDark",
    email: "donor@rescuerelay.demo",
  },
  {
    role: "NGO / Receiver",
    desc: "Get notified of nearby surplus, claim, collect and report.",
    cta: "Find food near me",
    color: "bg-info hover:bg-info/90",
    email: "hope@rescuerelay.demo",
  },
  {
    role: "Admin / Sponsor",
    desc: "City-wide analytics, donor reports and CSR dashboards.",
    cta: "Open dashboard",
    color: "bg-muted hover:bg-ink",
    email: "admin@rescuerelay.demo",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-black">
              R
            </span>
            RescueRelay
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-successLight px-2.5 py-0.5 text-xs font-semibold text-success">
              🏙️ Hyderabad Demo
            </span>
            <Link
              to="/login"
              className="inline-flex min-h-[40px] items-center rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primaryDark"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 px-4 py-20 text-white">
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-300" />
            Live in Hyderabad · Sample data
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Surplus food has a deadline.
            <br />
            <span className="text-green-300">RescueRelay beats it.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-green-100">
            We connect caterers and event venues to community kitchens and NGOs in Hyderabad —
            turning food waste into meals, in under 30 minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex min-h-[52px] items-center gap-2 rounded-button bg-white px-6 font-bold text-primary hover:bg-green-50"
            >
              <Utensils className="h-5 w-5" />
              Post surplus food
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-[52px] items-center gap-2 rounded-button border border-white/30 bg-white/10 px-6 font-semibold text-white backdrop-blur-sm hover:bg-white/20"
            >
              <Heart className="h-5 w-5" />
              Find food near me
            </Link>
          </div>
        </div>

        {/* Background decorative circles */}
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-white/5" aria-hidden />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/5" aria-hidden />
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-border md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-4 py-6 text-center">
              <span className="flex items-center gap-1.5 text-muted">
                {s.icon}
                <span className="text-xs font-medium">{s.label}</span>
              </span>
              <span className="text-2xl font-extrabold text-ink">{s.value}</span>
              <span className="text-xs text-muted">Sample data</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-ink">How RescueRelay works</h2>
            <p className="mt-2 text-muted">Three steps. Under 30 minutes. Zero food wasted.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.step}
                className="rounded-card border border-border bg-surface p-6 shadow-card"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primaryLight">
                  {step.icon}
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
                    {step.step}
                  </span>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                </div>
                <p className="text-sm text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role CTAs */}
      <section className="bg-surface px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-ink">Get started as…</h2>
            <p className="mt-2 text-muted">
              Demo credentials are pre-filled. Password:{" "}
              <code className="rounded bg-background px-1 font-mono text-xs">demo123</code>
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <div
                key={r.role}
                className="flex flex-col rounded-card border border-border bg-background p-6"
              >
                <h3 className="mb-1 text-lg font-bold text-ink">{r.role}</h3>
                <p className="mb-4 flex-1 text-sm text-muted">{r.desc}</p>
                <Link
                  to={`/login?demo=${encodeURIComponent(r.email)}`}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-button px-4 text-sm font-semibold text-white ${r.color}`}
                >
                  {r.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety / disclaimer */}
      <section className="border-t border-border bg-accentLight px-4 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 flex justify-center">
            <ShieldCheck className="h-8 w-8 text-warn" />
          </div>
          <h3 className="mb-2 font-bold text-ink">Our guardrails</h3>
          <p className="text-sm text-muted">
            RescueRelay connects donors and receivers. We do <strong>not</strong> certify food
            safety. All handling and storage information is provided by the donor and must be
            independently verified by the receiver before distribution. All data shown is{" "}
            <strong>synthetic sample data</strong>. No real personal details are stored or displayed.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-4 py-6 text-center text-xs text-muted">
        RescueRelay · Hackathon Demo · Hyderabad · Sample data only · No real food transactions
      </footer>
    </div>
  );
}
