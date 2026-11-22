import { useState, type FormEvent } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, MapPin } from "lucide-react";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import ChatBox from "../../components/chat/ChatBox";
import RecognitionCard from "../../components/rescue/RecognitionCard";
import PartnerRating from "../../components/rescue/PartnerRating";
import StatusTimeline from "../../components/rescue/StatusTimeline";
import StatusBadge from "../../components/rescue/StatusBadge";
import RescueClock from "../../components/rescue/RescueClock";
import SafetyNotice from "../../components/rescue/SafetyNotice";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { foodLabel } from "../../lib/food";
import { formatDateTime } from "../../lib/format";
import { pollInterval } from "../../hooks/usePolling";
import type { RescueDetail } from "../../types/api";
const CHECKS = ["Confirm holding conditions with the donor; appearance alone cannot establish safety", "Packaging is intact and suitable for transport", "Within the pickup-by time window", "Ingredients and allergens meet our community's needs"];
export default function ActivePickupPage() {
  const { rescueId = "" } = useParams();
  const { token } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [releaseReason,setReleaseReason] = useState("");
  const [showRelease,setShowRelease] = useState(false);
  const release = useMutation({mutationFn:()=>apiRequest(`/rescues/${rescueId}/release`,{method:"POST",token,body:{reason:releaseReason}}),onSuccess:async()=>{await client.invalidateQueries();navigate("/receiver");}});
  const [code,setCode] = useState("");
  const [collected,setCollected] = useState("");
  const [delivered,setDelivered] = useState("");
  const [rejected,setRejected] = useState("0");
  const [checks,setChecks] = useState<string[]>([]);
  const [error,setError] = useState("");
  const detail = useQuery({ queryKey:["receiver","rescue",rescueId], queryFn:()=>apiRequest<RescueDetail>(`/rescues/${rescueId}`,{token}), refetchInterval:q=>pollInterval(q.state.data?.status) });
  const d = detail.data;
  const change = useMutation({ mutationFn:({action,body}:{action:string;body:unknown})=>apiRequest(`/rescues/${rescueId}/${action}`,{method:"POST",token,body}), onSuccess:async()=> { setError(""); setCode(""); await Promise.all([client.invalidateQueries({queryKey:["receiver"]}),client.invalidateQueries({queryKey:["rescue",rescueId]}),client.invalidateQueries({queryKey:["rescues"]}),client.invalidateQueries({queryKey:["impact"]}),client.invalidateQueries({queryKey:["contribution"]}),client.invalidateQueries({queryKey:["allocation-batches"]}),client.invalidateQueries({queryKey:["allocation",rescueId]}),client.invalidateQueries({queryKey:["leaderboard"]})]); }, onError:()=>void detail.refetch() });
  function collect(e:FormEvent) {
    e.preventDefault(); setError("");
    if(checks.length!==CHECKS.length) return setError("Confirm each handling check before collecting.");
    if(!/^\d{4}$/.test(code)) return setError("Enter the donor's four-digit pickup code.");
    const quantity=Number(collected);
    if(!collected.trim() || !Number.isInteger(quantity) || quantity<1 || quantity>(d?.total_servings ?? 0)) return setError("Enter a whole number of servings up to the posted quantity.");
    change.mutate({action:"collect",body:{pickup_code:code,collected_servings:quantity}});
  }
  function deliver(e:FormEvent) {
    e.preventDefault(); setError("");
    const meals=Number(delivered), waste=Number(rejected || 0);
    if(!delivered.trim() || !Number.isInteger(meals) || !Number.isInteger(waste) || meals<0 || waste<0 || meals+waste>(d?.collected_servings ?? 0)) return setError(`Delivered plus rejected servings must not exceed ${d?.collected_servings ?? 0} collected servings.`);
    change.mutate({action:"deliver",body:{delivered_servings:meals,rejected_servings:waste}});
  }
  return <AppShell title="Active pickup" nav="receiver" backTo="/receiver">
      {d&&["COLLECTED","DELIVERED"].includes(d.status)&&<Link to={`/receiver/planner?rescue=${rescueId}`} className="mb-4 inline-flex min-h-11 items-center text-sm font-bold text-primary">Open food allocation planner →</Link>}<div className="space-y-4">{detail.isPending ? <Skeleton className="h-96 w-full"/> : detail.isError ? <Card><p role="alert" className="text-danger">{detail.error.message}</p><Button className="mt-3" onClick={()=>void detail.refetch()}>Try again</Button></Card> : d && <><Card><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow text-primary">{d.display_id}</p><h2 className="mt-2 text-2xl font-bold">{d.status === "DELIVERED" ? "A handoff worth celebrating." : "Your next community handoff."}</h2></div><StatusBadge status={d.status}/></div><p className="mt-3 text-sm text-muted">{d.donor_organization_name} · {d.total_servings} servings · {d.locality}</p>{d.status === "CLAIMED" && <div className="mt-3"><RescueClock pickupBy={d.pickup_by}/></div>}</Card>
    <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]"><div className="space-y-4">
      {d.status === "CLAIMED" && <Card><h3 className="flex items-center gap-2 text-lg font-bold"><MapPin size={20}/>Pickup details</h3><p className="mt-3 text-sm">{d.private_address || d.locality}</p><p className="mt-2 text-sm text-muted">Collect by {formatDateTime(d.pickup_by)}. Ask the donor for the code at handoff.</p><form onSubmit={collect} className="mt-4 space-y-3"><fieldset><legend className="mb-2 text-sm font-bold">Check before you collect</legend>{CHECKS.map(label=><label key={label} className="mb-2 flex min-h-12 items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={checks.includes(label)} onChange={e=>setChecks(e.target.checked?[...checks,label]:checks.filter(c=>c!==label))}/>{label}</label>)}</fieldset><Input label="Pickup code (4 digits)" inputMode="numeric" maxLength={4} autoComplete="off" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,""))}/><Input label="Servings collected" type="number" min={1} max={d.total_servings} value={collected} onChange={e=>setCollected(e.target.value)}/><Button className="w-full" type="submit" disabled={checks.length!==CHECKS.length || change.isPending}><PackageCheck size={18}/>{change.isPending ? "Confirming…" : "Confirm collection"}</Button></form></Card>}
      {d.status === "CLAIMED" && <Card><button onClick={()=>setShowRelease(!showRelease)} className="min-h-11 text-sm font-semibold text-primary underline">Unable to collect? Release this pickup</button>{showRelease&&<form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();release.mutate();}}><label className="block text-sm font-semibold">Why can you no longer collect?<textarea value={releaseReason} onChange={e=>setReleaseReason(e.target.value)} required minLength={3} maxLength={300} className="mt-2 w-full rounded-xl border border-border p-3"/></label><p className="text-sm text-muted">Your reservation is released and we try the next compatible partner. This is recorded in your handoff history. You cannot reclaim this listing.</p><Button type="submit" variant="danger" disabled={release.isPending||releaseReason.trim().length<3}>Release pickup</Button>{release.isError&&<p role="alert" className="text-sm text-danger">{release.error.message}</p>}</form>}</Card>}
      {d.status === "COLLECTED" && <Card><h3 className="text-xl font-bold">Record delivery</h3><p className="mt-2 text-sm text-muted">{d.collected_servings} servings collected. Count only meals that reached your community. The donor's dashboard updates automatically.</p><form onSubmit={deliver} className="mt-4 space-y-4"><Input label="Servings delivered" type="number" min={0} max={d.collected_servings ?? undefined} value={delivered} onChange={e=>setDelivered(e.target.value)}/><Input label="Servings rejected" type="number" min={0} max={d.collected_servings ?? undefined} value={rejected} onChange={e=>setRejected(e.target.value)} hint="Do not distribute unsuitable food. Rejected servings are excluded from impact."/><Button type="submit" className="w-full" disabled={change.isPending}>{change.isPending ? "Recording…" : "Confirm delivery"}</Button></form></Card>}
      {(error || change.isError) && <p role="alert" className="rounded-xl bg-dangerLight p-3 text-sm text-danger">{error || change.error?.message}</p>}
      {d.status === "DELIVERED" && <><Card variant="fresh"><CheckCircle2 className="mb-3 text-primary" size={28}/><h3 className="text-2xl font-bold">{d.impact?.delivered_servings ?? 0} meals delivered</h3><p className="mt-2 text-sm text-muted">Confirmed for both you and the donor. {d.impact?.rejected_servings ?? 0} rejected servings are excluded from impact.</p><Link to="/receiver/impact" className="mt-4 inline-flex min-h-12 items-center font-semibold text-primary">See your impact</Link></Card><RecognitionCard rescueId={rescueId} delivered={d.impact?.delivered_servings ?? 0}/><PartnerRating rescueId={rescueId}/></>}
      {["EXPIRED","CANCELLED"].includes(d.status) && <Card variant="warn"><h3 className="font-bold">{d.status === "EXPIRED" ? "The pickup window has ended" : "This rescue was cancelled"}</h3><p className="mt-2 text-sm">Do not collect this listing. Your reserved capacity is released.</p><Link to="/receiver" className="mt-3 inline-block font-semibold text-primary">Find another rescue</Link></Card>}
      {["CLAIMED","COLLECTED","DELIVERED"].includes(d.status) && <ChatBox rescueId={rescueId} recipientName={d.donor_organization_name} defaultOpen/>}
    </div><div className="space-y-4"><Card><h3 className="mb-3 text-lg font-bold">Food & handling</h3>{d.food_items.map((f,i)=><div key={i} className="border-t border-border py-3"><p className="font-semibold">{f.name} · {f.quantity_servings} servings</p><p className="mt-1 text-sm text-muted">{foodLabel(f.dietary_type)} · {foodLabel(f.food_category ?? "COOKED_MEAL")}</p><p className="mt-1 text-sm text-warn">{f.allergen_info_unknown ? "Allergen information unknown — verify independently" : `Listed allergens: ${f.allergens.join(", ") || "none provided"}`}</p></div>)}<p className="mt-2 text-sm font-semibold">{foodLabel(d.handling_type)} · {d.packaging_available ? "Packaging available" : "Bring suitable containers"}</p><p className="mt-2 text-sm text-muted">Prepared {formatDateTime(d.prepared_at)}</p>{d.handling_notes && <p className="mt-2 text-sm text-muted">{d.handling_notes}</p>}<div className="mt-3"><SafetyNotice/></div></Card><Card><h3 className="mb-4 font-bold">Rescue timeline</h3><StatusTimeline status={d.status} events={d.status_events ?? []}/></Card></div></div></>}</div></AppShell>;
}
