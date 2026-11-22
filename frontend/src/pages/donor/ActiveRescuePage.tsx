import RecognitionCard from "../../components/rescue/RecognitionCard";
import PartnerRating from "../../components/rescue/PartnerRating";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, CheckCircle2, Repeat2, AlertCircle, Flame, Leaf, Snowflake, Thermometer } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import MatchExplanation from "../../components/rescue/MatchExplanation";
import RescueClock from "../../components/rescue/RescueClock";
import StatusBadge from "../../components/rescue/StatusBadge";
import StatusTimeline from "../../components/rescue/StatusTimeline";
import HowWeCalculate from "../../components/impact/HowWeCalculate";
import ImpactMetric from "../../components/impact/ImpactMetric";
import ChatBox from "../../components/chat/ChatBox";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatMinutes, statusLabel } from "../../lib/format";
import { pollInterval } from "../../hooks/usePolling";
import type { MatchCandidate, RescueDetail } from "../../types/api";

const MATCHABLE = ["POSTED", "MATCHING", "OFFERED"];
const CANCELLABLE = ["POSTED", "MATCHING", "OFFERED", "CLAIMED"];
const RETRY_AFTER_MS = 2 * 60 * 1000;

const DIETARY_LABELS: Record<string, string> = {
  VEG: "Vegetarian",
  NON_VEG: "Non-vegetarian",
  VEGAN: "Vegan",
  JAIN: "Jain",
  HALAL: "Halal",
  GLUTEN_FREE: "Gluten-free",
  DIABETIC_FRIENDLY: "Diabetic-friendly",
  RAW_VEGAN: "Raw Vegan",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

const HANDLING_ICONS: Record<string, React.ReactNode> = {
  HOT_HELD: <Flame className="h-4 w-4 text-urgent" />,
  REFRIGERATED: <Snowflake className="h-4 w-4 text-info" />,
  ROOM_TEMPERATURE: <Thermometer className="h-4 w-4 text-warn" />,
  OTHER: <Leaf className="h-4 w-4 text-muted" />,
  UNKNOWN: <AlertCircle className="h-4 w-4 text-muted" />,
};

const HANDLING_LABELS: Record<string, string> = {
  HOT_HELD: "Kept hot (above 60 °C)",
  REFRIGERATED: "Refrigerated (below 5 °C)",
  ROOM_TEMPERATURE: "Room temperature — consume within 2 hrs",
  OTHER: "Other (see notes)",
  UNKNOWN: "Not specified",
};

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "OFFLINE") return "You're offline. Your latest data may be outdated.";
    if (e.code === "CANCEL_NOT_ALLOWED") return "This rescue can no longer be cancelled.";
    return e.message;
  }
  return "Something went wrong. Please try again.";
}

type DetailWithFlags = RescueDetail & { matching_error?: boolean };

