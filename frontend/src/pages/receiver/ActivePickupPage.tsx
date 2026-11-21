import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Camera,
  MessageSquare,
  PackageCheck,
  Thermometer,
  PackageOpen,
  Truck,
} from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import EmptyState from "../../components/ui/EmptyState";
import Modal from "../../components/ui/Modal";
import SafetyNotice from "../../components/rescue/SafetyNotice";
import StatusTimeline from "../../components/rescue/StatusTimeline";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
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

// Checklist items receiver must acknowledge at collection
const COLLECTION_CHECKLIST = [
  { id: "temp", icon: <Thermometer className="h-4 w-4 text-info" />, label: "Temperature appears safe (hot food hot, cold food cold)" },
  { id: "pkg", icon: <PackageCheck className="h-4 w-4 text-fresh" />, label: "Packaging is intact, sealed, and undamaged" },
  { id: "time", icon: <Clock className="h-4 w-4 text-warn" />, label: "Within the pickup-by time window" },
  { id: "qty", icon: <PackageOpen className="h-4 w-4 text-muted" />, label: "Quantity roughly matches what was listed" },
];

function CollectionChecklist({
  checked,
  onChange,
}: {
  checked: Record<string, boolean>;
  onChange: (id: string, val: boolean) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-ink">
        Collection checklist — confirm before accepting
      </legend>
      {COLLECTION_CHECKLIST.map((item) => (
        <label
          key={item.id}
          className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
            checked[item.id] ? "border-fresh bg-fresh/5" : "border-border bg-surface"
          }`}
        >
          <input
            type="checkbox"
            className="h-5 w-5 rounded accent-primary shrink-0"
            checked={!!checked[item.id]}
            onChange={(e) => onChange(item.id, e.target.checked)}
          />
          <span className="shrink-0">{item.icon}</span>
          <span className="text-sm text-ink">{item.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

function WhatsAppPreview({ phone, message }: { phone: string; message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
        Simulated WhatsApp/SMS notification
      </p>
      <div className="flex gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fresh text-white font-bold text-sm shrink-0">
          RR
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted mb-1">To: {phone}</p>
          <div className="rounded-xl rounded-tl-none bg-surface border border-border p-3 text-sm text-ink">
            {message}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted mt-2 italic">Demo only — no real message sent</p>
    </div>
  );
}

export default function ActivePickupPage() {
  const { rescueId = "" } = useParams<{ rescueId: string }>();
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [pickupCode, setPickupCode] = useState("");
  const [collectedInput, setCollectedInput] = useState("");
  const [deliveredInput, setDeliveredInput] = useState("");
  const [rejectedInput, setRejectedInput] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [collectMessage, setCollectMessage] = useState<string | null>(null);
  const [collected, setCollected] = useState<number | null>(null);
  const [deliveredResult, setDeliveredResult] = useState<DeliverResult | null>(null);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [photoPlaceholder, setPhotoPlaceholder] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

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
      toast({ variant: "success", title: "Collected!", message: `${data.collected_servings} servings confirmed.` });
      refresh();
    },
    onError: (e) => {
      toast({ variant: "error", title: "Collection failed", message: errorText(e) });
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
      toast({ variant: "success", title: "🎉 Delivered!", message: `${data.impact_meals} meals rescued.` });
      refresh();
    },
    onError: (e) => {
      toast({ variant: "error", title: "Delivery failed", message: errorText(e) });
    },
  });

  function checklistAllDone() {
    return COLLECTION_CHECKLIST.every((item) => checklist[item.id]);
  }

  function onCollectSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    if (!checklistAllDone()) {
      setClientError("Please complete the collection checklist before confirming.");
      return;
    }
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
    const collectedTotal = collected ?? detailExtra?.collected_servings;
    if (collectedTotal !== undefined && collectedTotal !== null && delivered + rejected > collectedTotal) {
      setClientError(`Delivered plus rejected cannot exceed ${collectedTotal} servings collected.`);
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

  // Simulated WhatsApp message
  const whatsappMsg = detail
    ? `✅ RescueRelay: Your food rescue (${detail.display_id}) has been collected. ${collectedTotal ?? detail.food_items.reduce((s, f) => s + f.quantity_servings, 0)} servings are on their way to those who need it. Thank you for donating! 🙏`
    : "";

  function renderBody() {
    if (detailQuery.isLoading) return <Skeleton className="h-96 w-full" />;
    if (detailQuery.isError) {
      return (
        <p role="alert" className="text-sm text-urgent">
          {errorText(detailQuery.error)}
        </p>
      );
    }
    if (!detail) return <EmptyState title="Rescue not found." />;

    if (status === "CLAIMED") {
      return (
        <div className="flex flex-col gap-4">
          {/* Pickup details */}
          <Card>
            <h2 className="mb-3 text-lg font-semibold text-ink">Pickup details</h2>
            <dl className="flex flex-col gap-3 text-sm">
              {detailExtra?.donor_organization_name && (
                <div className="flex items-start gap-3">
                  <Truck className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-muted text-xs">Donor</dt>
                    <dd className="font-medium text-ink">{detailExtra.donor_organization_name}</dd>
                  </div>
                </div>
              )}
              {detailExtra?.private_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-muted text-xs">Pickup address</dt>
                    <dd className="font-medium text-ink">{detailExtra.private_address}</dd>
                  </div>
                </div>
              )}
              {detailExtra?.donor_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-muted text-xs">Donor contact</dt>
                    <dd>
                      <a href={`tel:${detailExtra.donor_phone}`} className="font-medium text-primary underline">
                        {detailExtra.donor_phone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-warn mt-0.5 shrink-0" />
                <div>
                  <dt className="text-muted text-xs">Pick up by</dt>
                  <dd className="font-medium text-ink">{formatDateTime(detail.pickup_by)}</dd>
                </div>
              </div>
            </dl>

            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-button border border-primary px-4 text-sm font-medium text-primary hover:bg-primaryLight transition-colors"
              >
                <MapPin className="h-4 w-4" /> Open in Maps
              </a>
            )}
          </Card>

          {/* Collection checklist */}
          <Card>
            <form onSubmit={onCollectSubmit} className="flex flex-col gap-5" noValidate>
              <h2 className="text-lg font-semibold text-ink">Confirm collection</h2>

              <CollectionChecklist
                checked={checklist}
                onChange={(id, val) => setChecklist((prev) => ({ ...prev, [id]: val }))}
              />

              <Input
                label="Pickup code (4 digits)"
                name="pickup_code"
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                autoComplete="one-time-code"
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value)}
                hint="Get this from the donor"
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

              {/* Photo placeholder */}
              <div>
                <p className="text-sm font-medium text-ink mb-2">Photo evidence (optional)</p>
                {photoPlaceholder ? (
                  <div className="flex items-center gap-3 rounded-xl border border-fresh bg-fresh/5 p-3">
                    <CheckCircle2 className="h-5 w-5 text-fresh" />
                    <span className="text-sm text-fresh font-medium">Photo attached (demo placeholder)</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhotoPlaceholder(true)}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted hover:border-primary hover:text-primary transition-colors"
                  >
                    <Camera className="h-5 w-5" />
                    Attach photo (demo)
                  </button>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={collectMutation.isPending || !checklistAllDone()}
                className="min-h-[44px]"
              >
                {collectMutation.isPending ? "Confirming…" : "✓ Confirm collection"}
              </Button>

              {!checklistAllDone() && (
                <p className="text-xs text-muted">Complete the checklist above to unlock confirmation.</p>
              )}
            </form>

            {collectMessage && (
              <div className="mt-4 flex items-center gap-2 text-sm text-fresh">
                <CheckCircle2 className="h-5 w-5" />
                {collectMessage}
              </div>
            )}
          </Card>

          {/* Simulated WhatsApp preview */}
          <button
            type="button"
            onClick={() => setShowWhatsApp(true)}
            className="flex items-center gap-2 text-sm font-medium text-info hover:underline"
          >
            <MessageSquare className="h-4 w-4" />
            Preview donor notification (WhatsApp/SMS)
          </button>
        </div>
      );
    }

    if (status === "COLLECTED") {
      return (
        <Card>
          <form onSubmit={onDeliverSubmit} className="flex flex-col gap-4" noValidate>
            <h2 className="text-lg font-semibold text-ink">Confirm delivery</h2>
            {collectedTotal !== null && (
              <div className="rounded-xl bg-background px-4 py-3 text-sm">
                <span className="text-muted">Servings collected: </span>
                <span className="font-bold text-ink">{collectedTotal}</span>
              </div>
            )}
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
              hint="Food that couldn't be distributed (spoiled, refused, etc.)"
            />

            {/* Photo placeholder for delivery */}
            <div>
              <p className="text-sm font-medium text-ink mb-2">Delivery photo (optional)</p>
              <button
                type="button"
                onClick={() => setPhotoPlaceholder(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm text-muted hover:border-primary hover:text-primary transition-colors"
              >
                <Camera className="h-5 w-5" />
                {photoPlaceholder ? "✓ Photo attached (demo)" : "Attach delivery photo (demo)"}
              </button>
            </div>

            <Button type="submit" variant="primary" disabled={deliverMutation.isPending} className="min-h-[44px]">
              {deliverMutation.isPending ? "Confirming…" : "🎉 Confirm delivery"}
            </Button>
          </form>
        </Card>
      );
    }

    if (status === "DELIVERED") {
      const result = deliveredResult;
      return (
        <Card variant="fresh">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fresh text-white text-3xl">
              🎉
            </div>
            <h2 className="text-xl font-bold text-ink">Delivery complete!</h2>
            <p className="text-muted text-sm">
              You rescued{" "}
              <span className="font-bold text-fresh text-lg">
                {result?.impact_meals ?? result?.delivered_servings ?? "—"} meals
              </span>
            </p>
            {result && (
              <div className="grid grid-cols-2 gap-3 mt-2 w-full max-w-xs">
                <div className="rounded-xl bg-background p-3 text-center">
                  <p className="text-2xl font-black text-ink">{result.delivered_servings}</p>
                  <p className="text-xs text-muted">Delivered</p>
                </div>
                <div className="rounded-xl bg-background p-3 text-center">
                  <p className="text-2xl font-black text-ink">{result.rejected_servings}</p>
                  <p className="text-xs text-muted">Rejected</p>
                </div>
              </div>
            )}
            <Link
              to="/receiver/history"
              className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-button bg-primary px-6 font-medium text-white hover:bg-primaryDark transition-colors"
            >
              View your history
            </Link>
          </div>
        </Card>
      );
    }

    if (status === "EXPIRED" || status === "CANCELLED") {
      return (
        <Card variant="warn">
          <p className="text-warn font-medium">
            {status === "EXPIRED"
              ? "This rescue expired before it was completed."
              : "This rescue was cancelled."}
          </p>
        </Card>
      );
    }

    return (
      <Card>
        <p className="text-muted">Current status: {String(status)}</p>
      </Card>
    );
  }

  return (
    <AppShell title="Active pickup" nav="receiver" backTo="/receiver">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {serverError && (
          <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-3 text-sm text-urgent">
            {serverError}
          </div>
        )}
        {clientError && (
          <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-3 text-sm text-urgent">
            {clientError}
          </div>
        )}

        {renderBody()}

        {detail && (
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-muted uppercase tracking-wider">Timeline</h3>
            <StatusTimeline events={detail.status_events ?? []} status={detail.status} />
          </Card>
        )}

        <SafetyNotice />
      </div>

      {/* WhatsApp preview modal */}
      <Modal
        open={showWhatsApp}
        onClose={() => setShowWhatsApp(false)}
        title="Donor notification preview"
        size="sm"
      >
        <WhatsAppPreview
          phone="+91 98*** ***45 (synthetic)"
          message={whatsappMsg}
        />
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setShowWhatsApp(false)}>Close</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
