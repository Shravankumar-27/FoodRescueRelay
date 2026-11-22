import SaveDonationReminder from "../../components/rescue/SaveDonationReminder";
import { localDateTime, parseSurplus } from "../../lib/smartPaste";
import { DIETS, CATEGORIES, foodLabel } from "../../lib/food";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronRight, ChevronLeft, Clock, Minus, Check, Send, Soup, Drumstick, Wheat, Salad, CakeSlice, Utensils } from "lucide-react";
import HandlingIcon from "../../components/ui/HandlingIcon";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { ApiError, apiRequest } from "../../lib/api";
import { randomId } from "../../lib/randomId";
import type { RescueDetail } from "../../types/api";

type FoodRow = {
  name: string;
  quantity: string;
  dietary_type: string;
  food_category: string;
  allergens: string;
  allergen_info_unknown: boolean;
};

type Draft = {
  rows: FoodRow[];
  untouched: "" | "yes";
  holding: string;
  notes: string;
  prepared: string;
  pickup: string;
  holdHours?: Record<string, number>;
  locality: string;
  attest: boolean;
};

type FoodErr = { name?: string; quantity?: string };

const DRAFT_KEY = "rr.draft";
const REPEAT_KEY = "rr.repeat";

// Food type quick-chips (Hyderabad-focused catering menu)
const FOOD_CHIPS = [
  { icon: Soup, label: "Veg Biryani", name: "Veg Biryani", dietary: "VEG" },
  { icon: Drumstick, label: "Chicken Biryani", name: "Chicken Biryani", dietary: "NON_VEG" },
  { icon: Soup, label: "Dal Tadka", name: "Dal Tadka", dietary: "VEG" },
  { icon: Utensils, label: "Paneer Butter Masala", name: "Paneer Butter Masala", dietary: "VEG" },
  { icon: Wheat, label: "Chapati + Curry", name: "Chapati with Curry", dietary: "VEG" },
  { icon: Soup, label: "Plain Rice", name: "Plain Rice", dietary: "VEG" },
  { icon: Salad, label: "Mixed Veg Curry", name: "Mixed Veg Curry", dietary: "VEG" },
  { icon: Soup, label: "Sambar", name: "Sambar", dietary: "VEG" },
  { icon: Soup, label: "Haleem", name: "Haleem", dietary: "NON_VEG" },
  { icon: CakeSlice, label: "Sweets / Dessert", name: "Sweets", dietary: "VEG" },
];

const QUICK_QUANTITIES = [25, 50, 100, 200];

const DIETARY_OPTIONS = DIETS.map(value => ({ value, label: foodLabel(value) }));

const HOLDING_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "HOT_HELD", label: "Kept hot", desc: "Above 60 °C (chafing dish / hot box)" },
  { value: "REFRIGERATED", label: "Refrigerated", desc: "Below 5 °C since preparation" },
  { value: "ROOM_TEMPERATURE", label: "Room temperature", desc: "Record time out of temperature control" },
  { value: "OTHER", label: "Other", desc: "Describe in notes below" },
  { value: "UNKNOWN", label: "Not sure", desc: "Please add details in notes" },
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
  return { name: "", quantity: "", dietary_type: "VEG", food_category: "COOKED_MEAL", allergens: "", allergen_info_unknown: false };
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
      food_items?: { name?: string; quantity_servings?: number; dietary_type?: string; food_category?: string; allergens?: string[]; allergen_info_unknown?: boolean }[];
    };
    const items = parsed.food_items ?? [];
    if (items.length === 0) return null;
    return items.map((f) => ({
      name: f.name ?? "",
      quantity: f.quantity_servings !== undefined ? String(f.quantity_servings) : "",
      dietary_type: f.dietary_type ?? "VEG",
      food_category: f.food_category ?? "COOKED_MEAL",
      allergens: (f.allergens ?? []).join(", "),
      allergen_info_unknown: f.allergen_info_unknown ?? true,
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
    else if (r.name.trim().length > 160) e.name = "Use 160 characters or fewer.";
    const q = Number(r.quantity);
    if (!r.quantity.trim() || !Number.isInteger(q) || q < 1 || q > 100000) {
      e.quantity = "Enter a whole number from 1 to 100,000.";
    }
    if (e.name || e.quantity) errs[i] = e;
  });
  return errs;
}

