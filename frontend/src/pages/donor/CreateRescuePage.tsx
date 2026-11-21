import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronRight, ChevronLeft, Clock, ThumbsUp, AlertTriangle, Minus } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import SafetyNotice from "../../components/rescue/SafetyNotice";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
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

// Food type quick-chips (Hyderabad-focused catering menu)
const FOOD_CHIPS = [
  { label: "🍚 Veg Biryani", name: "Veg Biryani", dietary: "VEG" },
  { label: "🍗 Chicken Biryani", name: "Chicken Biryani", dietary: "NON_VEG" },
  { label: "🍛 Dal Tadka", name: "Dal Tadka", dietary: "VEG" },
  { label: "🧆 Paneer Butter Masala", name: "Paneer Butter Masala", dietary: "VEG" },
  { label: "🫓 Chapati + Curry", name: "Chapati with Curry", dietary: "VEG" },
  { label: "🍚 Plain Rice", name: "Plain Rice", dietary: "VEG" },
  { label: "🥗 Mixed Veg Curry", name: "Mixed Veg Curry", dietary: "VEG" },
  { label: "🍲 Sambar", name: "Sambar", dietary: "VEG" },
  { label: "🫕 Haleem", name: "Haleem", dietary: "NON_VEG" },
  { label: "🧁 Sweets / Dessert", name: "Sweets", dietary: "VEG" },
];

const QUICK_QUANTITIES = [25, 50, 100, 200];

const DIETARY_OPTIONS: { value: string; label: string }[] = [
  { value: "VEG", label: "🥦 Vegetarian" },
  { value: "NON_VEG", label: "🍗 Non-vegetarian" },
  { value: "VEGAN", label: "🌱 Vegan" },
  { value: "OTHER", label: "Other" },
  { value: "UNKNOWN", label: "Unknown" },
];

const HOLDING_OPTIONS: { value: string; label: string; desc: string; icon: string }[] = [
  { value: "HOT_HELD", label: "Kept hot", desc: "Above 60 °C (chafing dish / hot box)", icon: "🔥" },
  { value: "REFRIGERATED", label: "Refrigerated", desc: "Below 5 °C since preparation", icon: "❄️" },
  { value: "ROOM_TEMPERATURE", label: "Room temperature", desc: "Ambient — consume within 2 hrs", icon: "🌡️" },
  { value: "OTHER", label: "Other", desc: "Describe in notes below", icon: "📦" },
  { value: "UNKNOWN", label: "Not sure", desc: "Please add details in notes", icon: "❓" },
];

