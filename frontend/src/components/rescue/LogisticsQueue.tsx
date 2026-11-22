import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { foodLabel } from "../../lib/food";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { resourceNames, resourceLabels, type Resources, type ResourceName, type Provider, type AvailableProvider } from "./PickupLogistics";

interface RequestItem {
  rescue_id: string;
  offer_id: string;
  display_id: string;
  donor: string;
  receiver: string;
  locality: string;
  servings: number;
  handling_type: string;
  pickup_by: string;
  resources: Resources;
}

function Arrangement({ item, resource, refresh }: { item: RequestItem; resource: ResourceName; refresh: () => void }) {
  const { token } = useAuth();
  const provider = item.resources[resource].provider;
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const save = useMutation({
    mutationFn: (body: Provider | null) => apiRequest(`/admin/logistics/${item.rescue_id}/${item.offer_id}/${resource}`, { method: "PUT", token, body }),
    onSuccess: () => { setName(""); setContact(""); refresh(); },
  });
  return <div className="mt-3 border-t border-border pt-3">
    <h5 className="font-semibold">{resourceLabels[resource]}</h5>
    {provider ? <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm">Confirmed · {provider.name} · {provider.contact}</p>
      <Button variant="secondary" disabled={save.isPending} onClick={() => save.mutate(null)}>Remove arrangement</Button>
    </div> : <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={event => {
      event.preventDefault();
      save.mutate({ name, contact });
    }}>
      <Input label="Provider or business name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120}/>
      <Input label="Business contact" value={contact} onChange={event => setContact(event.target.value)} required minLength={3} maxLength={160}/>
      <Button type="submit" disabled={save.isPending}>Record confirmed provider</Button>
    </form>}
  </div>;
}

function ProviderDirectory() {
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const path = "/admin/logistics/providers";
  const directory = useQuery({ queryKey: ["admin", "providers"],
    queryFn: () => apiRequest<AvailableProvider[]>(path, { token }) });
  const register = useMutation({
    mutationFn: (body: unknown) => apiRequest(path, { method: "POST", token, body }),
    onSuccess: () => { setShowForm(false); void directory.refetch(); },
  });
  const availability = useMutation({
    mutationFn: (provider: AvailableProvider) => apiRequest(`${path}/${provider.id}/availability`, {
      method: "PUT", token, body: { available: !provider.available },
    }),
    onSuccess: () => directory.refetch(),
  });
  return <Card>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-lg font-semibold">Provider directory</h3>
      <Button variant="secondary" size="sm" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "Add provider"}</Button>
    </div>
    {showForm && <form className="my-3 grid gap-2 sm:grid-cols-2" onSubmit={event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      register.mutate({
        name: values.get("name"), contact: values.get("contact"), service_area: values.get("service_area"),
        resource: values.get("resource"), max_servings: Number(values.get("max_servings")),
        refrigeration: values.has("refrigeration"),
      });
    }}>
      <Input label="Name" name="name" required minLength={2} maxLength={120}/>
      <Input label="Business contact" name="contact" required minLength={3} maxLength={160}/>
      <Input label="Service area" name="service_area" placeholder="Hyderabad" required minLength={2}/>
      <Input label="Maximum servings" name="max_servings" type="number" min={1} max={100000} required/>
      <label className="grid gap-1 text-sm">Resource<select name="resource">
        {resourceNames.map(resource => <option key={resource} value={resource}>{resourceLabels[resource]}</option>)}
      </select></label>
      <label className="flex items-center gap-2 text-sm"><input name="refrigeration" type="checkbox"/>Supports refrigerated food</label>
      <Button type="submit" disabled={register.isPending}>Save provider</Button>
    </form>}
    {directory.data?.map(provider => <div key={provider.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
      <div><p className="font-semibold">{provider.name}</p>
        <p className="text-sm text-muted">{resourceLabels[provider.resource]} · {provider.service_area} · {provider.contact}</p></div>
      <Button variant="secondary" size="sm" disabled={availability.isPending} onClick={() => availability.mutate(provider)}>
        {provider.available ? "Mark unavailable" : "Mark available"}
      </Button>
    </div>)}
    {directory.data?.length === 0 && <p className="text-sm text-muted">No providers registered.</p>}
  </Card>;
}

export default function LogisticsQueue() {
  const { token } = useAuth();
  const query = useQuery({
    queryKey: ["admin", "logistics"],
    queryFn: () => apiRequest<RequestItem[]>("/admin/logistics", { token }),
    refetchInterval: 10000,
  });
  return <div className="mb-4 grid items-start gap-4 xl:grid-cols-2"><Card>
    <h3 className="text-lg font-semibold">Pickup logistics requests</h3>
    {query.isPending && <p className="mt-2 text-sm text-muted">Loading pickup requests…</p>}
    {query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Retry queue</Button>}
    {query.data?.length === 0 && <p className="mt-2 text-sm text-muted">No active pickups need a provider.</p>}
    {query.data?.map(item => <section key={item.offer_id} className="mt-4 rounded-xl border border-border p-3">
      <h4 className="font-semibold">{item.display_id} · {item.donor} → {item.receiver}</h4>
      <p className="text-sm text-muted">{item.servings} servings · {foodLabel(item.handling_type)} · {item.locality} · pickup by {formatDateTime(item.pickup_by)}</p>
      {resourceNames.filter(resource => item.resources[resource].needs_help || item.resources[resource].provider)
        .map(resource => <Arrangement key={resource} item={item} resource={resource} refresh={() => void query.refetch()}/>)}
    </section>)}
  </Card><ProviderDirectory/></div>;
}
