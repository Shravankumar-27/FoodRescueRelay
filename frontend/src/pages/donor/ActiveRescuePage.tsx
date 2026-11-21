import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import MatchExplanation from "../../components/rescue/MatchExplanation";
import RescueClock from "../../components/rescue/RescueClock";
import StatusBadge from "../../components/rescue/StatusBadge";
import StatusTimeline from "../../components/rescue/StatusTimeline";
import HowWeCalculate from "../../components/impact/HowWeCalculate";
import ImpactMetric from "../../components/impact/ImpactMetric";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import { formatMinutes, statusLabel } from "../../lib/format";
import { pollInterval } from "../../hooks/usePolling";
import type { MatchCandidate, RescueDetail } from "../../types/api";

const MATCHABLE = ["POSTED", "MATCHING", "OFFERED"];
const CANCELLABLE = ["POSTED", "MATCHING", "OFFERED"];
const RETRY_AFTER_MS = 2 * 60 * 1000;

const DIETARY_LABELS: Record<string, string> = {
  VEG: "Vegetarian",
  NON_VEG: "Non-vegetarian",
  VEGAN: "Vegan",
  OTHER: "Other",
  UNKNOWN: "Unknown",
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
  const qc = useQueryClient();
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
    mutationFn: () => apiRequest<RescueDetail>(`/rescues/${id}/cancel`, { method: "POST", token }),
    onMutate: () => setActionError(null),
    onSuccess: onRescueUpdated,
    onError: (e) => setActionError(errorText(e)),
  });

  function onCancel() {
    if (window.confirm("Cancel this rescue? Receivers will no longer be able to claim it.")) {
      cancel.mutate();
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  return (
    <AppShell title="Rescue" nav="donor">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {offline && (
          <div role="status" className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-amber-900">
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
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {errorText(rescue.error)}
          </div>
        )}

        {d && (
          <>
            <div aria-live="polite" className="sr-only">
              {statusLine}
            </div>

            <Card>
              <div className="flex flex-col items-start gap-3">
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">{d.display_id}</h2>
                  <StatusBadge status={d.status} />
                </div>
                <RescueClock pickupBy={d.pickup_by} />
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Food</h3>
              <ul className="flex flex-col gap-3">
                {d.food_items.map((f, i) => (
                  <li key={i} className="border-b border-gray-100 pb-3 last:border-0">
                    <p className="font-medium text-gray-900">
                      {f.name} <span className="text-gray-600">· {f.quantity_servings} servings</span>
                    </p>
                    <p className="text-sm text-gray-600">
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
              {d.allergen_notice && <p className="mt-3 text-sm text-gray-800">{d.allergen_notice}</p>}
              {d.safety_notice && <p className="mt-3 text-sm text-gray-800">{d.safety_notice}</p>}
            </Card>

            {(d.status === "CLAIMED" || d.status === "COLLECTED") && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900">Pickup code</h3>
                {d.pickup_code ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="font-mono text-3xl font-bold tracking-widest text-gray-900" aria-label="Pickup code">
                      {d.pickup_code}
                    </p>
                    <Button
                      variant="secondary"
                      className="min-h-[44px]"
                      onClick={() => copyCode(d.pickup_code as string)}
                    >
                      Copy code
                    </Button>
                    {copied && <span className="text-sm text-emerald-800">Copied</span>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">The pickup code isn't available yet.</p>
                )}
                {d.claimed_receiver && (
                  <p className="mt-3 text-sm text-gray-800">
                    Claimed by <span className="font-medium">{d.claimed_receiver.name}</span>
                    {d.claimed_receiver.locality ? `, ${d.claimed_receiver.locality}` : ""}
                  </p>
                )}
              </Card>
            )}

            {matchable && (
              <Card>
                <h3 className="mb-3 text-lg font-semibold text-gray-900">Matching</h3>
                {matches.isLoading && <Skeleton className="h-24 w-full" />}
                {matches.isError && (
                  <p role="alert" className="text-sm text-red-700">
                    {errorText(matches.error)}
                  </p>
                )}
                {matches.data && <MatchExplanation candidates={matches.data} />}
                {d.status === "MATCHING" && matches.data && matches.data.length === 0 && (
                  <p className="text-sm text-gray-800">
                    No currently available receiver can safely reach this rescue before the pickup deadline. We'll
                    continue checking while the rescue remains active.
                  </p>
                )}
                {needsRetry && (
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-sm text-gray-800">
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

            {d.status === "EXPIRED" && (
              <Card>
                <p className="text-gray-800">
                  Pickup window ended. This rescue will no longer be offered to receivers.
                </p>
              </Card>
            )}

            {d.status === "CANCELLED" && (
              <Card>
                <p className="text-gray-800">This rescue was cancelled. No receiver will collect this food.</p>
              </Card>
            )}

            {d.status === "DELIVERED" && (
              <section aria-labelledby="impact-heading" className="flex flex-col gap-4">
                <h3 id="impact-heading" className="text-lg font-semibold text-gray-900">
                  Impact
                </h3>
                <ImpactMetric label="Meals rescued" value={`${d.impact?.delivered_servings ?? 0} meals rescued`} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ImpactMetric label="Rejected" value={String(d.impact?.rejected_servings ?? 0)} />
                  <ImpactMetric
                    label="Completion time"
                    value={
                      d.impact?.minutes_to_delivery !== undefined && d.impact?.minutes_to_delivery !== null
                        ? formatMinutes(d.impact.minutes_to_delivery)
                        : "—"
                    }
                  />
                </div>
                <HowWeCalculate />
              </section>
            )}

            {cancellable && (
              <div className="flex flex-col gap-2">
                <Button variant="secondary" className="min-h-[44px] self-start" onClick={onCancel} disabled={cancel.isPending}>
                  {cancel.isPending ? "Cancelling..." : "Cancel rescue"}
                </Button>
              </div>
            )}

            {actionError && (
              <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                {actionError}
              </div>
            )}

            <Card>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Timeline</h3>
              <StatusTimeline events={d.status_events ?? []} status={d.status} />
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
