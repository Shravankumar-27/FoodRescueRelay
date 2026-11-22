import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import Card from "../ui/Card";
import Button from "../ui/Button";

export const ratingFields = [
  ["taste", "Taste and preferences"],
  ["packaging", "Packaging convenience"],
  ["dietary_fit", "Dietary suitability"],
] as const;
export const portionFields = [
  ["staple_portion", "Rice or other staple portion"],
  ["vegetable_portion", "Vegetable portion"],
] as const;
export const portionOptions = [
  ["too_small", "Too small"], ["about_right", "About right"], ["too_large", "Too large"], ["not_applicable", "Not applicable"],
] as const;
type Rating = typeof ratingFields[number][0];
type Portion = typeof portionFields[number][0];
type Answers = Record<Rating, number> & Record<Portion, typeof portionOptions[number][0]>;

export default function MealFeedback({ rescueId }: { rescueId: string }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const [draft, setDraft] = useState<Partial<Answers> | null>(null);
  const [consent, setConsent] = useState(false);
  const path = `/rescues/${rescueId}/meal-feedback`;
  const key = ["meal-feedback", rescueId];
  const query = useQuery({ queryKey: key, queryFn: () => apiRequest<Answers | null>(path, { token }) });
  const save = useMutation({
    mutationFn: (body: Partial<Answers> & { consent: boolean }) => apiRequest<Answers | null>(path, { method: "PUT", token, body }),
    onSuccess: data => { client.setQueryData(key, data); setDraft(null); setConsent(false); },
  });

  return <Card>
    <h3 className="text-lg font-semibold">Help shape future donations</h3>
    <p className="mt-2 text-sm text-muted">Share your kitchen’s observations about this meal. Restaurants see combined results after at least three responses. Only share if your organization consents.</p>
    {query.isPending && <p className="mt-2 text-sm">Loading feedback…</p>}
    {query.isError && <Button size="sm" variant="secondary" onClick={() => void query.refetch()}>Retry feedback</Button>}
    {query.isSuccess && draft === null && <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      {query.data && <p role="status">Feedback shared</p>}
      <Button variant="secondary" disabled={save.isPending} onClick={() => setDraft(query.data ?? {})}>{query.data ? "Edit feedback" : "Give meal feedback"}</Button>
      {query.data && <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate({ consent: false })}>Withdraw feedback</Button>}
      {save.isSuccess && save.data === null && <p role="status">Feedback withdrawn</p>}
    </div>}
    {draft && <form className="mt-3 space-y-3 text-sm" onSubmit={event => {
      event.preventDefault();
      if (consent) save.mutate({ ...draft, consent });
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        {ratingFields.map(([field, label]) => <label key={field} className="grid gap-1">{label}
          <select required value={draft[field] ?? ""} onChange={event => setDraft({ ...draft, [field]: Number(event.target.value) || undefined })}>
            <option value="">Choose rating</option>
            {[1, 2, 3, 4, 5].map(score => <option key={score} value={score}>{score}{score === 1 ? " · poor" : score === 5 ? " · excellent" : ""}</option>)}
          </select>
        </label>)}
        {portionFields.map(([field, label]) => <label key={field} className="grid gap-1">{label}
          <select required value={draft[field] ?? ""} onChange={event => setDraft({ ...draft, [field]: portionOptions.find(([value]) => value === event.target.value)?.[0] })}>
            <option value="">Choose a portion size</option>
            {portionOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>)}
      </div>
      <label className="flex min-h-10 items-center gap-2"><input type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)}/>Our organization consents to share these answers in aggregate.</label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!consent || save.isPending}>Share feedback</Button>
        <Button type="button" variant="ghost" onClick={() => { setDraft(null); setConsent(false); save.reset(); }}>Cancel</Button>
      </div>
    </form>}
  </Card>;
}
