import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import SafetyNotice from "../../components/rescue/SafetyNotice";
import StatusTimeline from "../../components/rescue/StatusTimeline";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { pollInterval } from "../../hooks/usePolling";
import type { RescueDetail } from "../../types/api";

interface CollectResult {
  rescue_id: string;
  status: "COLLECTED";
  collected_servings: number;
}

interface DeliverResult {
  rescue_id: string;
  status: "DELIVERED";
  delivered_servings: number;
  rejected_servings: number;
  impact_meals: number;
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

export default function ActivePickupPage() {
  const { rescueId = "" } = useParams<{ rescueId: string }>();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [pickupCode, setPickupCode] = useState("");
  const [collectedInput, setCollectedInput] = useState("");
  const [deliveredInput, setDeliveredInput] = useState("");
  const [rejectedInput, setRejectedInput] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [collectMessage, setCollectMessage] = useState<string | null>(null);
  const [collected, setCollected] = useState<number | null>(null);
  const [deliveredResult, setDeliveredResult] = useState<DeliverResult | null>(null);

  const detailQuery = useQuery({
    queryKey: ["receiver", "rescue", rescueId],
    queryFn: () => apiRequest<RescueDetail>(`/rescues/${rescueId}`, { token }),
    enabled: !!token && !!rescueId,
    refetchInterval: (query) => pollInterval(query.state.data?.status),
  });

  const detail = detailQuery.data;
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["receiver", "rescue", rescueId] });

  const collectMutation = useMutation({
    mutationFn: (body: { pickup_code: string; collected_servings: number }) =>
      apiRequest<CollectResult>(`/rescues/${rescueId}/collect`, {
        method: "POST",
        token,
        body,
      }),
    onSuccess: (data) => {
      setCollected(data.collected_servings);
      setCollectMessage(`Collection confirmed: ${data.collected_servings} servings.`);
      setPickupCode("");
      setCollectedInput("");
      setClientError(null);
      refresh();
    },
  });

  const deliverMutation = useMutation({
    mutationFn: (body: { delivered_servings: number; rejected_servings: number }) =>
      apiRequest<DeliverResult>(`/rescues/${rescueId}/deliver`, {
        method: "POST",
        token,
        body,
      }),
    onSuccess: (data) => {
      setDeliveredResult(data);
      setClientError(null);
      refresh();
    },
  });

  function onCollectSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    if (!/^\d{4}$/.test(pickupCode)) {
      setClientError("Enter the 4-digit pickup code.");
      return;
    }
    const servings = Number(collectedInput);
    if (!Number.isInteger(servings) || servings < 1) {
      setClientError("Servings collected must be a whole number of at least 1.");
      return;
    }
    collectMutation.mutate({ pickup_code: pickupCode, collected_servings: servings });
  }

  function onDeliverSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    const delivered = Number(deliveredInput);
    const rejected = rejectedInput === "" ? 0 : Number(rejectedInput);
    if (!Number.isInteger(delivered) || delivered < 0) {
      setClientError("Servings delivered must be a whole number of 0 or more.");
      return;
    }
    if (!Number.isInteger(rejected) || rejected < 0) {
      setClientError("Servings rejected must be a whole number of 0 or more.");
      return;
    }
    const collectedTotal = collected ?? (detail as unknown as { collected_servings?: number })?.collected_servings;
    if (collectedTotal !== undefined && delivered + rejected > collectedTotal) {
      setClientError(`Delivered plus rejected cannot be more than the ${collectedTotal} servings collected.`);
      return;
    }
    deliverMutation.mutate({ delivered_servings: delivered, rejected_servings: rejected });
  }

  const status = detail?.status;
  const serverError = collectMutation.isError
    ? errorText(collectMutation.error)
    : deliverMutation.isError
      ? errorText(deliverMutation.error)
      : null;

  // Fields below are read from the RescueDetail returned by the server; receiver-only fields are present only after claim.
  const detailExtra = detail as unknown as {
    private_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    donor_organization_name?: string | null;
    donor_phone?: string | null;
    collected_servings?: number | null;
  } | undefined;

  const mapsUrl =
    detailExtra?.latitude != null && detailExtra?.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${detailExtra.latitude},${detailExtra.longitude}`
      : null;

  const collectedTotal = collected ?? detailExtra?.collected_servings ?? null;

  function renderBody() {
    if (detailQuery.isLoading) return <Skeleton className="h-96 w-full" />;
    if (detailQuery.isError) {
      return (
        <p role="alert" className="text-sm text-red-700">
          {errorText(detailQuery.error)}
        </p>
      );
    }
    if (!detail) return <EmptyState title="Rescue not found." />;

    if (status === "CLAIMED") {
      return (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-2 text-lg font-semibold">Pickup details</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {detailExtra?.donor_organization_name ? (
                <div>
                  <dt className="text-slate-600">Donor</dt>
                  <dd className="text-base">{detailExtra.donor_organization_name}</dd>
                </div>
              ) : null}
              {detailExtra?.private_address ? (
                <div>
                  <dt className="text-slate-600">Address</dt>
                  <dd className="text-base">{detailExtra.private_address}</dd>
                </div>
              ) : null}
              {detailExtra?.donor_phone ? (
                <div>
                  <dt className="text-slate-600">Donor phone</dt>
                  <dd className="text-base">
                    <a href={`tel:${detailExtra.donor_phone}`} className="underline">
                      {detailExtra.donor_phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-slate-600">Pick up by</dt>
                <dd className="text-base">{formatDateTime(detail.pickup_by)}</dd>
              </div>
            </dl>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center font-medium underline"
              >
                Open in maps
              </a>
            ) : null}
          </Card>

          <Card>
            <form onSubmit={onCollectSubmit} className="flex flex-col gap-4" noValidate>
              <h2 className="text-lg font-semibold">Confirm collection</h2>
              <Input
                label="Pickup code (4 digits)"
                name="pickup_code"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                autoComplete="one-time-code"
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value)}
              />
              <Input
                label="Servings collected"
                name="collected_servings"
                type="number"
                inputMode="numeric"
                min={1}
                value={collectedInput}
                onChange={(e) => setCollectedInput(e.target.value)}
              />
              <Button type="submit" variant="primary" disabled={collectMutation.isPending}>
                {collectMutation.isPending ? "Confirming..." : "Confirm collection"}
              </Button>
            </form>
            {collectMessage ? (
              <p role="status" className="mt-3 text-sm text-emerald-800">
                {collectMessage}
              </p>
            ) : null}
          </Card>
        </div>
      );
    }

    if (status === "COLLECTED") {
      return (
        <Card>
          <form onSubmit={onDeliverSubmit} className="flex flex-col gap-4" noValidate>
            <h2 className="text-lg font-semibold">Confirm delivery</h2>
            {collectedTotal !== null ? (
              <p className="text-sm text-slate-700">Servings collected: {collectedTotal}</p>
            ) : null}
            <Input
              label="Servings delivered"
              name="delivered_servings"
              type="number"
              inputMode="numeric"
              min={0}
              value={deliveredInput}
              onChange={(e) => setDeliveredInput(e.target.value)}
            />
            <Input
              label="Servings rejected (not redistributed)"
              name="rejected_servings"
              type="number"
              inputMode="numeric"
              min={0}
              value={rejectedInput}
              onChange={(e) => setRejectedInput(e.target.value)}
            />
            <Button type="submit" variant="primary" disabled={deliverMutation.isPending}>
              {deliverMutation.isPending ? "Confirming..." : "Confirm delivery"}
            </Button>
          </form>
        </Card>
      );
    }

    if (status === "DELIVERED") {
      const result = deliveredResult;
      return (
        <Card>
          <h2 className="text-lg font-semibold">Delivery complete</h2>
          <p className="mt-2 text-base">
            Delivered: {result?.delivered_servings ?? "—"} servings
          </p>
          {result ? (
            <p className="text-base">Meals rescued: {result.impact_meals}</p>
          ) : null}
          <Link
            to="/receiver/history"
            className="mt-3 inline-flex min-h-11 items-center font-medium underline"
          >
            View your history
          </Link>
        </Card>
      );
    }

    if (status === "EXPIRED" || status === "CANCELLED") {
      return (
        <Card>
          <p className="text-base">
            {status === "EXPIRED"
              ? "This rescue expired before it was completed."
              : "This rescue was cancelled."}
          </p>
        </Card>
      );
    }

    return (
      <Card>
        <p className="text-base">Current status: {String(status)}</p>
      </Card>
    );
  }

  return (
    <AppShell title="Active pickup" nav="receiver">
      <div className="flex flex-col gap-4">
        <Link
          to="/receiver"
          className="inline-flex min-h-11 items-center text-sm font-medium underline"
        >
          Back to available rescues
        </Link>

        {serverError ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {serverError}
          </p>
        ) : null}

        {clientError ? (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {clientError}
          </p>
        ) : null}

        {renderBody()}

        {detail ? (
          <Card>
            <StatusTimeline events={detail.status_events ?? []} status={detail.status} />
          </Card>
        ) : null}

        <SafetyNotice />
      </div>
    </AppShell>
  );
}