export default function ActiveRescuePage() {
  const { id = "" } = useParams();
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const rescue = useQuery({
    queryKey: ["rescue", id],
    queryFn: () => apiRequest<DetailWithFlags>(`/rescues/${id}`, { token }),
    enabled: !!token && !!id,
    staleTime: 0,
    refetchInterval: (query) => pollInterval(query.state.data?.status),
  });

  const d = rescue.data;
  const status = d?.status;
  const matchable = !!status && MATCHABLE.includes(status);
  const cancellable = !!status && CANCELLABLE.includes(status);
  const offline = rescue.error instanceof ApiError && rescue.error.code === "OFFLINE";

  const matches = useQuery({
    queryKey: ["matches", id],
    queryFn: () => apiRequest<MatchCandidate[]>(`/rescues/${id}/matches`, { token }),
    enabled: !!token && !!id && matchable,
    refetchInterval: () => pollInterval(status),
  });

  const onRescueUpdated = (data: RescueDetail) => {
    qc.setQueryData(["rescue", id], data);
    qc.invalidateQueries({ queryKey: ["matches", id] });
    qc.invalidateQueries({ queryKey: ["rescues", "mine"] });
  };

  const dispatch = useMutation({
    mutationFn: () => apiRequest<RescueDetail>(`/rescues/${id}/dispatch`, { method: "POST", token }),
    onMutate: () => setActionError(null),
    onSuccess: onRescueUpdated,
    onError: (e) => setActionError(errorText(e)),
  });

  const cancel = useMutation({
    mutationFn: () => apiRequest<RescueDetail>(`/rescues/${id}/cancel`, { method: "POST", token, body: {reason:cancelReason} }),
    onMutate: () => setActionError(null),
    onSuccess: (data) => {
      onRescueUpdated(data);
      toast({ variant: "info", title: "Rescue cancelled", message: "The listing is closed and reserved capacity is released." });
    },
    onError: (e) => setActionError(errorText(e)),
  });

  function onCancel() {
    setShowCancel(true);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ variant: "success", title: "Code copied!", message: "Share it with the receiver." });
    } catch {
      setActionError("Couldn't copy the code. Please select it and copy it manually.");
    }
  }

  const flagged = d?.matching_error === true;
  const createdAt = d?.status_events?.[0]?.created_at;
  const postedTooLong =
    status === "POSTED" && !!createdAt && Date.now() - new Date(createdAt).getTime() > RETRY_AFTER_MS;
  const needsRetry = matchable && (flagged || postedTooLong);
  const statusLine = d ? `Status: ${statusLabel(d.status)}` : "";

  // Urgency colour for the top bar
  const isUrgent = d && ["POSTED", "MATCHING", "OFFERED"].includes(d.status);
  const minsLeft = d ? Math.round((new Date(d.pickup_by).getTime() - Date.now()) / 60000) : 0;
  const urgencyBarColor =
    minsLeft > 60 ? "bg-fresh" : minsLeft > 20 ? "bg-warn" : "bg-urgent";

  return (
    <AppShell title="Rescue" nav="donor" backTo="/donor">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {/* Urgency colour bar */}
        {isUrgent && d && (
          <div className={`h-1.5 w-full rounded-full ${urgencyBarColor}`} role="presentation" />
        )}

        {offline && (
          <div role="status" className="rounded-xl border border-warn/30 bg-warn/5 p-4 text-warn">
            You're offline. Your latest data may be outdated.
          </div>
        )}

        {rescue.isLoading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading rescue">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {rescue.isError && !offline && (
          <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-4 text-urgent">
            {errorText(rescue.error)}
          </div>
        )}

        {d && (
          <>
            <div aria-live="polite" className="sr-only">
              {statusLine}
            </div>

            {/* Header card */}
            <Card>
              <div className="flex flex-col items-start gap-3">
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-bold text-ink">{d.display_id}</h2>
                  <StatusBadge status={d.status} />
                </div>
                {["POSTED", "MATCHING", "OFFERED", "CLAIMED"].includes(d.status) && <RescueClock pickupBy={d.pickup_by} />}
              </div>
            </Card>

            {/* Food details */}
            <Card>
              <h3 className="mb-3 text-lg font-semibold text-ink">Food</h3>
              <ul className="flex flex-col gap-3">
                {d.food_items.map((f, i) => (
                  <li key={i} className="border-b border-border pb-3 last:border-0">
                    <p className="font-medium text-ink">
                      {f.name} <span className="text-muted">· {f.quantity_servings} servings</span>
                    </p>
                    <p className="text-sm text-muted mt-0.5">
                      {DIETARY_LABELS[f.dietary_type] ?? f.dietary_type}
                      {" · "}
                      {f.allergen_info_unknown
                        ? "Allergen info unknown"
                        : f.allergens.length > 0
                          ? `Allergens: ${f.allergens.join(", ")}`
                          : "No allergens listed"}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Handling info */}
              {(d.handling_type || d.handling_notes) && (
                <div className="mt-4 flex flex-col gap-1 rounded-xl bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Handling</p>
                  {d.handling_type && (
                    <p className="flex items-center gap-2 text-sm text-ink">
                      {HANDLING_ICONS[d.handling_type] ?? null}
                      {HANDLING_LABELS[d.handling_type] ?? d.handling_type}
                    </p>
                  )}
                  {d.handling_notes && (
                    <p className="text-sm text-muted mt-1">{d.handling_notes}</p>
                  )}
                </div>
              )}

              {d.allergen_notice && <p className="mt-3 text-sm text-ink">{d.allergen_notice}</p>}
              {d.safety_notice && <p className="mt-2 text-xs text-muted italic">{d.safety_notice}</p>}
            </Card>

            {/* Pickup code */}
            {(d.status === "CLAIMED" || d.status === "COLLECTED") && (
              <Card variant="fresh">
                <h3 className="text-lg font-semibold text-ink">Pickup code</h3>
                {d.pickup_code ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="font-mono text-3xl font-black tracking-widest text-ink" aria-label="Pickup code">
                      {d.pickup_code}
                    </p>
                    <Button
                      variant="secondary"
                      className="min-h-[44px] flex items-center gap-2"
                      onClick={() => copyCode(d.pickup_code as string)}
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4 text-fresh" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy code"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted mt-1">The pickup code isn't available yet.</p>
                )}
                {d.claimed_receiver && (
                  <p className="mt-3 text-sm text-ink">
                    Claimed by{" "}
                    <span className="font-semibold">{d.claimed_receiver.name}</span>
                    {d.claimed_receiver.locality ? `, ${d.claimed_receiver.locality}` : ""}
                  </p>
                )}
              </Card>
            )}

            {/* In-app Coordinator Chat (Req #4 & #14) */}
            {d.claimed_receiver && <ChatBox
              rescueId={id}
              recipientName={d.claimed_receiver?.name ?? "Receiver / Volunteer"}
              defaultOpen={d.status === "CLAIMED" || d.status === "COLLECTED"}
            />}

            {/* Matching */}
            {matchable && (
              <Card>
                <h3 className="mb-3 text-lg font-semibold text-ink">Matching</h3>
                {matches.isLoading && <Skeleton className="h-24 w-full" />}
                {matches.isError && (
                  <p role="alert" className="text-sm text-urgent">
                    {errorText(matches.error)}
                  </p>
                )}
                {matches.data && <MatchExplanation candidates={matches.data} />}
                {d.status === "MATCHING" && matches.data && matches.data.length === 0 && (
                  <p className="text-sm text-muted">
                    No currently available receiver can safely reach this rescue before the pickup deadline.
                    We'll continue checking while the rescue remains active.
                  </p>
                )}
                {needsRetry && (
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-sm text-muted">
                      We couldn't complete matching right now. Your rescue has been saved.
                    </p>
                    <Button
                      variant="primary"
                      className="min-h-[44px] self-start"
                      onClick={() => dispatch.mutate()}
                      disabled={dispatch.isPending}
                    >
                      {dispatch.isPending ? "Retrying..." : "Retry matching"}
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Expired / cancelled states */}
            {d.status === "EXPIRED" && (
              <Card variant="warn">
                <p className="font-semibold text-warn">Pickup window ended</p>
                <p className="text-sm text-muted mt-1">
                  This rescue will no longer be offered to receivers.
                </p>
                <Link
                  to="/donor/rescue/new"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  <Repeat2 className="h-4 w-4" /> Post again
                </Link>
              </Card>
            )}

            {d.status === "CANCELLED" && (
              <Card>
                <p className="text-muted">This rescue was cancelled. No receiver will collect this food.</p>
                <Link
                  to="/donor/rescue/new"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"
                >
                  <Repeat2 className="h-4 w-4" /> Post a new rescue
                </Link>
              </Card>
            )}

            {/* Impact */}
            {d.status === "DELIVERED" && (
              <section aria-labelledby="impact-heading" className="flex flex-col gap-4">
                <RecognitionCard rescueId={id} delivered={d.impact?.delivered_servings ?? 0}/><PartnerRating rescueId={id}/>
                <h3 id="impact-heading" className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <Leaf className="h-4 w-4" aria-hidden="true"/> Impact
                </h3>
                <div className="rounded-2xl bg-fresh/10 border border-fresh/20 p-4">
                  <ImpactMetric label="Meals rescued" value={`${d.impact?.delivered_servings ?? 0} meals`} />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ImpactMetric label="Rejected servings" value={String(d.impact?.rejected_servings ?? 0)} />
                    <ImpactMetric
                      label="Completion time"
                      value={
                        d.impact?.minutes_to_delivery !== undefined && d.impact?.minutes_to_delivery !== null
                          ? formatMinutes(d.impact.minutes_to_delivery)
                          : "—"
                      }
                    />
                  </div>
                  {/* CO2e estimate */}
                  {d.impact?.delivered_servings && d.impact.delivered_servings > 0 && (
                    <div className="mt-3 rounded-xl bg-background p-3 text-sm">
                      <p className="font-semibold text-ink">
                        ~{(d.impact.delivered_servings * 0.4 * 2.5).toFixed(1)} kg CO₂e avoided
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        Estimate: {d.impact.delivered_servings} meals × 0.4 kg/meal × 2.5 kgCO₂e/kg food waste
                      </p>
                    </div>
                  )}
                </div>
                <HowWeCalculate />
              </section>
            )}

            {/* Cancel */}
            {cancellable && (
              <div className="flex flex-col gap-2">
                {showCancel && <form onSubmit={e => {e.preventDefault();cancel.mutate();}} className="rounded-xl border border-border bg-white p-4"><label className="block text-sm font-semibold">Reason for cancellation<textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} minLength={3} maxLength={300} required className="mt-2 w-full rounded-xl border border-border p-3"/></label><p className="my-3 text-sm text-muted">This closes the listing. If already claimed, coordinate with your receiver before cancelling.</p><div className="flex gap-2"><Button type="submit" variant="danger" disabled={cancel.isPending || cancelReason.trim().length<3}>Confirm cancellation</Button><Button type="button" variant="ghost" onClick={()=>setShowCancel(false)}>Keep donation</Button></div></form>}
                <Button
                  variant="secondary"
                  className="min-h-[44px] self-start text-muted hover:text-urgent"
                  onClick={onCancel}
                  disabled={cancel.isPending}
                >
                  {cancel.isPending ? "Cancelling..." : "Cancel rescue"}
                </Button>
              </div>
            )}

            {actionError && (
              <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-4 text-urgent">
                {actionError}
              </div>
            )}

            {/* Timeline */}
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-ink">Timeline</h3>
              <StatusTimeline events={d.status_events ?? []} status={d.status} />
            </Card>

            {/* Safety disclaimer */}
            <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted">
              <strong>Handling information provided by donor.</strong> Receiver must independently verify
              suitability before accepting or distributing the food. RescueRelay coordinates food recovery
              and does not certify food safety.
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
