import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import Card from "../ui/Card";
import Button from "../ui/Button";

export const resourceNames = ["containers", "transport"] as const;
export const resourceLabels = { containers: "Containers", transport: "Transport" };
export type ResourceName = typeof resourceNames[number];
export interface Provider {
  name: string;
  contact: string;
}
export interface AvailableProvider extends Provider {
  id: string;
  resource: ResourceName;
  service_area: string;
  max_servings: number;
  refrigeration: boolean;
  available: boolean;
}
export type Resources = Record<ResourceName, {
  donor: boolean;
  receiver: boolean;
  needs_help: boolean;
  provider: Provider | null;
}>;
interface Logistics {
  offer_id: string;
  resources: Resources;
  providers: AvailableProvider[];
}

export function usePickupLogistics(rescueId: string, enabled: boolean, poll = false) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["pickup-logistics", rescueId],
    queryFn: () => apiRequest<Logistics>(`/rescues/${rescueId}/logistics`, { token }),
    enabled: !!token && !!rescueId && enabled,
    refetchInterval: poll ? 5000 : false,
  });
}

export default function PickupLogistics({ rescueId, side }: { rescueId: string; side: "donor" | "receiver" }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const key = ["pickup-logistics", rescueId];
  const path = `/rescues/${rescueId}/logistics`;
  const query = usePickupLogistics(rescueId, true, true);
  const [selected, setSelected] = useState<AvailableProvider | null>(null);
  const update = useMutation({
    mutationFn: (body: { offer_id: string; containers: boolean; transport: boolean }) => apiRequest<Logistics>(path, { method: "PUT", token, body }),
    onSuccess: data => client.setQueryData(key, data),
    onError: () => void query.refetch(),
  });
  const confirm = useMutation({
    mutationFn: (body: { offer_id: string; provider_id: string }) =>
      apiRequest<Logistics>(`${path}/provider`, { method: "PUT", token, body }),
    onSuccess: data => {
      client.setQueryData(key, data);
      setSelected(null);
    },
    onError: () => void query.refetch(),
  });
  const data = query.data;

  return <Card>
    <h3 className="text-lg font-semibold">Pickup logistics</h3>
    {query.isPending && <p className="mt-2 text-sm text-muted">Checking supplies…</p>}
    {query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Retry logistics</Button>}
    {data && <div className="mt-2 grid gap-3 sm:grid-cols-2">
      {resourceNames.map(name => {
        const resource = data.resources[name];
        const availableFrom = [resource.donor && "donor", resource.receiver && "receiver"].filter(Boolean).join(" and ");
        return <div key={name} className="border-t border-border pt-2 text-sm">
          <p className="font-semibold">{resourceLabels[name]}</p>
          <label className="flex min-h-10 items-center gap-2">
            <input type="checkbox" checked={resource[side]} disabled={update.isPending} onChange={event => update.mutate({
              offer_id: data.offer_id,
              containers: name === "containers" ? event.target.checked : data.resources.containers[side],
              transport: name === "transport" ? event.target.checked : data.resources.transport[side],
            })}/>
            Our team can provide this
          </label>
          {availableFrom && <p className="text-muted">Available from {availableFrom}</p>}
          {resource.provider && <p>Confirmed provider · {resource.provider.name} · {resource.provider.contact}</p>}
          {resource.needs_help && <>
            <p role="status" className="font-semibold text-warn">Help requested</p>
            {data.providers?.filter(provider => provider.resource === name).map(provider => <div key={provider.id} className="mt-2 rounded-lg bg-background p-2">
              <p className="font-semibold">{provider.name}</p>
              <p>{provider.contact}</p>
              {selected?.id === provider.id ? <>
                <p className="my-1 text-muted">Confirm after the provider agrees to this pickup.</p>
                <Button size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate({ offer_id: data.offer_id, provider_id: provider.id })}>Confirm arrangement</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Back</Button>
              </> : <Button size="sm" variant="secondary" className="mt-1" onClick={() => setSelected(provider)}>Arrange with provider</Button>}
            </div>)}
            {!data.providers?.some(provider => provider.resource === name) && <p className="text-muted">No provider available yet. Waiting for a coordinator.</p>}
          </>}
        </div>;
      })}
    </div>}
  </Card>;
}
