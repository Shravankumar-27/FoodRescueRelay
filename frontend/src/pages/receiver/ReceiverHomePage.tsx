import VerifiedBadge from "../../components/partners/VerifiedBadge";
import HandlingIcon from "../../components/ui/HandlingIcon";
import Metric from "../../components/ui/Metric";
import { DIETS, CATEGORIES, foodLabel } from "../../lib/food";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Map, List, MapPin, Utensils, CheckCircle2, Check, PauseCircle, Truck, ClipboardList, Heart, Award } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import RescueClock from "../../components/rescue/RescueClock";
import FavoritePartner, { useFavoritePartners } from "../../components/partners/FavoritePartner";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { CapacityData, OfferAvailable, ReceiverHistoryItem, ImpactSummary } from "../../types/api";
import { lazy, Suspense } from "react";

const RescueMap = lazy(() => import("../../components/map/RescueMap"));

const OFFER_POLL_MS = 3000;

const HANDLING_LABELS: Record<string, string> = {
  HOT_HELD: "Kept hot",
  REFRIGERATED: "Refrigerated",
  ROOM_TEMPERATURE: "Room temperature — confirm handling time with donor",
  OTHER: "Other",
  UNKNOWN: "Unknown",
  // Legacy labels
  AMBIENT: "Ambient",
  CHILLED: "Chilled",
  FROZEN: "Frozen",
  HOT: "Hot",
  PREPARED: "Prepared meals",
};

const REMOVING_CODES = ["OFFER_NOT_PENDING", "OFFER_EXPIRED"];

const CLAIM_MESSAGES: Record<string, string> = {
  RESCUE_ALREADY_CLAIMED: "This rescue was just accepted by another receiver.",
  OFFER_NOT_PENDING: "This offer is no longer available.",
  OFFER_EXPIRED: "This offer has expired. Another receiver may take it.",
};

function handlingLabel(t: string): string {
  return HANDLING_LABELS[t] ?? t.replace(/_/g, " ").toLowerCase();
}

function urgencyColor(pickupBy: string) {
  const mins = (new Date(pickupBy).getTime() - Date.now()) / 60000;
  if (mins > 60) return { bar: "bg-fresh", text: "text-fresh", label: `${Math.floor(mins)} min left` };
  if (mins > 20) return { bar: "bg-warn", text: "text-warn", label: `${Math.floor(mins)} min left — act soon` };
  return { bar: "bg-urgent animate-pulse", text: "text-urgent", label: `${Math.floor(mins)} min — urgent!` };
}

function OfferCard({
  offer,
  onClaim,
  onDecline,
  busy,
}: {
  offer: OfferAvailable;
  onClaim: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, Math.ceil((new Date(offer.pickup_by).getTime() - now - (offer.clock_offset_ms ?? 0)) / 1000));
  const urgency = urgencyColor(offer.pickup_by);

  const allergens = [...new Set(offer.food_items.flatMap(item => item.allergens))];
  const unknownAllergens = offer.food_items.some(item => item.allergen_info_unknown);
  return <Card className="relative flex h-full flex-col gap-3 overflow-hidden pt-5">
    <div className={`absolute inset-x-0 top-0 h-1 ${urgency.bar}`}/>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="font-bold">{offer.donor_name}</h3>
        {offer.donor_id_checked !== undefined && <VerifiedBadge checked={offer.donor_id_checked}/>}
        {offer.volunteer_alert && <p className="mt-1 text-xs font-semibold text-warn">Volunteer pickup alert</p>}
        {offer.urgent && <p className="mt-1 text-xs font-bold text-urgent">Urgent</p>}
        {offer.consume_by && <p className="mt-1 text-xs">Consume by {new Date(offer.consume_by).toLocaleString("en-IN")}</p>}
        <p className="mt-1 text-xs text-muted">Not a food-safety certification.</p>
        <p className="flex items-center gap-1 text-xs text-muted"><MapPin size={14}/>{offer.locality} · {offer.estimated_distance_km} km</p>
      </div>
      <FavoritePartner id={offer.donor_id} name={offer.donor_name}/>
    </div>
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-background p-2 text-sm">
      <span className="flex items-center gap-1.5"><Utensils size={16} className="text-primary"/>
        {offer.portion_only ? `Up to ${offer.suggested_servings} servings` : `${offer.total_servings} servings`}
      </span>
      <span className="justify-self-end"><RescueClock pickupBy={offer.pickup_by} offsetMs={offer.clock_offset_ms}/></span>
    </div>
    <div>
      <p className="text-sm font-semibold">{offer.food_items.map(item => item.name).join(", ")}</p>
      <p className="mt-1 flex items-center gap-2 text-xs text-muted"><HandlingIcon type={offer.handling_type}/>{handlingLabel(offer.handling_type)}</p>
      {(unknownAllergens || allergens.length > 0) && <p className="mt-1 text-xs text-warn">
        {[allergens.length ? `Listed allergens: ${allergens.join(", ")}` : "", unknownAllergens ? "Some allergens unknown" : ""].filter(Boolean).join(" · ")}
      </p>}
    </div>
    <details className="text-sm"><summary className="cursor-pointer font-semibold text-primary">Food and pickup details</summary>
      <ul className="my-2 list-inside list-disc text-muted">{offer.food_items.map((item, index) => <li key={index}>
        {item.name} · {foodLabel(item.dietary_type)} · {item.quantity_servings} posted
      </li>)}</ul>
      {offer.handling_notes && <p className="mb-2">{offer.handling_notes}</p>}
      <Link to={`/messages?partner=${offer.donor_id}`} className="mt-2 inline-block font-semibold text-primary">Message donor</Link>
    </details>
    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3">
      {offer.portion_only ? <Link to={`/messages?partner=${offer.donor_id}`} className="view-toggle bg-primaryLight">Ask for a portion</Link>
        : <Button variant="primary" onClick={onClaim} disabled={busy || remaining === 0}><Check size={16}/>Accept rescue</Button>}
      {!offer.portion_only && <Button variant="ghost" onClick={onDecline} disabled={busy}>Decline</Button>}
      {offer.is_direct_offer && !offer.portion_only && <span className="ml-auto text-xs font-semibold text-primary">Priority offer</span>}
    </div>
  </Card>;
}

