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
  available: boolean;
  max_servings: string;
  available_servings: string;
  accepts_veg: boolean;
  accepts_non_veg: boolean;
  transport_available: boolean;
  need_level: NeedLevel;
}

export default function CapacitySettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const capacityQuery = useQuery({
    queryKey: ["receiver", "capacity"],
    queryFn: () => apiRequest<CapacityData>("/receivers/capacity", { token }),
    enabled: !!token,
  });

  useEffect(() => {
    const c = capacityQuery.data;
    if (c) {
      setForm({
        available: c.available,
        max_servings: String(c.max_servings),
        available_servings: String(c.available_servings),
        accepts_veg: c.accepts_veg,
        accepts_non_veg: c.accepts_non_veg,
        transport_available: c.transport_available,
        need_level: c.need_level as NeedLevel,
      });
    }
  }, [capacityQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (body: CapacityData) =>
      apiRequest<CapacityData>("/receivers/capacity", {
        method: "PUT",
        token,
        body,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["receiver", "capacity"], data);
      setSuccess("Capacity settings saved.");
    },
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSuccess(null);
    setClientError(null);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setSuccess(null);

    const max = Number(form.max_servings);
    const avail = Number(form.available_servings);

    if (!Number.isInteger(max) || max < 0) {
      setClientError("Maximum servings must be a whole number of 0 or more.");
      return;
    }
    if (!Number.isInteger(avail) || avail < 0) {
      setClientError("Available servings must be a whole number of 0 or more.");
      return;
    }
    if (avail > max) {
      setClientError("Available servings cannot be more than your maximum servings.");
      return;
    }
    setClientError(null);

    saveMutation.mutate({
      available: form.available,
      max_servings: max,
      available_servings: avail,
      accepts_veg: form.accepts_veg,
      accepts_non_veg: form.accepts_non_veg,
      transport_available: form.transport_available,
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
            <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={form.available}
                  onChange={(e) => update("available", e.target.checked)}
                />
                <span className="text-base">Available tonight</span>
              </label>

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
                label="Servings available now"
                name="available_servings"
                type="number"
                inputMode="numeric"
                min={0}
                hint="Must be less than or equal to maximum servings."
                value={form.available_servings}
                onChange={(e) => update("available_servings", e.target.value)}
              />

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Dietary types you accept</legend>
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

              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  className="h-6 w-6"
                  checked={form.transport_available}
                  onChange={(e) => update("transport_available", e.target.checked)}
                />
                <span>I have transport available</span>
              </label>

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

              {clientError ? (
                <p role="alert" className="text-sm text-red-700">
                  {clientError}
                </p>
              ) : null}
              {serverError ? (
                <p role="alert" className="text-sm text-red-700">
                  {serverError}
                </p>
              ) : null}
              <p role="status" className="text-sm text-emerald-800">
                {success ?? ""}
              </p>

              <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save capacity settings"}
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
