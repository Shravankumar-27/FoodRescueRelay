import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Input from "../ui/Input";

export default function DemoClock() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(15);
  const config = useQuery({
    queryKey: ["hold-times"],
    queryFn: () => apiRequest<{ demo_clock_enabled: boolean }>("/hold-times"),
  });
  const advance = useMutation({
    mutationFn: () => apiRequest<{ now: string }>("/demo/clock", { method: "POST", token, body: { minutes } }),
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  if (!config.data?.demo_clock_enabled) return null;
  return <Card>
    <h2 className="font-bold">Demo clock</h2>
    <p className="my-2 text-sm text-muted">Advance the synthetic rescue queue and run escalation immediately.</p>
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); advance.mutate(); }}>
      <Input label="Advance by (minutes)" type="number" min={1} max={1440} required value={minutes} onChange={e => setMinutes(Number(e.target.value))}/>
      <Button type="submit" disabled={advance.isPending}>Advance clock</Button>
    </form>
    {advance.data && <p className="mt-2 text-sm" role="status">Demo time {formatDateTime(advance.data.now)}</p>}
  </Card>;
}
