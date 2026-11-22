import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, Copy, Handshake, Package, Repeat2, Route, Utensils } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/ui/Skeleton";
import ChatBox from "../../components/chat/ChatBox";
import MatchExplanation from "../../components/rescue/MatchExplanation";
import AllocationPuzzle from "../../components/rescue/AllocationPuzzle";
import PickupLogistics from "../../components/rescue/PickupLogistics";
import PartnerRating from "../../components/rescue/PartnerRating";
import RecognitionCard from "../../components/rescue/RecognitionCard";
import RescueClock from "../../components/rescue/RescueClock";
import StatusBadge from "../../components/rescue/StatusBadge";
import StatusTimeline from "../../components/rescue/StatusTimeline";
import HowWeCalculate from "../../components/impact/HowWeCalculate";
import ImpactMetric from "../../components/impact/ImpactMetric";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { pollInterval } from "../../hooks/usePolling";
import { apiRequest } from "../../lib/api";
import { foodLabel } from "../../lib/food";
import { formatDateTime, formatMinutes } from "../../lib/format";
import type { MatchCandidate, RescueDetail } from "../../types/api";

const MATCHABLE = ["POSTED", "MATCHING", "OFFERED"];

export default function ActiveRescuePage() {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const notify = useToast();
  const client = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const key = ["rescue", id];
  const path = `/rescues/${id}`;

  const rescue = useQuery({
    queryKey: key,
    queryFn: () => apiRequest<RescueDetail>(path, { token }),
    enabled: !!token && !!id,
    refetchInterval: query => pollInterval(query.state.data?.status),
  });
  const d = rescue.data;
  const status = d?.status;
  const matchable = !!status && MATCHABLE.includes(status);
  const cancellable = matchable || status === "CLAIMED";
  const matches = useQuery({
    queryKey: ["matches", id],
    queryFn: () => apiRequest<MatchCandidate[]>(`${path}/matches`, { token }),
    enabled: !!token && matchable,
    refetchInterval: pollInterval(status),
  });

  async function refreshRescue(data: RescueDetail) {
    await client.cancelQueries({ queryKey: key });
    client.setQueryData(key, data);
    void client.invalidateQueries({ queryKey: ["matches", id] });
    void client.invalidateQueries({ queryKey: ["rescues", "mine"] });
  }

  const dispatch = useMutation({
    mutationFn: () => apiRequest<RescueDetail>(`${path}/dispatch`, { method: "POST", token }),
    onSuccess: refreshRescue,
  });
  const replacement = useMutation({
    mutationFn: (receiver: string) => apiRequest<RescueDetail>(`${path}/replacement/${receiver}`, { method: "POST", token }),
    onSuccess: async data => { await refreshRescue(data); notify.success("Replacement offer sent."); },
    onError: () => void rescue.refetch(),
  });
  const cancel = useMutation({
    mutationFn: () => apiRequest<RescueDetail>(`${path}/cancel`, { method: "POST", token, body: { reason: cancelReason } }),
    onSuccess: async data => { await refreshRescue(data); setShowCancel(false); notify.success("Rescue cancelled."); },
    onError: () => void rescue.refetch(),
  });

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      notify.success("Pickup code copied.");
    } catch {
      notify.error("Couldn’t copy the pickup code. Select and copy it manually.");
    }
  }

  const release = [...(d?.status_events ?? [])].reverse().find(event => event.reason?.startsWith("receiver_released: "));
  const compatible = matches.data?.filter(candidate => candidate.feasible) ?? [];
  const replacements = compatible.filter(candidate => candidate.replacement_available && candidate.receiver_id);
  const needsRetry = d && matchable && (d.matching_error || (status === "POSTED" && Date.now() - Date.parse(d.created_at) > 120000));
  const minutes = d ? (Date.parse(d.pickup_by) - Date.now()) / 60000 : 0;
  const urgency = minutes > 60 ? "border-t-primary" : minutes > 20 ? "border-t-warn" : "border-t-urgent";

  return <AppShell title="Rescue" nav="donor" backTo="/donor">
    <div className="space-y-4">
      {rescue.isPending && <Skeleton className="h-64 w-full"/>}
      {rescue.isError && <Button variant="secondary" onClick={() => void rescue.refetch()}>Retry rescue</Button>}
      {d && <>
        <Card className={`overflow-hidden border-t-4 ${cancellable ? urgency : "border-t-primary"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Rescue {d.display_id}</p>
              <h2 className="mt-1 text-xl font-bold text-ink sm:text-2xl">{d.food_items[0]?.name ?? "Food donation"}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span aria-live="polite"><StatusBadge status={d.status}/></span>
              {cancellable && <RescueClock pickupBy={d.pickup_by}/>}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-background p-2 min-[470px]:grid-cols-3">
            <div className="min-w-0 rounded-lg px-3 py-2"><dt className="text-xs text-muted">Portions</dt><dd className="mt-0.5 text-sm font-semibold">{d.total_servings} servings</dd></div>
            <div className="min-w-0 rounded-lg px-3 py-2"><dt className="text-xs text-muted">Locality</dt><dd className="mt-0.5 break-words text-sm font-semibold">{d.locality || "—"}</dd></div>
            <div className="min-w-0 rounded-lg px-3 py-2"><dt className="text-xs text-muted">Pickup deadline</dt><dd className="mt-0.5 text-sm font-semibold">{formatDateTime(d.pickup_by)}</dd></div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><Route size={18} className="text-primary"/>Rescue timeline</h3>
          <StatusTimeline events={d.status_events ?? []} status={d.status}/>
        </Card>

        {release && <Card variant="warn">
          <h3 className="font-semibold">Pickup released</h3>
          <p className="mt-1 text-sm">{release.reason?.slice("receiver_released: ".length)}</p>
        </Card>}

        <div className="grid items-start gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          <Card className="min-w-0">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><Utensils size={18} className="text-primary"/>Food and handling</h3>
            <ul className="divide-y divide-border">
              {d.food_items.map((item, index) => <li key={index} className="py-2.5 first:pt-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-sm text-muted">{item.quantity_servings} servings</p>
                </div>
                <p className="mt-0.5 text-sm text-muted">{foodLabel(item.dietary_type)} · {item.allergen_info_unknown ? "Allergens unknown"
                  : item.allergens.length ? `Allergens: ${item.allergens.join(", ")}` : "No allergens listed"}</p>
              </li>)}
            </ul>
            <div className="mt-2 rounded-xl bg-background p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold"><Package size={16} className="text-primary"/>{foodLabel(d.handling_type)}</p>
              {d.handling_notes && <p className="mt-1 text-muted">{d.handling_notes}</p>}
            </div>
            {d.safety_notice && <p className="mt-3 text-xs text-muted">{d.safety_notice}</p>}
          </Card>

          {matchable ? <AllocationPuzzle key={id} rescueId={id}>
            <div className="mt-3">
            {d.pending_receiver && <div className="rounded-xl bg-primaryLight/60 p-3">
              <p className="text-xs font-semibold text-primary">Offer sent</p><p className="mt-0.5 text-sm font-semibold">{d.pending_receiver}</p>
            </div>}
            {matches.isPending ? <Skeleton className="mt-3 h-12 w-full"/> : matches.isError ?
              <Button variant="secondary" onClick={() => void matches.refetch()}>Retry matching details</Button> :
              <p className="my-3 text-sm text-muted">{compatible.length ? `${compatible.length} compatible receiver${compatible.length === 1 ? "" : "s"}` : "No compatible receiver available yet."}</p>}
            {!!release && !!replacements.length && <div className="mb-3 divide-y divide-border">
              <h4 className="text-sm font-semibold">Replacement receivers</h4>
              {replacements.map(candidate => <div key={candidate.receiver_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>{candidate.receiver_name}</span>
                <Button size="sm" variant="secondary" disabled={replacement.isPending || candidate.receiver_name === d.pending_receiver}
                  onClick={() => candidate.receiver_id && replacement.mutate(candidate.receiver_id)}>
                  {candidate.receiver_name === d.pending_receiver ? "Offer sent" : "Send offer"}
                </Button>
              </div>)}
            </div>}
            {!!matches.data?.length && <details className="rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-primary">
                View match details<ChevronDown size={15}/>
              </summary>
              <div className="max-h-80 overflow-y-auto border-t border-border p-3"><MatchExplanation candidates={matches.data}/></div>
            </details>}
            {needsRetry && <Button className="mt-3" variant="secondary" disabled={dispatch.isPending} onClick={() => dispatch.mutate()}>Retry matching</Button>}
            </div>
          </AllocationPuzzle> : status === "DELIVERED" ? <Card className="min-w-0">
            <h3 className="mb-3 text-base font-semibold">Delivery impact</h3>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-background p-3 sm:grid-cols-3">
              <ImpactMetric label="Meals rescued" value={String(d.impact?.delivered_servings ?? 0)}/>
              <ImpactMetric label="Rejected servings" value={String(d.impact?.rejected_servings ?? 0)}/>
              <ImpactMetric label="Completion time" value={d.impact?.minutes_to_delivery == null ? "—" : formatMinutes(d.impact.minutes_to_delivery)}/>
            </div>
            {!!d.impact?.delivered_servings && <p className="my-3 text-sm text-muted">Estimated {(d.impact.delivered_servings * 0.4 * 2.5).toFixed(1)} kg CO₂e avoided</p>}
            <HowWeCalculate/>
          </Card> : <Card className="min-w-0">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><Handshake size={18} className="text-primary"/>Pickup</h3>
            {d.claimed_receiver && <div className="rounded-xl bg-background p-3">
              <p className="text-xs text-muted">Receiver</p>
              <p className="text-sm font-semibold">{d.claimed_receiver.name}</p>
              {d.claimed_receiver.locality && <p className="text-sm text-muted">{d.claimed_receiver.locality}</p>}
            </div>}
            {status === "CLAIMED" && <div className="mt-3">
              <p className="text-sm font-semibold">Pickup code</p>
              {d.pickup_code ? <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-primary/40 bg-primaryLight/60 p-4">
                <p aria-label="Pickup code" className="font-mono text-4xl font-black tracking-widest text-primaryDark">{d.pickup_code}</p>
                <Button size="sm" onClick={() => d.pickup_code && void copyCode(d.pickup_code)}><Copy size={16}/>Copy code</Button>
              </div> : <p className="mt-1 text-sm text-muted">Code unavailable.</p>}
            </div>}
            {status === "COLLECTED" && <p className="mt-3 text-sm text-muted">Awaiting delivery confirmation.</p>}
            {["EXPIRED", "CANCELLED"].includes(d.status) && <Link className="view-toggle" to="/donor/rescue/new"><Repeat2 size={16}/>Post again</Link>}
          </Card>}
        </div>

        {status === "CLAIMED" && <PickupLogistics rescueId={id} side="donor"/>}
        {status === "DELIVERED" && <div className="grid gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
          <RecognitionCard rescueId={id} delivered={d.impact?.delivered_servings ?? 0}/>
          <PartnerRating rescueId={id}/>
        </div>}
        {d.claimed_receiver && ["CLAIMED", "COLLECTED", "DELIVERED"].includes(d.status) &&
          <ChatBox rescueId={id} recipientName={d.claimed_receiver.name ?? "Receiver"}/>}

        {cancellable && <div className="border-t border-border pt-3">
          {showCancel ? <form onSubmit={event => { event.preventDefault(); cancel.mutate(); }} className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <label className="block text-sm font-semibold">Reason for cancellation
              <textarea value={cancelReason} onChange={event => setCancelReason(event.target.value)} minLength={3} maxLength={300}
                required className="mt-1 w-full rounded-lg border border-border p-2"/>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="danger" disabled={cancel.isPending || cancelReason.trim().length < 3}>Confirm cancellation</Button>
              <Button type="button" variant="ghost" onClick={() => setShowCancel(false)}>Keep rescue</Button>
            </div>
          </form> : <Button className="text-danger" variant="ghost" onClick={() => setShowCancel(true)}>Cancel rescue</Button>}
        </div>}
      </>}
    </div>
  </AppShell>;
}