export default function ReceiverHomePage() {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [diet, setDiet] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const favorites = useFavoritePartners();
  const history = useQuery({ queryKey: ["receiver", "history"], queryFn: () => apiRequest<ReceiverHistoryItem[]>("/offers/history", { token }), refetchInterval: 5000 });
  const impact = useQuery({ queryKey: ["impact", "summary"], queryFn: () => apiRequest<ImpactSummary>("/impact/summary", { token }), refetchInterval: 15000 });
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const [closed, setClosed] = useState<Record<string, string>>({});
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  const capacityQuery = useQuery({
    meta: { errorDisplay: "inline" },
    queryKey: ["receiver", "capacity"],
    queryFn: () => apiRequest<CapacityData>("/receivers/capacity", { token }),
    enabled: !!token,
  });

  const offersQuery = useQuery({
    meta: { errorDisplay: "inline" },
    queryKey: ["receiver", "offers"],
    queryFn: () => apiRequest<OfferAvailable[]>("/offers/available?include_portions=true", { token }),
    enabled: !!token,
    refetchInterval: OFFER_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const toggleMutation = useMutation({
    mutationFn: (available: boolean) => {
      const cap = capacityQuery.data;
      if (!cap) throw new Error("Capacity not loaded yet.");
      return apiRequest<CapacityData>("/receivers/capacity", {
        method: "PUT",
        token,
        body: {
          available,
          max_servings: cap.max_servings,
          available_servings: cap.available_servings,
          accepts_veg: cap.accepts_veg,
          accepts_non_veg: cap.accepts_non_veg,
          transport_available: cap.transport_available,
          need_level: cap.need_level,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receiver"] });
    },
  });

  const claimMutation = useMutation({
    mutationFn: (offerId: string) =>
      apiRequest<{ rescue_id: string; status: string; offer_id: string; pickup_by: string }>(
        `/offers/${offerId}/claim`,
        { method: "POST", token },
      ),
    onMutate: (offerId: string) => {
      setActiveOfferId(offerId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["receiver"] });
      navigate(`/receiver/pickup/${data.rescue_id}`);
    },
    onError: (err: unknown, offerId: string) => {
      const apiErr = err instanceof ApiError ? err : null;
      const message =
        (apiErr && CLAIM_MESSAGES[apiErr.code]) ||
        (err instanceof Error ? err.message : "Could not accept this rescue.");
      if (apiErr && REMOVING_CODES.includes(apiErr.code)) {
        setClosed((prev) => ({ ...prev, [offerId]: message }));
      }
      queryClient.invalidateQueries({ queryKey: ["receiver", "offers"] });
    },
    onSettled: () => setActiveOfferId(null),
  });

  const declineMutation = useMutation({
    mutationFn: (offerId: string) =>
      apiRequest<{ offer_id: string; status: string }>(`/offers/${offerId}/decline`, {
        method: "POST",
        token,
      }),
    onSuccess: (_data, offerId) => {
      setClosed((prev) => ({ ...prev, [offerId]: "You declined this rescue." }));
      toast.success("Offer declined.");
      queryClient.invalidateQueries({ queryKey: ["receiver", "offers"] });
    },
  });

  const offlineError =
    offersQuery.error instanceof ApiError && offersQuery.error.code === "OFFLINE";

  const capacity = capacityQuery.data;
  const known = offersQuery.data ?? [];
  const areas = [...new Set(known.map(offer => offer.locality).filter(Boolean))].sort();
  const offers = known.filter(offer => !closed[`open_${offer.rescue_id}`] && (!area || offer.locality === area)
    && (!favoritesOnly || favorites.data?.some(partner => partner.id === offer.donor_id))
    && offer.food_items.some(item => (!diet || item.dietary_type === diet) && (!category || item.food_category === category)));
  const activePickups = (history.data ?? []).filter(r => ["CLAIMED", "COLLECTED"].includes(r.status));

  return (
    <AppShell title="Available rescues" nav="receiver">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Receiver tools" className="grid w-full gap-2 sm:grid-cols-3">
            <Link to="/receiver/planner" className="tool-card"><span className="tool-icon"><ClipboardList size={22}/></span><span><strong className="block text-sm">Allocation planner</strong><span className="mt-1 block text-sm text-muted">Plan meals for your groups</span></span></Link>
            <Link to="/messages" className="tool-card"><span className="tool-icon"><Heart size={22}/></span><span><strong className="block text-sm">Saved donors</strong><span className="mt-1 block text-sm text-muted">Reconnect with your partners</span></span></Link>
            <Link to="/recognition" className="tool-card"><span className="tool-icon"><Award size={22}/></span><span><strong className="block text-sm">Appreciation</strong><span className="mt-1 block text-sm text-muted">Celebrate a shared delivery</span></span></Link>
          </nav>
        </div>
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Compatible listings" value={offersQuery.isPending ? "—" : offers.length} note="Based on your capacity & diet"/><Metric label="Active pickups" value={activePickups.length} note="Waiting for your next step"/><Metric label="Meals this month" value={impact.data?.meals_rescued_month ?? "—"} note="Confirmed deliveries"/><Metric label="Meals received" value={impact.data?.total_meals_rescued ?? "—"} note="All-time contribution"/></section>
        <div className={`grid items-stretch gap-4 ${activePickups.length ? "lg:grid-cols-2" : ""}`}>
        {activePickups.length > 0 && <Card><h3 className="mb-2 font-bold">Active pickups</h3>{activePickups.map(r => <Link key={r.rescue_id} to={`/receiver/pickup/${r.rescue_id}`} className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-border py-2 text-sm"><strong>{r.rescue_display_id}</strong><span className="font-semibold text-primary">{r.status === "CLAIMED" ? "Confirm collection" : "Record delivery"}</span></Link>)}</Card>}
        <div aria-live="polite">
          {known.some(offer => offer.volunteer_alert || (offer.is_direct_offer && offer.consume_by)) && <Card variant="warn">
            {known.some(offer => offer.volunteer_alert) && <p className="text-sm font-semibold">Volunteer pickup requested for a nearby rescue.</p>}
            {known.some(offer => offer.is_direct_offer && offer.consume_by) && <p className="text-sm font-semibold">You have a priority rescue offer.</p>}
          </Card>}
        </div>
        {offersQuery.isError && !offlineError && <div role="alert"><p className="mb-2 text-sm text-danger">{offersQuery.error.message}</p><button className="view-toggle" onClick={() => void offersQuery.refetch()}>Retry offers</button></div>}

        {offlineError && (
          <div role="alert" className="rounded-xl border border-warn/30 bg-warn/5 p-3 text-sm text-warn">
            You appear to be offline. Offers will refresh when the connection returns.
          </div>
        )}

        {/* Availability toggle card */}
        <Card>
          {capacityQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : capacity ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    {capacity.available ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true"/> : <PauseCircle className="h-4 w-4 shrink-0 text-muted" aria-hidden="true"/>}
                    {capacity.available ? "Available for pickups" : "Paused — not receiving offers"}
                  </p>
                  <p className="text-sm text-muted">
                    Up to {capacity.max_servings} servings, {capacity.available_servings} free now
                    {capacity.transport_available && <span className="ml-2 inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5" aria-hidden="true"/>Transport available</span>}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={capacity.available}
                  aria-label="Toggle availability"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(!capacity.available)}
                  className={`relative inline-flex h-11 w-16 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                    capacity.available ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`inline-block h-9 w-9 transform rounded-full bg-white shadow transition-transform ${
                      capacity.available ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : (
            <p role="alert" className="text-sm text-urgent">
              Could not load your capacity settings.
            </p>
          )}
        </Card>
        </div>

        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-semibold">Find the right food</h2><p className="mt-1 text-sm text-muted">Narrow available rescues to what your community needs.</p></div>
            <Link to="/receiver/capacity" className="text-sm font-semibold text-primary hover:underline">Edit food preferences</Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-semibold">Locality<select aria-label="Donor locality" value={area} onChange={event => setArea(event.target.value)}>
              <option value="">All localities</option>
              {[...new Set([...areas, ...(area ? [area] : [])])].map(location => <option key={location}>{location}</option>)}
            </select></label>
            <label className="grid gap-2 text-sm font-semibold">Dietary preference<select aria-label="Filter available food by diet" value={diet} onChange={event => setDiet(event.target.value)}>
              <option value="">All compatible diets</option>
              {DIETS.map(value => <option key={value} value={value}>{foodLabel(value)}</option>)}
            </select></label>
            <label className="grid gap-2 text-sm font-semibold">Food category<select aria-label="Filter available food by category" value={category} onChange={event => setCategory(event.target.value)}>
              <option value="">All food categories</option>
              {CATEGORIES.map(value => <option key={value} value={value}>{foodLabel(value)}</option>)}
            </select></label>
            <label className="flex min-h-12 items-center gap-2 self-end rounded-xl border border-border px-3 text-sm">
              <input type="checkbox" checked={favoritesOnly} onChange={event => setFavoritesOnly(event.target.checked)}/>
              Favorite donors
            </label>
          </div>
          {(area || diet || category || favoritesOnly) && <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm"><span className="text-muted">{offers.length} matching rescues</span><button type="button" className="font-semibold text-primary" onClick={() => {setArea(""); setDiet(""); setCategory(""); setFavoritesOnly(false);}}>Clear filters</button></div>}
        </Card>
        {/* List / Map toggle */}
        <div className="flex gap-1 rounded-xl bg-background p-1 w-fit">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "list" ? "bg-surface shadow-sm text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <List className="h-4 w-4" /> List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === "map" ? "bg-surface shadow-sm text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <Map className="h-4 w-4" /> Map
          </button>
        </div>

        {/* Map view */}
        {viewMode === "map" && (
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <div className="flex flex-col gap-2">
              <RescueMap
                showOnlyType="donor"
                pins={offers.filter(o => o.latitude !== undefined && o.longitude !== undefined).map(o => ({ id:o.id, lat:o.latitude!, lng:o.longitude!, label:o.donor_name || o.locality || "Donor", sublabel:`${o.total_servings} servings · ${o.locality}`, type:"donor" as const, badge:o.rank_badge, distance_km:o.estimated_distance_km, actionLabel:"See listing", onAction:() => setViewMode("list") }))}
                className="relative h-96 w-full rounded-2xl overflow-hidden border border-border"
              />
              <p className="text-xs text-muted text-center">
                Approximate locations
              </p>
            </div>
          </Suspense>
        )}

        {/* Offers section */}
        {viewMode === "list" && (
          <section data-tour="available-food" aria-labelledby="offers-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="offers-heading" className="text-lg font-semibold text-ink">
                Offers
                {offers.length > 0 && (
                  <span className="ml-2 rounded-full bg-primary text-white text-xs font-bold px-2 py-0.5">
                    {offers.length}
                  </span>
                )}
              </h2>
            </div>

            {offersQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : offers.length === 0 ? (
              <EmptyState
                title="No rescues need you right now"
                body="Check your availability or change the filters."
              />
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.rescue_id}
                    offer={offer}
                    busy={
                      (claimMutation.isPending && activeOfferId === `open_${offer.rescue_id}`) ||
                      declineMutation.isPending
                    }
                    onClaim={() => claimMutation.mutate(`open_${offer.rescue_id}`)}
                    onDecline={() => declineMutation.mutate(`open_${offer.rescue_id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
