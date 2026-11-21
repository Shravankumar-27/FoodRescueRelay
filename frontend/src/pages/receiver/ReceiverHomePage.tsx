import Metric from "../../components/ui/Metric";
import { DIETS, CATEGORIES, foodLabel } from "../../lib/food";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Map, List, Clock, MapPin, Utensils, AlertCircle, CheckCircle2 } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Chip from "../../components/ui/Chip";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import RescueClock from "../../components/rescue/RescueClock";
import SafetyNotice from "../../components/rescue/SafetyNotice";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatMinutes } from "../../lib/format";
import type { CapacityData, OfferAvailable, ReceiverHistoryItem, ImpactSummary } from "../../types/api";
import { lazy, Suspense } from "react";

const RescueMap = lazy(() => import("../../components/map/RescueMap"));

const OFFER_POLL_MS = 3000;

const HANDLING_LABELS: Record<string, string> = {
  HOT_HELD: "🔥 Kept hot",
  REFRIGERATED: "❄️ Refrigerated",
  ROOM_TEMPERATURE: "Room temperature — confirm handling time with donor",
  OTHER: "📦 Other",
  UNKNOWN: "❓ Unknown",
  // Legacy labels
  AMBIENT: "🌡️ Ambient",
  CHILLED: "❄️ Chilled",
  FROZEN: "🧊 Frozen",
  HOT: "🔥 Hot",
  PREPARED: "🍱 Prepared meals",
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

function MatchScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-muted truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-background">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </div>
      <span className="w-8 text-right text-muted">{Math.round(score * 100)}%</span>
    </div>
  );
}