// Time presets for pickup
const TIME_PRESETS = [
  { label: "1 hr", mins: 60 },
  { label: "2 hrs", mins: 120 },
  { label: "3 hrs", mins: 180 },
  { label: "Custom", mins: null },
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
    if (e.details && e.details.length > 0) {
      const fieldErrs = e.details
        .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
        .join(", ");
      return `${CLIENT_MESSAGES[e.code] ?? e.message} (${fieldErrs})`;
    }
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

function PickupCountdown({ pickup }: { pickup: string }) {
  const ms = new Date(pickup).getTime() - Date.now();
  if (ms <= 0) return <span className="text-urgent font-semibold">Deadline passed</span>;
  const totalMins = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const color = totalMins > 60 ? "text-fresh" : totalMins > 20 ? "text-warn" : "text-urgent";
  return (
    <span className={`font-semibold ${color}`}>
      {hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`} remaining
    </span>
  );
}

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Food", "Handling", "Deadline"];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${done
                    ? "bg-primary text-white"
                    : active
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-border text-muted"
                  }`}
              >
                {done ? "✓" : idx}
              </div>
              <span className={`mt-1 text-xs font-medium ${active ? "text-primary" : done ? "text-primary" : "text-muted"}`}>
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 mb-5 h-0.5 w-8 sm:w-12 ${idx < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreateRescuePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const idemRef = useRef<string>("");
  if (!idemRef.current) idemRef.current = crypto.randomUUID().replace(/-/g, "");

  const [draft] = useState<Partial<Draft> | null>(() => readDraft());
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draftSaved, setDraftSaved] = useState(false);

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
    () => draft?.pickup ?? toLocalInput(new Date(Date.now() + 90 * 60 * 1000)),
  );
  const [locality, setLocality] = useState<string>(draft?.locality ?? "");
  const [attest, setAttest] = useState<boolean>(draft?.attest ?? false);
  const [timingErrs, setTimingErrs] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(REPEAT_KEY);
  }, []);

  // Autosave draft
  useEffect(() => {
    const d: Draft = { rows, untouched, holding, packaging, notes, prepared, pickup, locality, attest };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      setDraftSaved(true);
      const t = setTimeout(() => setDraftSaved(false), 1500);
      return () => clearTimeout(t);
    } catch {
      // best-effort
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

  function addFoodChip(chip: (typeof FOOD_CHIPS)[0]) {
    // If last row is empty, fill it; otherwise add new row
    setRows((prev) => {
      const last = prev[prev.length - 1];
      if (last && !last.name.trim() && !last.quantity.trim()) {
        return prev.map((r, i) =>
          i === prev.length - 1 ? { ...r, name: chip.name, dietary_type: chip.dietary } : r,
        );
      }
      return [...prev, { ...emptyRow(), name: chip.name, dietary_type: chip.dietary }];
    });
  }

  function setPickupPreset(mins: number) {
    setPickup(toLocalInput(new Date(Date.now() + mins * 60 * 1000)));
    setCustomTime(false);
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
      served_or_mixed_with_waste: untouched === "no",
      handling_type: holding,
      handling_notes: notes.trim() || null,
      packaging_available: packaging,
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
      localStorage.removeItem(DRAFT_KEY);
      toast({ variant: "success", title: "Rescue posted!", message: "Finding the best match nearby." });
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
    <AppShell title="Post surplus" nav="donor">
      <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-2xl flex-col gap-6">
        {/* Step bar */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <StepBar step={step} />
            {draftSaved && (
              <span className="text-xs text-fresh animate-fade-in">Draft saved ✓</span>
            )}
          </div>
        </div>

        {/* ── STEP 1: Food ── */}
        {step === 1 && (
          <section className="flex flex-col gap-6" aria-label="Food items">
            {/* Quick chips */}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Quick select (tap to add)</p>
              <div className="flex flex-wrap gap-2">
                {FOOD_CHIPS.map((chip) => (
                  <button
                    key={chip.name}
                    type="button"
                    onClick={() => addFoodChip(chip)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:border-primary hover:bg-primaryLight transition-colors active:scale-95"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Food rows */}
            {rows.map((row, i) => {
              const err = foodErrs[i];
              return (
                <fieldset
                  key={i}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <legend className="font-semibold text-ink">Item {i + 1}</legend>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-urgent transition-colors"
                        aria-label={`Remove item ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <Input
                    label="Food name"
                    name={`food-name-${i}`}
                    value={row.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    error={err?.name}
                    maxLength={120}
                    placeholder="e.g. Veg Biryani"
                  />

                  {/* Quantity stepper */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-ink">
                      Servings (meals) <span aria-hidden="true">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateRow(i, { quantity: String(Math.max(1, Number(row.quantity) - 10)) })}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-ink hover:border-primary transition-colors"
                        aria-label="Decrease servings"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => updateRow(i, { quantity: e.target.value })}
                        aria-label={`Servings for item ${i + 1}`}
                        className={`w-20 rounded-xl border px-3 py-2 text-center text-lg font-bold text-ink focus:outline-none focus:ring-2 focus:ring-primary ${err?.quantity ? "border-urgent" : "border-border"}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateRow(i, { quantity: String(Number(row.quantity || 0) + 10) })}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-ink hover:border-primary transition-colors"
                        aria-label="Increase servings"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Quick qty chips */}
                    <div className="flex flex-wrap gap-2" role="group" aria-label={`Quick quantities for item ${i + 1}`}>
                      {QUICK_QUANTITIES.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateRow(i, { quantity: String(n) })}
                          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${row.quantity === String(n)
                              ? "border-primary bg-primaryLight text-primary"
                              : "border-border text-muted hover:border-primary"
                            }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    {err?.quantity && <p className="text-sm text-urgent">{err.quantity}</p>}
                  </div>

                  {/* Dietary type chips */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-ink">Dietary type</label>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY_OPTIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => updateRow(i, { dietary_type: o.value })}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${row.dietary_type === o.value
                              ? "border-primary bg-primaryLight text-primary"
                              : "border-border text-muted hover:border-primary"
                            }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Allergens (comma-separated)"
                    name={`food-allergens-${i}`}
                    value={row.allergens}
                    onChange={(e) => updateRow(i, { allergens: e.target.value })}
                    hint="E.g. nuts, dairy, gluten"
                    placeholder="Leave blank if none"
                  />

                  <label className="flex min-h-[44px] items-center gap-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded accent-primary"
                      checked={row.allergen_info_unknown}
                      onChange={(e) => updateRow(i, { allergen_info_unknown: e.target.checked })}
                    />
                    Allergen information is unknown
                  </label>
                </fieldset>
              );
            })}

            <Button type="button" variant="secondary" className="min-h-[44px] self-start flex items-center gap-2" onClick={addRow}>
              <Plus className="h-4 w-4" /> Add another item
            </Button>
          </section>
        )}

        {/* ── STEP 2: Handling ── */}
        {step === 2 && (
          <section className="flex flex-col gap-6" aria-label="Handling">
            {/* Untouched question */}
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 font-semibold text-ink">
                Was this food untouched and not served to guests?
              </legend>
              {[
                { value: "yes" as const, label: "Yes, untouched", desc: "Food was never served or mixed with waste", icon: <ThumbsUp className="h-5 w-5 text-fresh" /> },
                { value: "no" as const, label: "No, it was served or mixed", desc: "This food cannot be redistributed", icon: <AlertTriangle className="h-5 w-5 text-urgent" /> },
              ].map((o) => (
                <label
                  key={o.value}
                  className={`flex min-h-[60px] cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors ${untouched === o.value
                      ? o.value === "yes"
                        ? "border-fresh bg-fresh/5"
                        : "border-urgent bg-urgent/5"
                      : "border-border bg-surface hover:border-primary/50"
                    }`}
                >
                  <input
                    type="radio"
                    name="untouched"
                    value={o.value}
                    checked={untouched === o.value}
                    onChange={() => { setUntouched(o.value); setHandErrs({}); }}
                    className="sr-only"
                  />
                  {o.icon}
                  <div>
                    <p className="font-medium text-ink">{o.label}</p>
                    <p className="text-xs text-muted">{o.desc}</p>
                  </div>
                </label>
              ))}
              {handErrs.untouched && <p className="text-sm text-urgent">{handErrs.untouched}</p>}
            </fieldset>

            {blocked && (
              <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-4 text-urgent">
                <p className="font-semibold">Can't post this listing</p>
                <p className="text-sm mt-1">RescueRelay can only redistribute untouched food that hasn't been served to guests.</p>
              </div>
            )}

            {/* Handling type — visual radio cards */}
            <fieldset className="flex flex-col gap-3">
              <legend className="font-semibold text-ink">
                How was the food held? <span aria-hidden="true">*</span>
              </legend>
              {HOLDING_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex min-h-[60px] cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors ${holding === o.value
                      ? "border-primary bg-primaryLight"
                      : "border-border bg-surface hover:border-primary/50"
                    }`}
                >
                  <input
                    type="radio"
                    name="holding"
                    value={o.value}
                    checked={holding === o.value}
                    onChange={() => { setHolding(o.value); setHandErrs((e) => ({ ...e, holding: "" })); }}
                    className="sr-only"
                  />
                  <span className="text-2xl">{o.icon}</span>
                  <div>
                    <p className="font-medium text-ink">{o.label}</p>
                    <p className="text-xs text-muted">{o.desc}</p>
                  </div>
                  {holding === o.value && (
                    <div className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </label>
              ))}
              {handErrs.holding && <p className="text-sm text-urgent">{handErrs.holding}</p>}
            </fieldset>

            <label className="flex min-h-[44px] items-center gap-3 text-sm text-ink">
              <input
                type="checkbox"
                className="h-5 w-5 rounded accent-primary"
                checked={packaging}
                onChange={(e) => setPackaging(e.target.checked)}
              />
              Packaging / containers are available for transfer
            </label>

            <div className="flex flex-col gap-1">
              <label htmlFor="notes" className="text-sm font-medium text-ink">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra handling details, special requirements, etc."
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-xs text-muted">{notes.length}/500</p>
            </div>

            <SafetyNotice />
          </section>
        )}

        {/* ── STEP 3: Deadline ── */}
        {step === 3 && (
          <section className="flex flex-col gap-6" aria-label="Pickup deadline">
            <Input
              label="Prepared at"
              name="prepared_at"
              type="datetime-local"
              value={prepared}
              onChange={(e) => setPrepared(e.target.value)}
              error={timingErrs.prepared}
            />

            {/* Time presets */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink">
                Pickup window <span aria-hidden="true">*</span>
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Pickup time presets">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (p.mins !== null) {
                        setPickupPreset(p.mins);
                      } else {
                        setCustomTime(true);
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${(p.mins !== null &&
                        Math.abs(new Date(pickup).getTime() - Date.now() - p.mins * 60000) < 90000 &&
                        !customTime) ||
                        (p.mins === null && customTime)
                        ? "border-primary bg-primaryLight text-primary"
                        : "border-border text-muted hover:border-primary"
                      }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {p.label}
                  </button>
                ))}
              </div>

              {customTime && (
                <Input
                  label=""
                  name="pickup_by"
                  type="datetime-local"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  error={timingErrs.pickup}
                />
              )}

              {!customTime && pickup && (
                <div className="rounded-xl border border-border bg-surface p-3 text-sm">
                  <span className="text-muted">Pickup by: </span>
                  <span className="font-medium text-ink">
                    {new Date(pickup).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  {" · "}
                  <PickupCountdown pickup={pickup} />
                </div>
              )}

              {timingErrs.pickup && <p className="text-sm text-urgent">{timingErrs.pickup}</p>}
            </div>

            <Input
              label="Locality (optional)"
              name="locality"
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              hint="Neighbourhood or area — approximate only, exact address shared after claim"
              placeholder="e.g. Madhapur, Kondapur"
            />

            <div className="flex flex-col gap-1">
              <label
                className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm transition-colors ${attest ? "border-fresh bg-fresh/5" : "border-border bg-surface"
                  }`}
              >
                <input
                  type="checkbox"
                  name="attest"
                  className="mt-0.5 h-5 w-5 rounded accent-primary shrink-0"
                  checked={attest}
                  aria-invalid={timingErrs.attest ? true : undefined}
                  onChange={(e) => setAttest(e.target.checked)}
                />
                <span className="text-ink">
                  I confirm this food is untouched, was held safely, and is safe to redistribute.{" "}
                  <span aria-hidden="true">*</span>
                </span>
              </label>
              {timingErrs.attest && <p className="text-sm text-urgent">{timingErrs.attest}</p>}
            </div>
          </section>
        )}

        {submitError && (
          <div role="alert" className="rounded-xl border border-urgent/30 bg-urgent/5 p-4 text-urgent">
            {submitError}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex flex-wrap justify-between gap-3 pb-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-[44px] flex items-center gap-1"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <span />
          )}

          {step === 1 && (
            <Button type="button" variant="primary" className="min-h-[44px] flex items-center gap-1" onClick={nextFromFood}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 2 && (
            <Button
              type="button"
              variant="primary"
              className="min-h-[44px] flex items-center gap-1"
              onClick={nextFromHandling}
              disabled={blocked}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button
              type="submit"
              variant="primary"
              className="min-h-[44px] flex items-center gap-2"
              disabled={create.isPending}
            >
              {create.isPending ? (
                <>Finding match…</>
              ) : (
                <>🚀 Post &amp; Find Match</>
              )}
            </Button>
          )}
        </div>
      </form>
    </AppShell>
  );
}
