import ContributionBanner from "../../components/impact/ContributionBanner";
import MealInsights from "../../components/impact/MealInsights";
import FavoritePartner, { useFavoritePartners } from "../../components/partners/FavoritePartner";
import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Leaf, Users, Utensils, Package, Map, List, MessageCircle, RefreshCw, Repeat2 } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Metric from "../../components/ui/Metric";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import StatusBadge from "../../components/rescue/StatusBadge";
import RescueClock from "../../components/rescue/RescueClock";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { apiRequest } from "../../lib/api";
import { DIETS, CATEGORIES, foodLabel } from "../../lib/food";
import type { RescueSummary, RescueDetail, NearbyReceiver, ImpactSummary } from "../../types/api";
const RescueMap = lazy(() => import("../../components/map/RescueMap"));
const ACTIVE = ["POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED"];
const NEED_PRIORITY: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function DonorHomePage() {
  const { token, organization } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("map");
  const [diet, setDiet] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("distance");
  const [available, setAvailable] = useState(false);
  const [area, setArea] = useState("");
  const [scenario, setScenario] = useState("");
  const favorites = useFavoritePartners();
  const { error: toastError } = useToast();
  const mine = useQuery({ queryKey: ["rescues", "mine"], queryFn: () => apiRequest<RescueSummary[]>("/rescues/mine", { token }), refetchInterval: 5000 });
  const summary = useQuery({ queryKey: ["impact", "summary"], queryFn: () => apiRequest<ImpactSummary>("/impact/summary", { token }), refetchInterval: 15000 });
  const receivers = useQuery({ queryKey: ["receivers", "nearby", diet, category], queryFn: () => apiRequest<NearbyReceiver[]>(`/receivers/nearby?${new URLSearchParams({ ...(diet ? { dietary_type: diet } : {}), ...(category ? { food_category: category } : {}) })}`, { token }), refetchInterval: 10000 });
  const active = (mine.data ?? []).filter(r => ACTIVE.includes(r.status));
  const online = (receivers.data ?? []).filter(r => r.available && r.available_servings > 0);
  const knownReceivers = receivers.data ?? [];
  const localities = [...new Set(knownReceivers.map(receiver => receiver.locality))].sort();
  const saved = new Set(favorites.data?.map(partner => partner.id));
  const directory = knownReceivers.filter(receiver =>
    (!available || (receiver.available && receiver.available_servings > 0))
    && (!area || receiver.locality === area)
    && (scenario !== "cold" || receiver.refrigeration_available)
    && (scenario !== "favorites" || saved.has(receiver.id))
  ).sort((a, b) => sort === "trust" ? b.trust_score - a.trust_score
    : sort === "need" ? (NEED_PRIORITY[b.need_level] ?? 0) - (NEED_PRIORITY[a.need_level] ?? 0) : a.distance_km - b.distance_km);
  const releases = (mine.data ?? []).filter(rescue => rescue.receiver_release)
    .sort((a, b) => Date.parse(b.receiver_release!.created_at) - Date.parse(a.receiver_release!.created_at)).slice(0, 3);
  const pins = directory.map(r => ({ id: r.id, lat: r.latitude, lng: r.longitude, label: r.name, sublabel: r.locality, type: "receiver" as const, capacity: r.available ? r.available_servings : 0, needLevel: r.need_level, badge: r.rank_badge, distance_km: r.distance_km, actionLabel: "Message partner", onAction: () => navigate(`/messages?partner=${r.id}`) }));
  async function repeatLast() {
    const latest = mine.data?.[0];
    if (!latest) return;
    try {
      const detail = await apiRequest<RescueDetail>(`/rescues/${latest.id}`, { token });
      localStorage.removeItem("rr.draft");
      sessionStorage.setItem("rr.repeat", JSON.stringify({ food_items: detail.food_items }));
      navigate("/donor/rescue/new");
    } catch (e) { toastError(e instanceof Error ? e.message : "Could not load the last rescue."); }
  }
  return <AppShell title="Donor dashboard" nav="donor"><div className="space-y-5">
    <ContributionBanner />
    <section className="harvest-hero">
      <div className="relative z-10 max-w-xl"><p className="eyebrow text-white/70">{organization?.name} · Hyderabad pilot</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Good food.<br />A better destination.</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">Turn today's surplus into someone's next meal. Find a community partner and make the handoff count.</p><div className="mt-5 flex flex-wrap gap-2"><Link to="/donor/rescue/new" className="hero-cta"><Plus size={18} /> Post food</Link>{mine.data?.length ? <button onClick={repeatLast} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 px-4 text-sm font-semibold"><Repeat2 size={16} /> Repeat last listing</button> : null}</div></div><div className="food-art" aria-hidden="true"><span /><i /><b /></div>
    </section>
    {(mine.isError || summary.isError || receivers.isError) && <div><button type="button" className="view-toggle" onClick={() => { void mine.refetch(); void summary.refetch(); void receivers.refetch(); }}>Retry dashboard data</button></div>}
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Donation overview">
      <Metric label="Meals delivered" value={summary.data?.total_meals_rescued ?? "—"} note={`${summary.data?.meals_rescued_month ?? 0} this month`} icon={<Utensils size={18} />} />
      <Metric label="Receivers available" value={receivers.isPending ? "—" : online.length} note={`${online.reduce((n, r) => n + r.available_servings, 0)} servings of capacity`} icon={<Users size={18} />} />
      <Metric label="Food rescued" value={`${summary.data?.food_kg_estimate ?? 0} kg`} note="Estimate · 0.4 kg per meal" icon={<Package size={18} />} />
      <Metric label="Climate impact" value={`${summary.data?.co2e_kg_estimate ?? 0} kg`} note="Estimated CO₂e avoided" icon={<Leaf size={18} />} />
    </section>
    <Card className="border-primary/20"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="eyebrow text-primary">Your generosity, in real numbers</p><h3 className="mt-2 text-xl font-bold">{summary.data?.people_counted_deliveries ? `${summary.data.reported_people_served} people served, reported by receivers` : "Every delivered meal has a story."}</h3><p className="mt-2 text-sm text-muted">{summary.data?.food_rating ? `Food feedback ${summary.data.food_rating}/5 from ${summary.data.food_rating_count} review${summary.data.food_rating_count === 1 ? "" : "s"}. ` : "Receiver food feedback appears after acknowledgement. "}</p></div><div className="flex flex-wrap gap-2"><Link to="/donor/impact" className="hero-cta">See your contribution</Link><Link to="/recognition" className="inline-flex min-h-12 items-center rounded-xl border border-border px-4 text-sm font-semibold text-primary">Appreciation studio</Link></div></div></Card>
    {active.length > 0 && <section><div className="section-heading"><h3>In progress <span className="text-muted">({active.length})</span></h3><span className="text-sm text-muted">Updates every 5 seconds</span></div><div className="grid gap-3 lg:grid-cols-2">{active.map(r => <Link key={r.id} to={`/donor/rescue/${r.id}`} className="rounded-2xl border border-primary/25 bg-white p-4 transition hover:shadow-md"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{r.display_id}</strong><StatusBadge status={r.status} /></div><p className="my-2 text-sm text-muted">{r.total_servings} servings · {r.locality}</p>{r.status === "COLLECTED" ? <p className="text-sm font-semibold text-primary">Collected · awaiting delivery confirmation</p> : <RescueClock pickupBy={r.pickup_by} />}</Link>)}</div></section>}
    {!!releases.length && <Card variant="warn"><h3 className="font-semibold">Released pickups</h3>
      {releases.map(rescue => <Link key={rescue.receiver_release?.id} to={`/donor/rescue/${rescue.id}`} className="mt-2 block text-sm font-semibold underline">
        {rescue.display_id} · {rescue.receiver_release?.reason}
      </Link>)}
    </Card>}
    <section className="space-y-3" id="receiver-directory"><div className="section-heading"><h3>Nearby receivers</h3><button aria-label="Refresh receivers" onClick={() => void receivers.refetch()} className="icon-button"><RefreshCw size={18} /></button></div>
      <details className="rounded-xl border border-border bg-surface px-3 py-2"><summary className="cursor-pointer text-sm font-semibold">Filter receivers</summary><div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3"><select aria-label="Filter receivers by diet" value={diet} onChange={e => setDiet(e.target.value)}><option value="">Any dietary type</option>{DIETS.map(d => <option key={d} value={d}>{foodLabel(d)}</option>)}</select><select aria-label="Filter receivers by category" value={category} onChange={e => setCategory(e.target.value)}><option value="">Any food category</option>{CATEGORIES.map(d => <option key={d} value={d}>{foodLabel(d)}</option>)}</select><select aria-label="Sort receivers" value={sort} onChange={e => setSort(e.target.value)}><option value="distance">Nearest first</option><option value="trust">Highest trust</option><option value="need">Highest need</option></select><label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} />Available now</label><select aria-label="Receiver locality" value={area} onChange={event => setArea(event.target.value)}><option value="">All localities</option>{[...new Set([...localities, ...(area ? [area] : [])])].map(location => <option key={location}>{location}</option>)}</select><select aria-label="Receiver scenario" value={scenario} onChange={event => setScenario(event.target.value)}><option value="">All receivers</option><option value="cold">Cold storage</option><option value="favorites">Favorites</option></select><div className="col-span-full flex w-fit rounded-xl border border-border bg-white p-1"><button aria-pressed={view === "map"} onClick={() => setView("map")} className={`view-toggle ${view === "map" ? "selected" : ""}`}><Map size={16} />Map</button><button aria-pressed={view === "list"} onClick={() => setView("list")} className={`view-toggle ${view === "list" ? "selected" : ""}`}><List size={16} />List</button></div></div></details>
      {receivers.isPending ? <Skeleton className="h-72 w-full" /> : directory.length === 0 ? <Card><h4 className="font-bold">No receivers match these filters</h4><p className="mt-1 text-sm text-muted">Try another food category or check back when partners are available.</p></Card> : <div className={view === "map" ? "grid gap-3 xl:grid-cols-2" : ""}>{view === "map" && <div><Suspense fallback={<Skeleton className="h-96 w-full" />}><RescueMap pins={pins} showOnlyType="receiver" className="relative h-96 w-full overflow-hidden rounded-2xl border border-border" /></Suspense></div>}<div className={`grid gap-3 ${view === "list" ? "lg:grid-cols-2" : "max-h-[440px] overflow-y-auto"}`}>{directory.map(r => <article key={r.id} className="flex min-w-0 flex-col rounded-2xl border border-border bg-white p-4"><div className="flex items-start justify-between gap-2"><div><h4 className="font-bold">{r.name}</h4><p className="mt-1 text-sm text-muted">{r.locality} · {r.distance_km} km</p></div><div className="flex shrink-0 items-center gap-1"><span className="rounded-lg bg-accentLight px-2 py-1 text-xs font-bold text-warn">{r.rank_badge}</span><FavoritePartner id={r.id} name={r.name} /></div></div><div className="my-3 flex flex-wrap gap-2 text-sm"><span className="rounded-md bg-primaryLight/60 px-2 py-1 text-primary">{r.available ? `${r.available_servings} servings free` : "Currently paused"}</span><span className="rounded-md bg-background px-2 py-1">{foodLabel(r.need_level)} need</span>{r.refrigeration_available && <span className="rounded-md bg-background px-2 py-1">Cold storage</span>}</div><p className="text-sm text-muted">{r.description || (r.transport_available ? "Transport available for collection." : "Transport needs coordination.")}</p><p className="mt-2 text-sm text-muted">{r.accepted_dietary_types.length ? r.accepted_dietary_types.map(foodLabel).join(", ") : r.accepts_non_veg ? "Accepts vegetarian and non-vegetarian food" : "Vegetarian food only"}</p><div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3"><span className="text-sm text-muted">{r.rating ? `${r.rating}/5 · ${r.rating_count} reviews` : "No handoff reviews yet"}</span><Link to={`/messages?partner=${r.id}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primaryLight/70 px-3 text-sm font-semibold text-primary"><MessageCircle size={16} />Chat & coordinate</Link></div></article>)}</div></div>}
    </section>
    <details className="rounded-xl border border-border bg-surface p-3"><summary className="cursor-pointer font-semibold">Meal feedback</summary><div className="mt-2"><MealInsights /></div></details>
    <div className="grid gap-4 lg:grid-cols-2"><Card><div className="section-heading"><h3>Recent donations</h3><Link className="text-sm font-semibold text-primary" to="/donor/rescues">View history</Link></div>{mine.data?.length ? mine.data.slice(0, 4).map(r => <Link key={r.id} to={`/donor/rescue/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-3"><span className="text-sm"><strong>{r.display_id}</strong><br /><span className="text-muted">{r.total_servings} servings</span></span><StatusBadge status={r.status} /></Link>) : <p className="text-sm text-muted">Your first donation starts a new story. Post surplus to get started.</p>}</Card><Card variant="accent"><p className="eyebrow text-warn">Make it a weekly habit</p><h3 className="mt-2 text-xl font-bold">A little planning. Less food wasted.</h3><p className="mt-2 text-sm leading-relaxed text-muted">Check partner capacity before packaging. Use repeat listing to bring back your usual menu, then confirm fresh handling details and pickup times.</p><div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => navigate("/donor/impact")}>See your impact</Button><Link to="/pricing" className="inline-flex min-h-12 items-center px-3 text-sm font-semibold text-primary">Explore sponsor plans</Link></div></Card></div>
  </div></AppShell>;
}
