import { DIETS, CATEGORIES, foodLabel } from "../../lib/food";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import { useAuth } from "../../features/auth/AuthContext";
import { ApiError, apiRequest } from "../../lib/api";
import type { CapacityData } from "../../types/api";
import { Settings2, Truck, Utensils, Building2, Save } from "lucide-react";

type NeedLevel = "LOW" | "MEDIUM" | "HIGH";

const NEED_LABELS: Record<NeedLevel, string> = {
  LOW: "Low need",
  MEDIUM: "Medium need",
  HIGH: "High need",
};

const CODE_MESSAGES: Record<string, string> = {
  CAPACITY_EXCEEDS_MAX: "Available servings cannot be more than your maximum servings.",
  DIETARY_REQUIRED: "Choose at least one dietary type you accept (vegetarian or non-vegetarian).",
};

interface FormState {
  accepted_dietary_types: string[];
  accepted_food_categories: string[];
  excluded_allergens: string;
  description: string;
  available: boolean;
  max_servings: string;
  available_servings: string;
  accepts_veg: boolean;
  accepts_non_veg: boolean;
  transport_available: boolean;
  containers_available: boolean;
  refrigeration_available: boolean;
  volunteer_servings: string;
  need_level: NeedLevel;
}

export default function CapacitySettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const capacityQuery = useQuery({meta: { errorDisplay: "inline" }, 
    queryKey: ["receiver", "capacity"],
    queryFn: () => apiRequest<CapacityData>("/receivers/capacity", { token }),
    enabled: !!token,
  });

  useEffect(() => {
    const c = capacityQuery.data;
    if (c) {
      setForm({
        accepted_dietary_types: c.accepted_dietary_types ?? [],
        accepted_food_categories: c.accepted_food_categories ?? [],
        excluded_allergens: (c.excluded_allergens ?? []).join(", "),
        description: c.description ?? "",
        available: c.available,
        max_servings: String(c.max_servings),
        available_servings: String(c.available_servings),
        accepts_veg: c.accepts_veg,
        accepts_non_veg: c.accepts_non_veg,
        transport_available: c.transport_available,
        containers_available: c.containers_available ?? true,
        refrigeration_available: c.refrigeration_available ?? false,
        volunteer_servings: c.volunteer_servings == null ? "" : String(c.volunteer_servings),
        need_level: c.need_level as NeedLevel,
      });
    }
  }, [capacityQuery.data]);

  const saveMutation = useMutation({meta: { errorDisplay: "inline" }, 
    mutationFn: (body: CapacityData) =>
      apiRequest<CapacityData>("/receivers/capacity", {
        method: "PUT",
        token,
        body,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["receiver", "capacity"], data);
      queryClient.invalidateQueries({ queryKey: ["receiver", "offers"] });
      setSuccess("Capacity settings saved.");
    },
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    saveMutation.reset();
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSuccess(null);
    setClientError(null);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setSuccess(null);
    saveMutation.reset();

    const max = Number(form.max_servings);
    const avail = Number(form.available_servings);

    if (!form.max_servings.trim() || !Number.isInteger(max) || max < 0 || max > 100000) {
      const message = "Maximum servings must be a whole number between 0 and 100,000.";
      setClientError(message);
      return;
    }
    if (!form.available_servings.trim() || !Number.isInteger(avail) || avail < 0 || avail > 100000) {
      const message = "Available servings must be a whole number between 0 and 100,000.";
      setClientError(message);
      return;
    }
    if (avail > max) {
      const message = "Available servings cannot be more than your maximum servings.";
      setClientError(message);
      return;
    }
    if (!form.accepts_veg && !form.accepts_non_veg) {
      setClientError(CODE_MESSAGES.DIETARY_REQUIRED);
      return;
    }
    if (form.volunteer_servings !== "" && (!Number.isInteger(Number(form.volunteer_servings)) || Number(form.volunteer_servings) < 0 || Number(form.volunteer_servings) > 100000)) {
      const message = "Volunteer capacity must be a whole number between 0 and 100,000.";
      setClientError(message);
      return;
    }
    setClientError(null);

    saveMutation.mutate({
      accepted_dietary_types: form.accepted_dietary_types,
      accepted_food_categories: form.accepted_food_categories,
      excluded_allergens: form.excluded_allergens.split(",").map(s => s.trim()).filter(Boolean),
      description: form.description,
      available: form.available,
      max_servings: max,
      available_servings: avail,
      accepts_veg: form.accepts_veg,
      accepts_non_veg: form.accepts_non_veg,
      transport_available: form.transport_available,
      containers_available: form.containers_available,
      refrigeration_available: form.refrigeration_available,
      volunteer_servings: form.volunteer_servings === "" ? null : Number(form.volunteer_servings),
      need_level: form.need_level,
    } as CapacityData);
  }

  const serverError =
    saveMutation.error instanceof ApiError
      ? CODE_MESSAGES[saveMutation.error.code] ?? saveMutation.error.message
      : saveMutation.error instanceof Error
        ? saveMutation.error.message
        : null;

  const loadError = capacityQuery.error instanceof Error ? capacityQuery.error.message : null;

  return (
    <AppShell title="Capacity settings" nav="receiver">
      <div className="flex flex-col gap-4">
        <section className="harvest-hero"><Settings2 className="mb-3 text-lime-200"/><p className="eyebrow text-white/70">Your receiving workspace</p><h2 className="mt-2 text-3xl font-bold">Ready for the next rescue.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">Keep your capacity, pickup resources and food preferences up to date so the right meals reach your team.</p></section>
        <Link
          to="/receiver"
          className="inline-flex min-h-11 items-center text-sm font-medium underline"
        >
          Back to available rescues
        </Link>

        {capacityQuery.isLoading || (!form && !loadError) ? (
          <Skeleton className="h-96 w-full" />
        ) : loadError ? (
          <p role="alert" className="text-sm text-red-700">
            {loadError}
          </p>
        ) : form ? (
          <Card>
            <form data-tour="receiver-capacity" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
              <fieldset className="rounded-xl border border-border p-4">
                <legend className="px-2 font-bold text-ink">Availability and capacity</legend>
                <p className="mb-3 text-sm text-muted">Set your total limit and how many more servings you can receive now.</p>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={form.available}
                  onChange={(e) => update("available", e.target.checked)}
                />
                <span className="text-base">Available for pickups</span>
              </label>

                <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Maximum servings"
                name="max_servings"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.max_servings}
                onChange={(e) => update("max_servings", e.target.value)}
              />

              <Input
                label="Servings you can accept now"
                name="available_servings"
                type="number"
                inputMode="numeric"
                min={0}
                hint="Up to your maximum."
                value={form.available_servings}
                onChange={(e) => update("available_servings", e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <label htmlFor="need_level" className="text-sm font-medium">
                  Current need level
                </label>
                <select
                  id="need_level"
                  name="need_level"
                  className="min-h-11 rounded-md border border-slate-400 px-3 text-base"
                  value={form.need_level}
                  onChange={(e) => update("need_level", e.target.value as NeedLevel)}
                >
                  {(Object.keys(NEED_LABELS) as NeedLevel[]).map((level) => (
                    <option key={level} value={level}>
                      {NEED_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>

                </div>
              </fieldset>
              <div className="grid gap-4 lg:grid-cols-2">
                <fieldset className="space-y-3 rounded-xl border border-border p-4">
                  <legend className="px-2 font-bold text-ink"><span className="inline-flex items-center gap-2"><Truck size={18}/>Pickup and storage</span></legend>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={form.transport_available}
                  onChange={(e) => update("transport_available", e.target.checked)}
                />
                <span>I have transport available</span>
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={form.containers_available} onChange={event => update("containers_available", event.target.checked)}/>
                Our team can provide containers
              </label>
              <label className="flex min-h-11 items-center gap-3">
                <input type="checkbox" checked={form.refrigeration_available} onChange={event => update("refrigeration_available", event.target.checked)}/>
                Refrigerated storage is available
              </label>
              <Input label="Volunteer capacity (servings)" type="number" min={0} max={100000} value={form.volunteer_servings}
                onChange={event => update("volunteer_servings", event.target.value)} hint="Leave blank to use your available servings."/>

                </fieldset>
                <fieldset className="space-y-3 rounded-xl border border-border p-4">
                  <legend className="px-2 font-bold text-ink"><span className="inline-flex items-center gap-2"><Building2 size={18}/>Organization profile</span></legend>
                  <label className="grid gap-2 text-sm font-semibold">About your organization<textarea className="min-h-32 w-full resize-y rounded-xl border border-border p-3 font-normal" maxLength={500} value={form.description} placeholder="Tell donors who you serve and how your team distributes meals." onChange={event => update("description", event.target.value)}/></label>
                  <p className="text-right text-xs text-muted">{form.description.length}/500</p>
                </fieldset>
              </div>
              <fieldset className="space-y-4 rounded-xl border border-border p-4">
                <legend className="px-2 font-bold text-ink"><span className="inline-flex items-center gap-2"><Utensils size={18}/>Food preferences</span></legend>
              <fieldset className="flex flex-wrap gap-x-5 gap-y-1">
                <legend className="mb-1 text-sm font-medium">Basic dietary types</legend>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-6 w-6"
                    checked={form.accepts_veg}
                    onChange={(e) => update("accepts_veg", e.target.checked)}
                  />
                  <span>Vegetarian</span>
                </label>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-6 w-6"
                    checked={form.accepts_non_veg}
                    onChange={(e) => update("accepts_non_veg", e.target.checked)}
                  />
                  <span>Non-vegetarian</span>
                </label>
              </fieldset>

                <p className="text-sm text-muted">Leave labels or categories empty to accept all compatible options. Selected filters apply to every item.</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  {([
                    { key: "accepted_dietary_types", label: "Dietary labels", options: DIETS },
                    { key: "accepted_food_categories", label: "Food categories", options: CATEGORIES },
                  ] as const).map(group => <fieldset key={group.key}>
                    <legend className="mb-2 font-semibold">{group.label}</legend>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map(value => <label key={value} className={
                        "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm " +
                        (form[group.key].includes(value) ? "border-primary bg-primaryLight" : "border-border")
                      }>
                        <input type="checkbox" checked={form[group.key].includes(value)}
                          onChange={event => update(group.key, event.target.checked
                            ? [...form[group.key], value] : form[group.key].filter(option => option !== value))}/>
                        {foodLabel(value)}
                      </label>)}
                    </div>
                  </fieldset>)}
                </div>
              <Input label="Allergens to exclude" hint="Comma-separated, e.g. dairy, peanuts. Unknown allergen information is excluded when restrictions are set." value={form.excluded_allergens} onChange={e => update("excluded_allergens",e.target.value)}/>
              </fieldset>
              {clientError ? (
                <p role="alert" className="text-sm text-red-700">
                  {clientError}
                </p>
              ) : null}
              {!clientError && serverError ? (
                <p role="alert" className="text-sm text-red-700">
                  {serverError}
                </p>
              ) : null}
              <p role="status" className="text-sm text-emerald-800">
                {success ?? ""}
              </p>

              <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                <Save size={18}/>
                {saveMutation.isPending ? "Saving..." : "Save capacity settings"}
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
