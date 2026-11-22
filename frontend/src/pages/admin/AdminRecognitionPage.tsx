import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../features/toast/ToastContext";
import { apiRequest } from "../../lib/api";
import type { DonationRecognition } from "../../types/recognition";

interface Delivery {
  id: string;
  display_id: string;
  donor: string;
  receiver: string;
  servings: number;
  certificate: DonationRecognition | null;
}

export default function AdminRecognitionPage() {
  const { token } = useAuth();
  const toast = useToast();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>();
  const [message, setMessage] = useState("");
  const queryKey = ["admin", "recognition"];
  const deliveries = useQuery({
    queryKey: [...queryKey, search],
    queryFn: () => apiRequest<Delivery[]>(`/admin/recognition?${new URLSearchParams({ code: search })}`, { token }),
  });
  const publish = useMutation({
    mutationFn: ({ id, withdraw }: { id: string; withdraw?: boolean }) =>
      apiRequest(`/admin/recognition/${id}${withdraw ? "/withdraw" : ""}`, {
        method: "POST", token, body: withdraw ? undefined : { message, consent_to_publish: true },
      }),
    onSuccess: (_, { withdraw }) => {
      toast.success(withdraw ? "Certificate withdrawn." : "Certificate published.");
      setSelected(undefined);
      setMessage("");
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ["recognition"] });
    },
  });

  return <AppShell title="Appreciation certificates" nav="admin">
    <div className="mb-4 max-w-sm">
      <Input label="Find a delivery by rescue code" value={search} onChange={event => setSearch(event.target.value)}/>
    </div>
    {deliveries.isPending && <p role="status">Loading deliveries…</p>}
    {deliveries.isError && <Button onClick={() => void deliveries.refetch()}>Retry deliveries</Button>}
    {deliveries.data?.length === 0 && <Card>No confirmed deliveries match this search.</Card>}
    <div className="grid items-start gap-3 lg:grid-cols-2">
      {deliveries.data?.map(delivery => {
        const certificate = delivery.certificate?.status === "ISSUED" ? delivery.certificate : null;
        return <Card key={delivery.id}>
          <p className="text-xs text-muted">{delivery.display_id} · {delivery.servings} meals</p>
          <h3 className="mt-1 font-bold">{delivery.donor}</h3>
          <p className="mb-3 text-sm text-muted">Delivered to {delivery.receiver}</p>
          {certificate ? <div className="flex flex-wrap items-center gap-2">
            <Link className="view-toggle" to={`/recognition/verify/${certificate.public_token}`}>View certificate</Link>
            {certificate.issuer_role === "ADMIN" && <Button variant="ghost" size="sm" disabled={publish.isPending}
              onClick={() => { if (window.confirm("Withdraw this certificate?")) publish.mutate({ id: delivery.id, withdraw: true }); }}>
              Withdraw
            </Button>}
          </div> : selected === delivery.id ? <form className="space-y-2" onSubmit={event => {
            event.preventDefault();
            publish.mutate({ id: delivery.id });
          }}>
            <label className="block text-sm font-medium">Appreciation note
              <textarea className="mt-1 w-full rounded-lg border border-border p-2" maxLength={280}
                value={message} onChange={event => setMessage(event.target.value)}/>
            </label>
            <p className="text-xs text-muted">Publishing creates a public verification link for both organizations.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={publish.isPending}>Publish certificate</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(undefined)}>Cancel</Button>
            </div>
          </form> : <Button size="sm" variant="secondary" onClick={() => { setSelected(delivery.id); setMessage(""); }}>Create certificate</Button>}
        </Card>;
      })}
    </div>
  </AppShell>;
}