function OfferCard({
  offer,
  claimError,
  closedMessage,
  onClaim,
  onDecline,
  busy,
}: {
  offer: OfferAvailable;
  claimError?: string;
  closedMessage?: string;
  onClaim: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, Math.ceil((new Date(offer.expires_at).getTime() - now) / 1000));
  const urgency = urgencyColor(offer.pickup_by);

  if (closedMessage) {
    return (
      <Card>
        <p role="alert" className="text-sm text-muted">
          {closedMessage}
        </p>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Urgency colour bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${urgency.bar}`} />

      <div className="flex flex-col gap-3 pt-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted shrink-0" />
              <h3 className="font-semibold text-ink">{offer.donor_name || offer.locality}</h3>
            </div>
            <p className="text-xs text-muted mt-0.5">{offer.locality} · {offer.rank_badge} partner · address after acceptance</p>
          </div>
          <span className={`text-xs font-semibold shrink-0 ${urgency.text}`}>
            {urgency.label}
          </span>
        </div>

        {/* Key stats row */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Utensils className="h-4 w-4 text-primary" />
            <span className="font-bold text-ink">{offer.total_servings}</span>
            <span className="text-muted">servings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-info" />
            <span className="font-medium">{offer.estimated_distance_km} km away</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted" />
            <span className="text-muted">{formatMinutes(offer.estimated_travel_minutes)} travel</span>
          </div>
        </div>

        {/* Food list */}
        <ul className="text-sm text-muted space-y-0.5">
          {offer.food_items.map((item) => (
            <li key={item.name} className="flex items-center gap-2">
              <span className="text-ink font-medium">{item.name}</span>
              <span>({item.dietary_type.replace("_", "-")})</span>
            </li>
          ))}
        </ul>

        <Link to={`/messages?partner=${offer.donor_id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">Ask the donor about this food</Link>
        {/* Handling */}
        <p className="text-sm text-muted">{handlingLabel(offer.handling_type)}</p>

        {/* Allergens */}
        {offer.food_items.some((i) => i.allergen_info_unknown) ? (
          <div className="flex items-center gap-2 text-sm text-warn">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Allergen info unavailable — assess independently</span>
          </div>
        ) : offer.food_items.some((i) => i.allergens.length > 0) ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">Allergens:</span>
            {offer.food_items.flatMap((i) => i.allergens).map((a) => (
              <Chip key={a} tone="warn">{a}</Chip>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-fresh">
            <CheckCircle2 className="h-4 w-4" />
            <span>No allergens listed</span>
          </div>
        )}

        {/* Match score breakdown (expandable) */}
        {offer.why && offer.why.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {expanded ? "Hide" : "Show"} match details
            </button>
            {expanded && (
              <div className="mt-2 flex flex-col gap-1.5 rounded-xl bg-background p-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Why you matched</p>
                <MatchScoreBar label="Proximity" score={offer.factors?.proximity ?? 0} />
                <MatchScoreBar label="Current need" score={offer.factors?.need ?? 0} />
                <MatchScoreBar label="Time window" score={offer.factors?.urgency ?? 0} />
                {offer.why.map((w) => (
                  <p key={w} className="text-xs text-muted">✓ {w}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center gap-2">
          <RescueClock pickupBy={offer.pickup_by} />
          <span className={`text-sm font-semibold ${remaining < 30 ? "text-urgent animate-pulse" : "text-muted"}`}>
            {offer.is_direct_offer ? `Priority invitation: ${Math.floor(remaining / 60)}m ${remaining % 60}s` : "Open to compatible receivers"}
          </span>
        </div>

        {claimError && (
          <p role="alert" className="text-sm text-urgent">
            {claimError}
          </p>
        )}

        <SafetyNotice />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" onClick={onClaim} disabled={busy || remaining === 0} className="min-h-[44px] flex-1">
            ✓ Accept rescue
          </Button>
          <Button variant="secondary" onClick={onDecline} disabled={busy} className="min-h-[44px]">
            Can&apos;t take this
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function ReceiverHomePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [diet, setDiet] = useState("");
  const [category, setCategory] = useState("");
  const history = useQuery({ queryKey: ["receiver", "history"], queryFn: () => apiRequest<ReceiverHistoryItem[]>("/offers/history", { token }), refetchInterval: 5000 });
  const impact = useQuery({ queryKey: ["impact", "summary"], queryFn: () => apiRequest<ImpactSummary>("/impact/summary", { token }), refetchInterval: 15000 });
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});
  const [closed, setClosed] = useState<Record<string, string>>({});
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  const capacityQuery = useQuery({
    queryKey: ["receiver", "capacity"],
    queryFn: () => apiRequest<CapacityData>("/receivers/capacity", { token }),
    enabled: !!token,
  });

  const offersQuery = useQuery({
    queryKey: ["receiver", "offers"],
    queryFn: () => apiRequest<OfferAvailable[]>("/offers/available", { token }),
    enabled: !!token,
    refetchInterval: OFFER_POLL_MS,
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
      setClaimErrors((prev) => {
        const next = { ...prev };
        delete next[offerId];
        return next;
      });
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
      } else {
        setClaimErrors((prev) => ({ ...prev, [offerId]: message }));
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
      queryClient.invalidateQueries({ queryKey: ["receiver", "offers"] });
    },
    onError: (err: unknown, offerId: string) => {
      setClaimErrors((prev) => ({
        ...prev,
        [offerId]: err instanceof Error ? err.message : "Could not decline this offer.",
      }));
    },
  });

  const offlineError =
    offersQuery.error instanceof ApiError && offersQuery.error.code === "OFFLINE";

  const capacity = capacityQuery.data;
  const offers = (offersQuery.data ?? []).filter(o => (!diet || o.food_items.every(f => f.dietary_type === diet)) && (!category || o.food_items.every(f => f.food_category === category)));
  const activePickups = (history.data ?? []).filter(r => ["CLAIMED", "COLLECTED"].includes(r.status));

  return (
    <AppShell title="Available rescues" nav="receiver">
      <div className="flex flex-col gap-4">
        <section className="harvest-hero"><p className="eyebrow text-white/70">Community receiver · Hyderabad pilot</p><h2 className="mt-2 text-3xl font-extrabold">Good food is closer<br/>than you think.</h2><p className="mt-3 text-sm text-white/80">Find food that fits your community. Confirm the details, collect on time, and record the meals delivered.</p></section>
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Compatible listings" value={offersQuery.isPending ? "—" : offers.length} note="Based on your capacity & diet"/><Metric label="Active pickups" value={activePickups.length} note="Waiting for your next step"/><Metric label="Meals this month" value={impact.data?.meals_rescued_month ?? "—"} note="Confirmed deliveries"/><Metric label="Meals received" value={impact.data?.total_meals_rescued ?? "—"} note="All-time contribution"/></section>
        {activePickups.length > 0 && <Card><h3 className="mb-2 font-bold">Continue your pickups</h3>{activePickups.map(r => <Link key={r.rescue_id} to={`/receiver/pickup/${r.rescue_id}`} className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-t border-border py-3 text-sm"><strong>{r.rescue_display_id}</strong><span className="font-semibold text-primary">{r.status === "CLAIMED" ? "Confirm collection" : "Record delivery"}</span></Link>)}</Card>}
        {offersQuery.isError && !offlineError && <p role="alert" className="rounded-xl bg-dangerLight p-3 text-sm text-danger">{offersQuery.error.message} <button className="underline" onClick={() => void offersQuery.refetch()}>Retry</button></p>}

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
                  <p className="font-semibold text-ink">
                    {capacity.available ? "✅ You're available" : "⏸ Paused — not receiving offers"}
                  </p>
                  <p className="text-sm text-muted">
                    Up to {capacity.max_servings} servings, {capacity.available_servings} free now
                    {capacity.transport_available ? " · 🚗 Transport available" : ""}
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
              {toggleMutation.isError && (
                <p role="alert" className="text-sm text-urgent">
                  {toggleMutation.error instanceof Error
                    ? toggleMutation.error.message
                    : "Could not update availability."}
                </p>
              )}
            </div>
          ) : (
            <p role="alert" className="text-sm text-urgent">
              Could not load your capacity settings.
            </p>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-2"><select aria-label="Filter available food by diet" value={diet} onChange={e => setDiet(e.target.value)}><option value="">All compatible diets</option>{DIETS.map(d => <option key={d} value={d}>{foodLabel(d)}</option>)}</select><select aria-label="Filter available food by category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All food categories</option>{CATEGORIES.map(c => <option key={c} value={c}>{foodLabel(c)}</option>)}</select><Link to="/receiver/capacity" className="min-h-12 inline-flex items-center text-sm font-semibold text-primary">Edit food preferences</Link></div>
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
                className="h-72 w-full rounded-2xl overflow-hidden border border-border"
              />
              <p className="text-xs text-muted text-center">
                Donor locations only · approximate locations · synthetic Hyderabad demo
              </p>
            </div>
          </Suspense>
        )}

        {/* Offers section */}
        {viewMode === "list" && (
          <section aria-labelledby="offers-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="offers-heading" className="text-lg font-semibold text-ink">
                Offers
                {offers.length > 0 && (
                  <span className="ml-2 rounded-full bg-primary text-white text-xs font-bold px-2 py-0.5">
                    {offers.length}
                  </span>
                )}
              </h2>
              <span className="text-xs text-muted">Auto-refreshes every 3s</span>
            </div>

            {offersQuery.isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : offers.length === 0 && Object.keys(closed).length === 0 ? (
              <EmptyState
                title="No rescues need you right now"
                body='Keep "Available" on to receive offers. New listings auto-refresh every 3 seconds.'
              />
            ) : (
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    claimError={claimErrors[offer.id]}
                    closedMessage={closed[offer.id]}
                    busy={
                      (claimMutation.isPending && activeOfferId === offer.id) ||
                      declineMutation.isPending
                    }
                    onClaim={() => claimMutation.mutate(offer.id)}
                    onDecline={() => declineMutation.mutate(offer.id)}
                  />
                ))}
                {Object.entries(closed).map(([id, msg]) => (
                  <Card key={id}>
                    <p className="text-sm text-muted">{msg}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
