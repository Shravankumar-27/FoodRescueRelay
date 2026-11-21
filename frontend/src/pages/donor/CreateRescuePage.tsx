import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import SafetyNotice from "../../components/rescue/SafetyNotice";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { RescueDetail } from "../../types/api";

type FoodRow = {
  name: string;
  quantity: string;
  dietary_type: string;
  allergens: string;
  allergen_info_unknown: boolean;
};

type Draft = {
  rows: FoodRow[];
  untouched: "" | "yes" | "no";
  holding: string;
  packaging: boolean;
  notes: string;
  prepared: string;
  pickup: string;
  locality: string;
  attest: boolean;
};

type FoodErr = { name?: string; quantity?: string };

const DRAFT_KEY = "rr.draft";
const REPEAT_KEY = "rr.repeat";
const QUICK_QUANTITIES = [25, 50, 100];

const DIETARY_OPTIONS: { value: string; label: string }[] = [
  { value: "VEG", label: "Vegetarian" },
  { value: "NON_VEG", label: "Non-vegetarian" },
  { value: "VEGAN", label: "Vegan" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Unknown" },
];

const HOLDING_OPTIONS: { value: string; label: string }[] = [
  { value: "HOT_HELD", label: "Kept hot" },
  { value: "REFRIGERATED", label: "Refrigerated" },
  { value: "ROOM_TEMPERATURE", label: "Room temperature" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Unknown" },
];

const CLIENT_MESSAGES: Record<string, string> = {
  NO_FOOD_ITEMS: "Add at least one food item.",
  INVALID_QUANTITY: "Servings must be a number greater than 0.",
  SAFETY_ATTESTATION_REQUIRED: "Confirm the safety attestation to continue.",
  HANDLING_INFO_REQUIRED: "Add the handling information before posting.",
  PICKUP_IN_PAST: "The pickup deadline is already in the past. Choose a later time.",
  PICKUP_BEFORE_PREPARED: "The pickup deadline must be after the food was prepared.",
};

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "FOOD_NOT_ELIGIBLE") return e.message;
    return CLIENT_MESSAGES[e.code] ?? e.message;
  }
  return "Something went wrong. Please try again.";
}

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function toIso(local: string): string {
  return new Date(local).toISOString();
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function emptyRow(): FoodRow {
  return { name: "", quantity: "", dietary_type: "VEG", allergens: "", allergen_info_unknown: false };
}

function readDraft(): Partial<Draft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}

function readRepeatRows(): FoodRow[] | null {
  try {
    const raw = sessionStorage.getItem(REPEAT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      food_items?: { name?: string; quantity_servings?: number; dietary_type?: string }[];
    };
    const items = parsed.food_items ?? [];
    if (items.length === 0) return null;
    return items.map((f) => ({
      name: f.name ?? "",
      quantity: f.quantity_servings !== undefined ? String(f.quantity_servings) : "",
      dietary_type: f.dietary_type ?? "VEG",
      allergens: "",
      allergen_info_unknown: false,
    }));
  } catch {
    return null;
  }
}

function validateFood(rows: FoodRow[]): Record<number, FoodErr> {
  const errs: Record<number, FoodErr> = {};
  rows.forEach((r, i) => {
    const e: FoodErr = {};
    if (!r.name.trim()) e.name = "Enter a food name.";
    const q = Number(r.quantity);
    if (!r.quantity.trim() || !Number.isFinite(q) || q <= 0) {
      e.quantity = "Enter the number of servings, greater than 0.";
    }
    if (e.name || e.quantity) errs[i] = e;
  });
  return errs;
}

function validateTiming(prepared: string, pickup: string, attest: boolean): Record<string, string> {
  const errs: Record<string, string> = {};
  const p = new Date(prepared);
  const k = new Date(pickup);
  if (!prepared || Number.isNaN(p.getTime())) errs.prepared = "Enter when the food was prepared.";
  if (!pickup || Number.isNaN(k.getTime())) {
    errs.pickup = "Enter a pickup deadline.";
  } else if (k.getTime() <= Date.now()) {
    errs.pickup = "The pickup deadline must be in the future.";
  } else if (!Number.isNaN(p.getTime()) && k.getTime() <= p.getTime()) {
    errs.pickup = "The pickup deadline must be after the prepared time.";
  }
  if (!attest) errs.attest = "Confirm the safety attestation to continue.";
  return errs;
}

