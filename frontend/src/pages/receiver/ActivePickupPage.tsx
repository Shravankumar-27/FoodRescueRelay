import VerifiedBadge from "../../components/partners/VerifiedBadge";
import { useState, type FormEvent } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import ChatBox from "../../components/chat/ChatBox";
import RecognitionCard from "../../components/rescue/RecognitionCard";
import PartnerRating from "../../components/rescue/PartnerRating";
import PickupLogistics, { usePickupLogistics } from "../../components/rescue/PickupLogistics";
import MealFeedback from "../../components/rescue/MealFeedback";
import StatusTimeline from "../../components/rescue/StatusTimeline";
import StatusBadge from "../../components/rescue/StatusBadge";
import SafetyNotice from "../../components/rescue/SafetyNotice";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { apiRequest } from "../../lib/api";
import { foodLabel } from "../../lib/food";
import { formatDateTime } from "../../lib/format";
import { pollInterval } from "../../hooks/usePolling";
import type { RescueDetail } from "../../types/api";

const CHECKS = ["Holding conditions verified", "Packaging intact and transport ready",
  "Pickup window still open", "Ingredients and allergens checked"];

export default function ActivePickupPage() {
  const { rescueId = "" } = useParams();
  const { token } = useAuth();
  const client = useQueryClient();
  const notify = useToast();
  const navigate = useNavigate();
  const [releaseReason, setReleaseReason] = useState("");
  const [showRelease, setShowRelease] = useState(false);
  const [code, setCode] = useState("");
  const [collected, setCollected] = useState("");
  const [delivered, setDelivered] = useState("");
  const [rejected, setRejected] = useState("0");
  const [checks, setChecks] = useState<string[]>([]);
  const key = ["receiver", "rescue", rescueId];
  const path = `/rescues/${rescueId}`;
  const detail = useQuery({
    queryKey: key,
    queryFn: () => apiRequest<RescueDetail>(path, { token }),
    refetchInterval: query => pollInterval(query.state.data?.status),
  });
  const d = detail.data;
  const claimed = d?.status === "CLAIMED";
  const collectedStatus = d?.status === "COLLECTED";
  const isDelivered = d?.status === "DELIVERED";
  const hasPickupActions = claimed || collectedStatus || isDelivered;
  const deliveredMeals = d?.impact?.delivered_servings ?? 0;
  const allocationLink = <Link to={`/receiver/planner?rescue=${rescueId}`}
    className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">Open allocation planner</Link>;
  const logistics = usePickupLogistics(rescueId, claimed);
  const ready = logistics.data && Object.values(logistics.data.resources).every(resource => !resource.needs_help);
  const release = useMutation({
    mutationFn: () => apiRequest(`${path}/release`, { method: "POST", token, body: { reason: releaseReason } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["receiver"] });
      notify.success("Pickup released.");
      navigate("/receiver");
    },
  });
  const checkIn = useMutation({
    mutationFn: () => apiRequest(`${path}/on-the-way`, { method: "POST", token }),
    onSettled: () => void detail.refetch(),
  });
  const change = useMutation({
    mutationFn: ({ action, body }: { action: "collect" | "deliver"; body: unknown }) =>
      apiRequest<{ rescue: RescueDetail }>(`${path}/${action}`, { method: "POST", token, body }),
    onSuccess: async ({ rescue }, { action }) => {
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, rescue);
      setCode("");
      notify.success(action === "deliver" ? "Delivery confirmed." : "Collection confirmed.");
      for (const queryKey of [["receiver", "history"], ["receiver", "capacity"], ["receiver", "offers"], ["rescue", rescueId],
        ["rescues"], ["impact"], ["contribution"], ["allocation-batches"], ["allocation", rescueId], ["leaderboard"]]) {
        void client.invalidateQueries({ queryKey });
      }
    },
    onError: () => {
      void detail.refetch();
      void client.invalidateQueries({ queryKey: ["pickup-logistics", rescueId] });
    },
  });

  function collect(event: FormEvent) {
    event.preventDefault();
    if (!ready) return notify.error("Confirm containers and transport first.");
    if (checks.length !== CHECKS.length) return notify.error("Complete each pickup check.");
    if (!/^\d{4}$/.test(code)) return notify.error("Enter the donor’s four-digit pickup code.");
    const quantity = Number(collected);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > (d?.total_servings ?? 0)) {
      return notify.error("Enter a whole number up to the posted servings.");
    }
    change.mutate({ action: "collect", body: { pickup_code: code, collected_servings: quantity } });
  }

  function deliver(event: FormEvent) {
    event.preventDefault();
    const meals = Number(delivered);
    const waste = Number(rejected || 0);
    if (!delivered.trim() || !Number.isInteger(meals) || !Number.isInteger(waste) || meals < 0 || waste < 0
        || meals + waste > (d?.collected_servings ?? 0)) {
      return notify.error(`Servings delivered and rejected must total at most ${d?.collected_servings ?? 0}.`);
    }
    change.mutate({ action: "deliver", body: { delivered_servings: meals, rejected_servings: waste } });
  }

  return (
    <AppShell title="Pickup" nav="receiver" backTo="/receiver">
      {detail.isPending && <Skeleton className="h-72 w-full"/>}
      {detail.isError && <Button variant="secondary" onClick={() => void detail.refetch()}>Retry pickup details</Button>}
      {d && <div className="grid gap-4">
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{d.donor_organization_name || d.display_id}</h2>
              {d.donor_id_checked !== undefined && <VerifiedBadge checked={d.donor_id_checked}/>}
              <p className="text-sm text-muted">{d.display_id} · {d.total_servings} servings · {d.locality}</p>
            </div>
            <StatusBadge status={d.status}/>
          </div>
          {d.consume_by && <p className="mb-3 text-sm">Consume by {formatDateTime(d.consume_by)}. {d.urgent && "Urgent."}</p>}
          <p className="mb-3 text-sm text-muted">Not a food-safety certification.</p>
          <StatusTimeline status={d.status} events={d.status_events ?? []}/>
        </Card>

        {claimed && d.consume_by && <Card className="flex flex-wrap items-center justify-between gap-3">
          {d.on_the_way_at ? <p className="text-sm font-semibold">On the way · {formatDateTime(d.on_the_way_at)}</p> : <>
            {d.check_in_due && <p className="text-sm">Check in by {formatDateTime(d.check_in_due)} to keep this claim.</p>}
            <Button disabled={checkIn.isPending} onClick={() => checkIn.mutate()}>Mark on the way</Button>
          </>}
        </Card>}
        {claimed && <PickupLogistics rescueId={rescueId} side="receiver"/>}
        <div className="grid gap-4 lg:grid-cols-2">
          {claimed && <Card>
            <h3 className="text-lg font-bold">Confirm collection</h3>
            <p className="mt-1 text-sm">{d.private_address || d.locality} · by {formatDateTime(d.pickup_by)}</p>
            <form onSubmit={collect} noValidate className="mt-4 space-y-3">
              <fieldset className="grid gap-2 sm:grid-cols-2">
                <legend className="mb-2 text-sm font-semibold">Pickup checks</legend>
                {CHECKS.map(label => <label key={label} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                  <input type="checkbox" checked={checks.includes(label)} onChange={event => setChecks(event.target.checked
                    ? [...checks, label] : checks.filter(check => check !== label))}/>{label}
                </label>)}
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Pickup code" hint="Ask the donor for the four-digit code." inputMode="numeric"
                  className="w-full bg-primaryLight/60 font-mono font-bold tracking-widest" maxLength={4}
                  autoComplete="off" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))}/>
                <Input label="Servings collected" type="number" min={1} max={d.total_servings}
                  value={collected} onChange={event => setCollected(event.target.value)}/>
              </div>
              {!ready && <p className="text-sm text-warn">{logistics.isPending ? "Checking pickup logistics…" : "Confirm containers and transport above."}</p>}
              <Button type="submit" disabled={!ready || change.isPending}>Confirm collection</Button>
            </form>
            <button type="button" className="mt-3 text-sm font-semibold text-primary underline" onClick={() => setShowRelease(!showRelease)}>Release pickup</button>
            {showRelease && <form className="mt-3 space-y-2" onSubmit={event => { event.preventDefault(); release.mutate(); }}>
              <label className="block text-sm font-semibold">Reason<textarea value={releaseReason} onChange={event => setReleaseReason(event.target.value)}
                minLength={3} maxLength={300} required className="mt-1 w-full rounded-lg border border-border p-2"/></label>
              <Button type="submit" variant="danger" disabled={release.isPending || releaseReason.trim().length < 3}>Confirm release</Button>
            </form>}
          </Card>}

          {collectedStatus && <Card>
            <h3 className="text-lg font-bold">Record delivery</h3>
            <p className="mt-1 text-sm text-muted">{d.collected_servings} servings collected</p>
            <form onSubmit={deliver} noValidate className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Servings delivered" type="number" min={0} value={delivered} onChange={event => setDelivered(event.target.value)}/>
                <Input label="Servings rejected" type="number" min={0} value={rejected} onChange={event => setRejected(event.target.value)}/>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button type="submit" disabled={change.isPending}>{change.isPending ? "Recording…" : "Confirm delivery"}</Button>
                {allocationLink}
              </div>
            </form>
          </Card>}

          {isDelivered && <Card variant="fresh">
            <h3 className="text-xl font-bold">{deliveredMeals} meals delivered</h3>
            {!!d.impact?.rejected_servings && <p className="text-sm text-muted">{d.impact.rejected_servings} servings rejected</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link to="/receiver/impact" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline">View impact</Link>
              {allocationLink}
            </div>
          </Card>}
          <Card className={hasPickupActions ? "" : "lg:col-span-2"}>
            <h3 className="mb-2 font-bold">Food and handling</h3>
            {d.food_items.map((item, index) => <div key={index} className="border-t border-border py-2 text-sm">
              <p className="font-semibold">{item.name} · {item.quantity_servings} servings</p>
              <p className="text-muted">{foodLabel(item.dietary_type)} · {foodLabel(item.food_category ?? "COOKED_MEAL")}</p>
              <p>{item.allergen_info_unknown ? "Allergens unknown. Verify before serving." : `Listed allergens: ${item.allergens.join(", ") || "none provided"}`}</p>
            </div>)}
            <p className="text-sm">{foodLabel(d.handling_type)} · Prepared {formatDateTime(d.prepared_at)}</p>
            {d.handling_notes && <p className="mt-1 text-sm">{d.handling_notes}</p>}
            <div className="mt-3"><SafetyNotice/></div>
          </Card>
        </div>
        {isDelivered && deliveredMeals > 0 && <div className="grid gap-4 lg:grid-cols-2">
          <RecognitionCard rescueId={rescueId} delivered={deliveredMeals}/>
          <MealFeedback key={rescueId} rescueId={rescueId}/>
        </div>}
        {hasPickupActions && <div className={isDelivered ? "grid gap-4 lg:grid-cols-2" : ""}>
          {isDelivered && <PartnerRating rescueId={rescueId}/>}
          <ChatBox rescueId={rescueId} recipientName={d.donor_organization_name}/>
        </div>}
      </div>}
    </AppShell>
  );
}
