import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
export default function PartnerRating({ rescueId }: { rescueId: string }) {
  const { token } = useAuth();
  const [stars, setStars] = useState(0);
  const save = useMutation({ mutationFn: (value: number) => apiRequest(`/rescues/${rescueId}/rating`, { method: "POST", token, body: { stars: value } }) });
  return <section className="rounded-2xl border border-border bg-surface p-4"><h3 className="font-bold">How was the handoff?</h3><p className="text-sm text-muted">Rate communication and reliability. Your feedback helps future partners.</p><div className="mt-2 flex gap-1">{[1,2,3,4,5].map(n => <button key={n} aria-label={`Rate ${n} stars`} aria-pressed={stars === n} disabled={save.isPending} className="flex h-12 w-12 items-center justify-center rounded-xl hover:bg-accentLight" onClick={() => { setStars(n); save.mutate(n); }}><Star className={n <= stars ? "fill-amber-400 text-amber-600" : "text-muted"}/></button>)}</div>{save.isSuccess && <p role="status" className="text-sm text-primary">Feedback saved. Thank you!</p>}{save.isError && <p role="alert" className="text-sm text-danger">{save.error.message}</p>}</section>;
}