export default function CreateRescuePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Idempotency key: generated once per mount, reused on every retry.
  const idemRef = useRef<string>("");
  if (!idemRef.current) idemRef.current = crypto.randomUUID().replace(/-/g, "");

  const [draft] = useState<Partial<Draft> | null>(() => readDraft());
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [rows, setRows] = useState<FoodRow[]>(
    () => readRepeatRows() ?? (draft?.rows && draft.rows.length > 0 ? draft.rows : [emptyRow()]),
  );
  const [foodErrs, setFoodErrs] = useState<Record<number, FoodErr>>({});

  const [untouched, setUntouched] = useState<"" | "yes" | "no">(draft?.untouched ?? "");
  const [holding, setHolding] = useState<string>(draft?.holding ?? "");
  const [packaging, setPackaging] = useState<boolean>(draft?.packaging ?? false);
  const [notes, setNotes] = useState<string>(draft?.notes ?? "");
  const [handErrs, setHandErrs] = useState<Record<string, string>>({});

  const [prepared, setPrepared] = useState<string>(
    () => draft?.prepared ?? toLocalInput(new Date(Date.now() - 30 * 60 * 1000)),
  );
  const [pickup, setPickup] = useState<string>(
    () => draft?.pickup ?? toLocalInput(new Date(Date.now() + 50 * 60 * 1000)),
  );
  const [locality, setLocality] = useState<string>(draft?.locality ?? "");
  const [attest, setAttest] = useState<boolean>(draft?.attest ?? false);
  const [timingErrs, setTimingErrs] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The repeat payload is consumed once; the draft keeps everything else.
  useEffect(() => {
    sessionStorage.removeItem(REPEAT_KEY);
  }, []);

  // Autosave the draft (never the idempotency key).
  useEffect(() => {
    const d: Draft = { rows, untouched, holding, packaging, notes, prepared, pickup, locality, attest };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      // Storage unavailable or full: autosave is best-effort.
    }
  }, [rows, untouched, holding, packaging, notes, prepared, pickup, locality, attest]);

  function updateRow(i: number, patch: Partial<FoodRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setFoodErrs({});
  }

  function buildBody() {
    return {
      idempotency_key: idemRef.current,
      food_items: rows.map((r) => ({
        name: r.name.trim(),
        quantity_servings: Number(r.quantity),
        dietary_type: r.dietary_type,
        allergens: splitList(r.allergens),
        allergen_info_unknown: r.allergen_info_unknown,
      })),
      untouched_confirmed: untouched === "yes",
      holding_condition: holding,
      packaging_available: packaging,
      notes: notes.trim() || null,
      prepared_at: toIso(prepared),
      pickup_by: toIso(pickup),
      locality: locality.trim() || null,
      safety_attestation: attest,
    };
  }

  const create = useMutation({
    mutationFn: () =>
      apiRequest<RescueDetail & { matching_error?: boolean }>("/rescues", {
        method: "POST",
        token,
        body: buildBody(),
      }),
    onMutate: () => setSubmitError(null),
    onSuccess: (data) => {
      // If matching_error is set, the rescue is still saved; the active page offers Retry matching.
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/donor/rescue/${data.id}`);
    },
    onError: (e) => setSubmitError(errorText(e)),
  });

  function nextFromFood() {
    const errs = validateFood(rows);
    setFoodErrs(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  }

  function nextFromHandling() {
    const errs: Record<string, string> = {};
    if (untouched !== "yes") errs.untouched = "RescueRelay can only redistribute untouched food.";
    if (!holding) errs.holding = "Choose how the food was held.";
    setHandErrs(errs);
    if (Object.keys(errs).length === 0) setStep(3);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step !== 3) return;
    const errs = validateTiming(prepared, pickup, attest);
    setTimingErrs(errs);
    if (Object.keys(errs).length > 0) return;
    create.mutate();
  }

  const blocked = untouched === "no";

  return (
    <AppShell title="Rescue food" nav="donor">
      <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-gray-600">Step {step} of 3</p>
          <h2 className="text-2xl font-semibold text-gray-900">
            {step === 1 && "Food"}
            {step === 2 && "Handling"}
            {step === 3 && "Deadline"}
          </h2>
        </div>

        {step === 1 && (
          <section className="flex flex-col gap-6" aria-label="Food items">
            {rows.map((row, i) => {
              const err = foodErrs[i];
              return (
                <fieldset key={i} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
                  <legend className="px-1 font-semibold text-gray-900">Item {i + 1}</legend>

                  <Input
                    label="Food name"
                    name={`food-name-${i}`}
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    error={err?.name}
                    maxLength={120}
                  />

                  <div className="flex flex-col gap-2">
                    <Input
                      label="Servings"
                      name={`food-qty-${i}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(i, { quantity: e.target.value })}
                      error={err?.quantity}
                    />
                    <div className="flex flex-wrap gap-2" role="group" aria-label={`Quick servings for item ${i + 1}`}>
                      {QUICK_QUANTITIES.map((n) => (
                        <Button
                          key={n}
                          type="button"
                          variant="secondary"
                          className="min-h-[44px]"
                          aria-label={`Set item ${i + 1} to ${n} servings`}
                          onClick={() => updateRow(i, { quantity: String(n) })}
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`food-diet-${i}`} className="text-sm font-medium text-gray-800">
                      Dietary type
                    </label>
                    <select
                      id={`food-diet-${i}`}
                      name={`food-diet-${i}`}
                      value={row.dietary_type}
                      onChange={(e) => updateRow(i, { dietary_type: e.target.value })}
                      className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2"
                    >
                      {DIETARY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Allergens (comma-separated)"
                    name={`food-allergens-${i}`}
                    value={row.allergens}
                    onChange={(e) => updateRow(i, { allergens: e.target.value })}
                    hint="For example: nuts, dairy, gluten"
                  />

                  <label className="flex min-h-[44px] items-center gap-3 text-gray-800">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={row.allergen_info_unknown}
                      onChange={(e) => updateRow(i, { allergen_info_unknown: e.target.checked })}
                    />
                    Allergen information is unknown
                  </label>

                  {rows.length > 1 && (
                    <Button type="button" variant="ghost" className="min-h-[44px] self-start" onClick={() => removeRow(i)}>
                      Remove item {i + 1}
                    </Button>
                  )}
                </fieldset>
              );
            })}

            <Button type="button" variant="secondary" className="min-h-[44px] self-start" onClick={addRow}>
              Add item
            </Button>
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-6" aria-label="Handling">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 font-semibold text-gray-900">
                Was this food untouched and not served to guests?
              </legend>
              {[
                { value: "yes" as const, label: "Yes, untouched" },
                { value: "no" as const, label: "No, it was served or mixed" },
              ].map((o) => (
                <label
                  key={o.value}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                    untouched === o.value ? "border-emerald-700 bg-emerald-50" : "border-gray-300 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="untouched"
                    value={o.value}
                    checked={untouched === o.value}
                    onChange={() => {
                      setUntouched(o.value);
                      setHandErrs({});
                    }}
                    className="h-5 w-5"
                  />
                  <span>{o.label}</span>
                </label>
              ))}
              {handErrs.untouched && (
                <p className="text-sm text-red-700">{handErrs.untouched}</p>
              )}
            </fieldset>

            {blocked && (
              <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                RescueRelay can only redistribute untouched food, so this listing can't be posted.
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label htmlFor="holding" className="text-sm font-medium text-gray-800">
                How was the food held? <span aria-hidden="true">*</span>
              </label>
              <select
                id="holding"
                name="holding"
                required
                aria-invalid={handErrs.holding ? true : undefined}
                aria-describedby={handErrs.holding ? "holding-error" : undefined}
                value={holding}
                onChange={(e) => setHolding(e.target.value)}
                className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">Choose one</option>
                {HOLDING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {handErrs.holding && (
                <p id="holding-error" className="text-sm text-red-700">
                  {handErrs.holding}
                </p>
              )}
            </div>

            <label className="flex min-h-[44px] items-center gap-3 text-gray-800">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={packaging}
                onChange={(e) => setPackaging(e.target.checked)}
              />
              Packaging is available
            </label>

            <div className="flex flex-col gap-1">
              <label htmlFor="notes" className="text-sm font-medium text-gray-800">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2"
              />
              <p className="text-xs text-gray-600">{notes.length}/500 characters</p>
            </div>

            <SafetyNotice />
          </section>
        )}

        {step === 3 && (
          <section className="flex flex-col gap-6" aria-label="Deadline">
            <Input
              label="Prepared at"
              name="prepared_at"
              type="datetime-local"
              value={prepared}
              onChange={(e) => setPrepared(e.target.value)}
              error={timingErrs.prepared}
            />
            <Input
              label="Pickup by"
              name="pickup_by"
              type="datetime-local"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              error={timingErrs.pickup}
            />
            <Input
              label="Locality (optional)"
              name="locality"
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              hint="Neighbourhood or area where the food is collected"
            />
            <div className="flex flex-col gap-1">
              <label className="flex min-h-[44px] items-center gap-3 text-gray-800">
                <input
                  type="checkbox"
                  name="attest"
                  className="h-5 w-5"
                  checked={attest}
                  aria-invalid={timingErrs.attest ? true : undefined}
                  onChange={(e) => setAttest(e.target.checked)}
                />
                I attest this food is untouched, was held safely, and is safe to redistribute. <span aria-hidden="true">*</span>
              </label>
              {timingErrs.attest && <p className="text-sm text-red-700">{timingErrs.attest}</p>}
            </div>
          </section>
        )}

        {submitError && (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            {submitError}
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3">
          {step > 1 ? (
            <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
              Back
            </Button>
          ) : (
            <span />
          )}

          {step === 1 && (
            <Button type="button" variant="primary" className="min-h-[44px]" onClick={nextFromFood}>
              Next
            </Button>
          )}
          {step === 2 && (
            <Button type="button" variant="primary" className="min-h-[44px]" onClick={nextFromHandling} disabled={blocked}>
              Next
            </Button>
          )}
          {step === 3 && (
            <Button type="submit" variant="primary" className="min-h-[44px]" disabled={create.isPending}>
              {create.isPending ? "Finding a rescue..." : "Find a rescue"}
            </Button>
          )}
        </div>
      </form>
    </AppShell>
  );
}
