import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { CapacityData, OfferAvailable } from "../../types/api";

const OFFER_POLL_MS = 3000;

const HANDLING_LABELS: Record<string, string> = {
  AMBIENT: "Ambient (room temperature)",
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
  const [mountedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.floor((now - mountedAt) / 1000);
  const remaining = Math.max(0, offer.seconds_to_respond - elapsed);

  if (closedMessage) {
    return (
      <Card>
        <p role="alert" className="text-sm text-red-700">
          {closedMessage}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <RescueClock pickupBy={offer.pickup_by} />

        <div>
          <h3 className="text-base font-semibold">{offer.locality}</h3>
          <p className="text-sm text-slate-600">
            Exact address is shared only after you accept.
          </p>
        </div>

        <p className="text-lg font-semibold">{offer.total_servings} servings</p>

        <ul className="flex flex-col gap-1 text-sm">
          {offer.food_items.map((item) => (
            <li key={item.name}>
              {item.name}{" "}
              <span className="text-slate-600">({item.dietary_type})</span>
            </li>
          ))}
        </ul>

        <p className="text-sm">Handling: {handlingLabel(offer.handling_type)}</p>

        {offer.food_items.some((i) => i.allergen_info_unknown) ? (
          <p className="text-sm font-medium text-amber-800">
            Allergen information unavailable. Receiver must independently assess
            suitability.
          </p>
        ) : offer.food_items.some((i) => i.allergens.length > 0) ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Allergens:</span>
            {offer.food_items.flatMap((i) => i.allergens).map((a) => (
              <Chip key={a} tone="warn">
                {a}
              </Chip>
            ))}
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-slate-600">Estimated distance</dt>
            <dd>{offer.estimated_distance_km} km</dd>
          </div>
          <div>
            <dt className="text-slate-600">Estimated travel time (not live traffic)</dt>
            <dd>{formatMinutes(offer.estimated_travel_minutes)}</dd>
          </div>
        </dl>

        <ul className="flex flex-col gap-1 text-sm">
          {offer.why.map((reason) => (
            <li key={reason}>✓ {reason}</li>
          ))}
        </ul>

        <p className="text-sm font-medium" aria-live="polite">
          Respond within {remaining} s
        </p>

        {claimError ? (
          <p role="alert" className="text-sm text-red-700">
            {claimError}
          </p>
        ) : null}

        <SafetyNotice />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" onClick={onClaim} disabled={busy}>
            Accept rescue
          </Button>
          <Button variant="secondary" onClick={onDecline} disabled={busy}>
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
      queryClient.invalidateQueries({ queryKey: ["receiver", "capacity"] });
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
  const offers = offersQuery.data ?? [];

  return (
    <AppShell title="Available rescues" nav="receiver">
      <div className="flex flex-col gap-4">
        {offlineError ? (
          <div role="alert" className="rounded-md bg-amber-100 p-3 text-sm text-amber-900">
            You appear to be offline. Offers will refresh when the connection returns.
          </div>
        ) : null}

        <Card>
          {capacityQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : capacity ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Available tonight</p>
                  <p className="text-sm text-slate-600">
                    Up to {capacity.max_servings} servings, {capacity.available_servings} free now.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={capacity.available}
                  aria-label="Available tonight"
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate(!capacity.available)}
                  className={`relative inline-flex h-11 w-16 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                    capacity.available ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-9 w-9 transform rounded-full bg-white shadow transition-transform ${
                      capacity.available ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              {toggleMutation.isError ? (
                <p role="alert" className="text-sm text-red-700">
                  {toggleMutation.error instanceof Error
                    ? toggleMutation.error.message
                    : "Could not update availability."}
                </p>
              ) : null}
            </div>
          ) : (
            <p role="alert" className="text-sm text-red-700">
              Could not load your capacity settings.
            </p>
          )}
        </Card>

        <section aria-labelledby="offers-heading" className="flex flex-col gap-3">
          <h2 id="offers-heading" className="text-lg font-semibold">
            Offers
          </h2>

          {offersQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : offers.length === 0 && Object.keys(closed).length === 0 ? (
            <EmptyState
              title="No rescues need you right now."
              body='Keep "Available tonight" on to receive offers.'
            />
          ) : (
            <div className="flex flex-col gap-4" aria-live="polite">
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
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
