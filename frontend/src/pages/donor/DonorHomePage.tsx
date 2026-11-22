import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Leaf, Users, Utensils, Package, Map, List, MessageCircle, Repeat2 } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Metric from "../../components/ui/Metric";
import Skeleton from "../../components/ui/Skeleton";
import StatusBadge from "../../components/rescue/StatusBadge";
import FavoritePartner, { useFavoritePartners } from "../../components/partners/FavoritePartner";
import ContributionBanner from "../../components/impact/ContributionBanner";
import MealInsights from "../../components/impact/MealInsights";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { apiRequest } from "../../lib/api";
import { DIETS, CATEGORIES, foodLabel } from "../../lib/food";
import type { RescueSummary, RescueDetail, NearbyReceiver, ImpactSummary } from "../../types/api";

const RescueMap = lazy(() => import("../../components/map/RescueMap"));
const ACTIVE = ["POSTED", "MATCHING", "OFFERED", "CLAIMED", "COLLECTED"];

export default function DonorHomePage() {
  const { token, organization } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState("map");
  const [diet, setDiet] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [scenario, setScenario] = useState("all");
  const [sort, setSort] = useState("distance");
  const favorites = useFavoritePartners();
  const mine = useQuery({ queryKey: ["rescues", "mine"], queryFn: () => apiRequest<RescueSummary[]>("/rescues/mine", { token }), refetchInterval: 5000 });
  const summary = useQuery({ queryKey: ["impact", "summary"], queryFn: () => apiRequest<ImpactSummary>("/impact/summary", { token }), refetchInterval: 15000 });
  const params = new URLSearchParams();
  if (diet) params.set("dietary_type", diet);
  if (category) params.set("food_category", category);
  const receivers = useQuery({ queryKey: ["receivers", "nearby", diet, category],
    queryFn: () => apiRequest<NearbyReceiver[]>(`/receivers/nearby?${params}`, { token }), refetchInterval: 10000 });
  const all = mine.data ?? [];
  const active = all.filter(rescue => ACTIVE.includes(rescue.status));
  const recent = all.filter(rescue => !ACTIVE.includes(rescue.status)).slice(0, 4);
  const releases = all.filter(rescue => rescue.receiver_release).slice(0, 3);
  const known = receivers.data ?? [];
  const available = known.filter(receiver => receiver.available && receiver.available_servings > 0);
  const locations = [...new Set(known.map(receiver => receiver.locality))].sort();
  const saved = new Set(favorites.data?.map(partner => partner.id));
  const directory = known.filter(receiver => {
    if (area && receiver.locality !== area) return false;
    if (scenario === "available") return receiver.available && receiver.available_servings > 0;
    if (scenario === "cold") return !!receiver.refrigeration_available;
    if (scenario === "need") return receiver.need_level === "HIGH";
    if (scenario === "favorites") return saved.has(receiver.id);
    return true;
  }).sort((a, b) => sort === "trust" ? b.trust_score - a.trust_score : a.distance_km - b.distance_km);
  const pins = directory.map(receiver => ({
    id: receiver.id, lat: receiver.latitude, lng: receiver.longitude,
    label: receiver.name, sublabel: receiver.locality, type: "receiver" as const,
    capacity: receiver.available ? receiver.available_servings : 0,
    needLevel: receiver.need_level, distance_km: receiver.distance_km,
    actionLabel: "Message", onAction: () => navigate(`/messages?partner=${receiver.id}`),
  }));

  async function repeatLast() {
    if (!all[0]) return;
    try {
      const detail = await apiRequest<RescueDetail>(`/rescues/${all[0].id}`, { token });
      localStorage.removeItem("rr.draft");
      sessionStorage.setItem("rr.repeat", JSON.stringify({ food_items: detail.food_items }));
      navigate("/donor/rescue/new");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the last rescue.");
    }
  }

  function rescueRows(rescues: RescueSummary[], empty: string) {
    return rescues.length ? rescues.map(rescue => <Link key={rescue.id} to={`/donor/rescue/${rescue.id}`}
      className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2">
      <span className="text-sm font-semibold">{rescue.display_id} <span className="font-normal text-muted">· {rescue.total_servings} servings</span></span>
      <StatusBadge status={rescue.status}/>
    </Link>) : <p className="text-sm text-muted">{empty}</p>;
  }

  return <AppShell title="Donor dashboard" nav="donor"><div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">{organization?.name}</h2>
      <div className="flex flex-wrap gap-2">
        <Link to="/donor/rescue/new" className="hero-cta"><Plus size={18}/>Post food</Link>
        {!!all.length && <button type="button" onClick={repeatLast} className="view-toggle"><Repeat2 size={16}/>Repeat last listing</button>}
      </div>
    </header>
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Donation overview">
      <Metric label="Meals delivered" value={summary.data?.total_meals_rescued ?? "—"} icon={<Utensils size={18}/>}/>
      <Metric label="Available receivers" value={receivers.data ? available.length : "—"} icon={<Users size={18}/>}/>
      <Metric label="Food rescued" value={summary.data ? `${summary.data.food_kg_estimate} kg` : "—"} note="Estimated" icon={<Package size={18}/>}/>
      <Metric label="CO₂e avoided" value={summary.data ? `${summary.data.co2e_kg_estimate} kg` : "—"} note="Estimated" icon={<Leaf size={18}/>}/>
    </section>
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card><h3 className="mb-2 font-bold">In progress</h3>{rescueRows(active, "No active donations.")}</Card>
      <Card><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-bold">Recent donations</h3>
        <Link className="text-sm font-semibold text-primary" to="/donor/rescues">View history</Link></div>{rescueRows(recent, "No completed or closed donations.")}</Card>
    </div>
    {!!releases.length && <Card variant="warn"><h3 className="font-semibold">Released pickups</h3>
      {releases.map(rescue => <Link key={rescue.receiver_release?.id} to={`/donor/rescue/${rescue.id}`} className="mt-2 block text-sm font-semibold underline">
        {rescue.display_id} · {rescue.receiver_release?.reason}
      </Link>)}
    </Card>}
    <section className="space-y-3" id="receiver-directory">
      <h3 className="text-lg font-bold">Nearby receivers</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Receiver locality" value={area} onChange={event => setArea(event.target.value)}><option value="">All localities</option>
          {[...new Set([...locations, ...(area ? [area] : [])])].map(location => <option key={location}>{location}</option>)}
        </select>
        <select aria-label="Receiver scenario" value={scenario} onChange={event => setScenario(event.target.value)}>
          <option value="all">All receivers</option><option value="available">Available now</option>
          <option value="cold">Cold storage</option><option value="need">High need</option><option value="favorites">Favorites</option>
        </select>
        <select aria-label="Receiver diet" value={diet} onChange={event => setDiet(event.target.value)}><option value="">Any diet</option>
          {DIETS.map(value => <option key={value} value={value}>{foodLabel(value)}</option>)}</select>
        <select aria-label="Receiver food category" value={category} onChange={event => setCategory(event.target.value)}><option value="">Any food</option>
          {CATEGORIES.map(value => <option key={value} value={value}>{foodLabel(value)}</option>)}</select>
        <select aria-label="Sort receivers" value={sort} onChange={event => setSort(event.target.value)}>
          <option value="distance">Nearest first</option><option value="trust">Highest trust</option></select>
        <div className="ml-auto flex gap-1">
          <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")} className={`view-toggle ${view === "map" ? "selected" : ""}`}><Map size={16}/>Map</button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={`view-toggle ${view === "list" ? "selected" : ""}`}><List size={16}/>List</button>
        </div>
      </div>
      {receivers.isPending ? <Skeleton className="h-64 w-full"/> : receivers.isError && !receivers.data ?
        <button className="view-toggle" onClick={() => void receivers.refetch()}>Retry receivers</button> :
        directory.length === 0 ? <Card>No receivers match these filters.</Card> : <div className={view === "map" ? "grid gap-3 lg:grid-cols-[1.3fr_1fr]" : ""}>
          {view === "map" && <div>
            <Suspense fallback={<Skeleton className="h-96 w-full"/>}><RescueMap pins={pins} showOnlyType="receiver"
              className="relative h-96 w-full overflow-hidden rounded-2xl border border-border"/></Suspense>
            <p className="mt-1 text-xs text-muted">Approximate locations</p>
          </div>}
          <div className={`grid content-start gap-2 ${view === "map" ? "lg:max-h-96 lg:overflow-auto" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
            {directory.map(receiver => <article key={receiver.id} className="flex items-center gap-2 rounded-xl border border-border bg-white p-3">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold">{receiver.name}</h4>
                <p className="text-xs text-muted">{receiver.locality} · {receiver.distance_km} km</p>
                <p className="mt-1 text-xs">{receiver.available ? `${receiver.available_servings} servings free` : "Paused"}
                  {receiver.refrigeration_available ? " · Cold storage" : ""} · {foodLabel(receiver.need_level)} need</p>
              </div>
              <Link aria-label={`Message ${receiver.name}`} title="Message" className="icon-button text-primary" to={`/messages?partner=${receiver.id}`}><MessageCircle size={18}/></Link>
              <FavoritePartner id={receiver.id} name={receiver.name}/>
            </article>)}
          </div>
        </div>}
    </section>
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <MealInsights/>
      <div className="space-y-3"><ContributionBanner/><Card className="flex flex-wrap gap-3">
        <Link className="view-toggle" to="/recognition">Appreciation</Link>
        <Link className="view-toggle" to="/donor/impact">Impact</Link>
      </Card></div>
    </div>
  </div></AppShell>;
}