function validateTiming(prepared: string, pickup: string, attest: boolean, now: number): Record<string, string> {
  const errs: Record<string, string> = {};
  const p = new Date(prepared);
  const k = new Date(pickup);
  if (!prepared || Number.isNaN(p.getTime())) errs.prepared = "Enter when the food was prepared.";
  else if (p.getTime() > now) errs.prepared = "Preparation time cannot be in the future.";
  if (!pickup || Number.isNaN(k.getTime())) {
    errs.pickup = "Enter a pickup deadline.";
  } else if (k.getTime() <= now) {
    errs.pickup = "The pickup deadline must be in the future.";
  } else if (!Number.isNaN(p.getTime()) && k.getTime() <= p.getTime()) {
    errs.pickup = "The pickup deadline must be after the prepared time.";
  }
  if (!attest) errs.attest = "Confirm the safety attestation to continue.";
  return errs;
}

function PickupCountdown({ pickup, now }: { pickup: string; now: number }) {
  const ms = new Date(pickup).getTime() - now;
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
    <ol className="grid w-full grid-cols-3">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <li key={s} aria-current={active ? "step" : undefined} className="relative min-w-0">
            {i < steps.length - 1 && <span aria-hidden="true"
              className={`absolute left-1/2 top-3.5 h-0.5 w-full ${done ? "bg-primary" : "bg-border"}`}/>}
            <div className="relative flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${done
                    ? "bg-primary text-white"
                    : active
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-border text-muted"
                  }`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true"/> : idx}
              </div>
              <span className={`mt-1 text-xs font-medium ${active ? "text-primary" : done ? "text-primary" : "text-muted"}`}>
                {s}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function CreateRescuePage() {
  const { token, organization } = useAuth();
  const navigate = useNavigate();
  const { toast, error: toastError } = useToast();

  const idemRef = useRef<string>("");
  const draftWriteFailed = useRef(false);
  if (!idemRef.current) idemRef.current = randomId();

  const [draft] = useState<Partial<Draft> | null>(() => sessionStorage.getItem(REPEAT_KEY) ? null : readDraft());
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draftSaved, setDraftSaved] = useState(false);

  const [rows, setRows] = useState<FoodRow[]>(
    () => readRepeatRows() ?? (draft?.rows && draft.rows.length > 0 ? draft.rows : [emptyRow()]),
  );
  const [foodErrs, setFoodErrs] = useState<Record<number, FoodErr>>({});

  const [untouched, setUntouched] = useState<"" | "yes">(draft?.untouched === "yes" ? "yes" : "");
  const [holding, setHolding] = useState<string>(draft?.holding ?? "");
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
  const [customTime, setCustomTime] = useState(false);
  const [paste, setPaste] = useState("");
  const [pasteStatus, setPasteStatus] = useState("");
  const [holdHours, setHoldHours] = useState<Record<string, number>>(draft?.holdHours ?? {});
  const holdTimes = useQuery({
    queryKey: ["hold-times"],
    queryFn: () => apiRequest<{
      categories: { category: string; max_hours: number; storage_note: string; allergen_prompt: string; source: string; verified: boolean }[];
      delivery_minutes: number;
      guidance: string;
      clock_offset_ms?: number;
    }>("/hold-times"),
  });
  const clockOffset = holdTimes.data?.clock_offset_ms ?? 0;
  const now = () => Date.now() + clockOffset;
  const selectedHours = rows.map(row => {
    const category = row.food_category || "COOKED_MEAL";
    return holdHours[category] ?? holdTimes.data?.categories?.find(rule => rule.category === category)?.max_hours;
  });
  const hours = Math.min(...selectedHours.map(hour => hour ?? Infinity));
  const consume = new Date(new Date(prepared).getTime() + hours * 3_600_000);
  const pickupCap = new Date(consume.getTime() - (holdTimes.data?.delivery_minutes ?? 30) * 60_000);
  const capped = Number.isFinite(pickupCap.getTime()) && new Date(pickup) > pickupCap;
  const effectivePickup = capped ? localDateTime(pickupCap) : pickup;

  function applyPaste() {
    const parsed = parseSurplus(paste, new Date(now()));
    if (!parsed) {
      setPasteStatus("Use a quantity, food name, cooked time and pickup time in the example format.");
      return;
    }
    const dietary_type = /\b(?:veg|vegetarian)\b/i.test(parsed.food) && !/\bnon[ -]?veg/i.test(parsed.food) ? "VEG" : "UNKNOWN";
    setRows([{ ...emptyRow(), name: parsed.food, quantity: String(parsed.quantity), dietary_type, allergen_info_unknown: true }]);
    setPrepared(parsed.prepared);
    setPickup(parsed.pickup);
    setCustomTime(true);
    setAttest(false);
    setFoodErrs({});
    setPasteStatus(`Filled ${parsed.quantity} servings of ${parsed.food}. Review the food, allergens and both dates before posting.`);
  }


  useEffect(() => {
    sessionStorage.removeItem(REPEAT_KEY);
  }, []);

  // Autosave draft
  useEffect(() => {
    const d: Draft = { rows, untouched, holding, notes, prepared, pickup, holdHours, locality, attest };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      draftWriteFailed.current = false;
      setDraftSaved(true);
      const t = setTimeout(() => setDraftSaved(false), 1500);
      return () => clearTimeout(t);
    } catch {
      if (!draftWriteFailed.current) toastError("Could not save the draft on this device.");
      draftWriteFailed.current = true;
    }
  }, [rows, untouched, holding, notes, prepared, pickup, holdHours, locality, attest, toastError]);

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
    setPickup(toLocalInput(new Date(now() + mins * 60 * 1000)));
    setCustomTime(false);
  }

  function foodItems() {
    return rows.map((r) => ({
        name: r.name.trim(),
        quantity_servings: Number(r.quantity),
        dietary_type: r.dietary_type,
        food_category: r.food_category || "COOKED_MEAL",
        allergens: splitList(r.allergens),
        allergen_info_unknown: r.allergen_info_unknown,
      }));
  }

  function buildBody() {
    return {
      idempotency_key: idemRef.current,
      food_items: foodItems(),
      untouched_confirmed: untouched === "yes",
      served_or_mixed_with_waste: false,
      handling_type: holding,
      handling_notes: notes.trim() || null,
      prepared_at: toIso(prepared),
      pickup_by: toIso(pickup),
      hold_hours: holdHours,
      locality: locality.trim() || null,
      safety_attestation: attest,
    };
  }

  const create = useMutation({
    mutationFn: () =>
      apiRequest<RescueDetail & { matching_error?: boolean; pickup_was_capped?: boolean }>("/rescues", {
        method: "POST",
        token,
        body: buildBody(),
      }),
    meta: { silent: true },
    onSuccess: (data) => {
      localStorage.removeItem(DRAFT_KEY);
      toast({ variant: "success", title: "Rescue posted!", message: data.pickup_was_capped ? "Pickup was capped to leave time for estimated delivery." : "Finding the best match nearby." });
      navigate(`/donor/rescue/${data.id}`);
    },
    onError: (e) => toastError(errorText(e)),
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
    const errs = validateTiming(prepared, effectivePickup, attest, now());
    setTimingErrs(errs);
    if (Object.keys(errs).length > 0) return;
    create.mutate();
  }


  return (
    <AppShell title="Post surplus" nav="donor">
      <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-2xl flex-col gap-6">
        {/* Step bar */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
            <StepBar step={step} />
          </div>
          <span className={`-mt-2 flex min-h-4 items-center justify-end gap-1.5 text-xs text-primary ${draftSaved ? "" : "invisible"}`}><Check className="h-3.5 w-3.5" aria-hidden="true"/>Draft saved</span>
        </div>

        {/* ── STEP 1: Food ── */}
        {step === 1 && (
          <section className="flex flex-col gap-6" aria-label="Food items">
            <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
              <label htmlFor="smart-paste" className="text-sm font-semibold">Smart paste</label>
              <textarea id="smart-paste" maxLength={250} value={paste} onChange={e => setPaste(e.target.value)} placeholder="200 plates veg biryani, cooked 9pm, pickup by 11:30" className="w-full rounded-xl border border-border p-3"/>
              <Button type="button" variant="secondary" onClick={applyPaste}>Fill form for review</Button>
              {pasteStatus && <p role="status" className="text-sm text-muted">{pasteStatus}</p>}
            </div>
            {organization && <SaveDonationReminder org={organization.id} getItems={() => {
              const errors = validateFood(rows);
              setFoodErrs(errors);
              return Object.keys(errors).length ? null : foodItems();
            }}/>}
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
                    <chip.icon aria-hidden="true" className="mr-1.5 inline-block h-4 w-4 shrink-0 align-text-bottom" strokeWidth={1.75}/>{chip.label}
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

                  <label className="flex flex-col gap-2 text-sm font-semibold">Food category<select value={row.food_category || "COOKED_MEAL"} onChange={e => updateRow(i, { food_category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{foodLabel(c)}</option>)}</select></label>
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
            <div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm font-semibold">
                <input type="checkbox" checked={untouched === "yes"} onChange={event => {
                  setUntouched(event.target.checked ? "yes" : "");
                  setHandErrs(current => ({ ...current, untouched: "" }));
                }}/>
                I confirm the food was never served or mixed with waste.
              </label>
              {handErrs.untouched && <p className="mt-2 text-sm text-urgent">{handErrs.untouched}</p>}
            </div>

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
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primaryLight/50 text-primary"><HandlingIcon type={o.value} className="h-5 w-5"/></span>
                  <div>
                    <p className="font-medium text-ink">{o.label}</p>
                    <p className="text-xs text-muted">{o.desc}</p>
                  </div>
                  {holding === o.value && (
                    <div className="ml-auto h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" aria-hidden="true"/>
                    </div>
                  )}
                </label>
              ))}
              {handErrs.holding && <p className="text-sm text-urgent">{handErrs.holding}</p>}
            </fieldset>

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
                placeholder="Extra handling details. Leave addresses and contact details out."
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
              <p className="text-xs text-muted">{notes.length}/500</p>
            </div>

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

            {!!clockOffset && <Button type="button" variant="secondary" onClick={() => {
              setPrepared(localDateTime(new Date(now())));
              setPickupPreset(60);
            }}>Use current demo time</Button>}
            <div className="space-y-2 rounded-xl border border-border bg-surface p-4 text-sm">
              <p>{holdTimes.data?.guidance ?? "Default guidance, not a food-safety certification."}</p>
              {Number.isFinite(consume.getTime()) && <p className="font-semibold">Consume by {consume.toLocaleString("en-IN")}. Pickup must leave {holdTimes.data?.delivery_minutes} minutes for estimated delivery.</p>}
              {capped && <p role="alert" className="font-semibold text-warn">Requested pickup is too late. It will be capped at {pickupCap.toLocaleString("en-IN")}.</p>}
              {holdTimes.isError && <button type="button" className="underline" onClick={() => void holdTimes.refetch()}>Retry hold-time table</button>}
              {holdTimes.data?.categories && <details><summary className="cursor-pointer font-semibold">Edit hold-time table for this listing</summary>
                <div className="mt-2 overflow-x-auto"><table className="min-w-[650px] text-left">
                  <thead><tr>{["Category", "Max hours", "Storage note", "Allergen prompt", "Source", "Verified"].map(label => <th className="p-2" key={label}>{label}</th>)}</tr></thead>
                  <tbody>{holdTimes.data.categories.map(rule => <tr key={rule.category} className="border-t border-border">
                    <th className="p-2">{foodLabel(rule.category)}</th>
                    <td className="p-2"><input aria-label={foodLabel(rule.category) + " max hours"} className="w-20 rounded border border-border p-1" type="number" min={0.5} max={rule.max_hours} step={0.25}
                      value={holdHours[rule.category] ?? rule.max_hours} onChange={e => {
                        const value = e.target.valueAsNumber;
                        if (Number.isFinite(value)) setHoldHours(previous => ({ ...previous, [rule.category]: Math.max(0.5, Math.min(rule.max_hours, value)) }));
                      }}/></td>
                    <td className="p-2">{rule.storage_note}</td><td className="p-2">{rule.allergen_prompt}</td>
                    <td className="p-2">{rule.source}</td><td className="p-2">{rule.verified ? "Yes" : "No"}</td>
                  </tr>)}</tbody>
                </table></div>
              </details>}
            </div>
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
                        Math.abs(new Date(pickup).getTime() - now() - p.mins * 60000) < 90000 &&
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
                  <PickupCountdown pickup={effectivePickup} now={now()} />
                </div>
              )}

              {!customTime && timingErrs.pickup && <p role="alert" className="text-sm text-urgent">{timingErrs.pickup}</p>}
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
                  I confirm the food is untouched and the handling details and pickup deadline are accurate.{" "}
                  <span aria-hidden="true">*</span>
                </span>
              </label>
              {timingErrs.attest && <p className="text-sm text-urgent">{timingErrs.attest}</p>}
            </div>
          </section>
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
                <><Send className="h-4 w-4" aria-hidden="true"/>Post &amp; find a match</>
              )}
            </Button>
          )}
        </div>
      </form>
    </AppShell>
  );
}
