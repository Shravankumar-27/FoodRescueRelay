import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import type { DonationRecognition } from "../../types/recognition";

export default function RecognitionCard({rescueId, delivered}: {rescueId:string; delivered:number}) {
  const {token,user} = useAuth();
  const client = useQueryClient();
  const [people,setPeople] = useState("");
  const [rating,setRating] = useState("");
  const [message,setMessage] = useState("");
  const [consent,setConsent] = useState(false);
  const [editing,setEditing] = useState(false);
  const [withdrawConfirm,setWithdrawConfirm] = useState(false);
  const [error,setError] = useState("");
  const recognition = useQuery({queryKey:["recognition",rescueId],queryFn:()=>apiRequest<DonationRecognition|null>(`/rescues/${rescueId}/recognition`,{token}),refetchInterval:15000});
  const mutation = useMutation({mutationFn:({action,body}:{action:string;body?:unknown})=>apiRequest(`/rescues/${rescueId}/recognition${action}`,{method:"POST",token,body}),onSuccess:async()=>{setEditing(false);setWithdrawConfirm(false);setError("");await Promise.all([client.invalidateQueries({queryKey:["recognition"]}),client.invalidateQueries({queryKey:["impact"]})]);}});
  const issued = recognition.data?.status === "ISSUED";
  function submit(e:FormEvent) {
    e.preventDefault();setError("");
    if(people && (!Number.isInteger(Number(people)) || Number(people)<1 || Number(people)>delivered)) return setError("Use a whole-number count between one and the delivered meals, or leave it blank.");
    mutation.mutate({action:"",body:{people_served:people?Number(people):null,food_rating:rating?Number(rating):null,message,consent_to_publish:consent}});
  }
  if(delivered<=0) return null;
  return <Card className="border-primary/25 bg-primaryLight/20">
    <div className="flex items-start gap-3"><Award className="mt-1 shrink-0 text-primary"/><div><p className="eyebrow text-primary">Community recognition</p><h3 className="mt-1 text-xl font-bold">{issued?"A good deed, acknowledged.":user?.role==="RECEIVER"?"Thank the donor. Tell the story.":"Your contribution deserves a story."}</h3></div></div>
    {recognition.isPending?<p className="mt-3 text-sm">Checking receiver acknowledgement…</p>:recognition.isError?<p role="alert" className="mt-3 text-danger">{recognition.error.message} <button onClick={()=>void recognition.refetch()} className="underline">Retry</button></p>:issued?<>
      <p className="my-3 text-sm text-muted"><CheckCircle2 size={16} className="mr-1 inline text-primary"/>Issued by {recognition.data?.receiver_name}. {recognition.data?.people_served ? `${recognition.data.people_served} people reported served. `:""}{recognition.data?.food_rating?`Food feedback: ${recognition.data.food_rating}/5.`:""}</p>
      <Link className="hero-cta" to={`/recognition?rescue=${rescueId}`}>Open appreciation poster</Link>
      {user?.role==="RECEIVER" && <div className="mt-3">{!withdrawConfirm?<button className="min-h-11 text-sm text-muted underline" onClick={()=>setWithdrawConfirm(true)}>Withdraw or correct acknowledgement</button>:<div className="rounded-xl border border-border bg-white p-3"><p className="mb-3 text-sm">Withdrawing disables public verification. Previously downloaded images cannot be recalled. You can issue corrected details afterwards.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={mutation.isPending} onClick={()=>mutation.mutate({action:"/withdraw"})}>Withdraw acknowledgement</Button><Button variant="ghost" onClick={()=>setWithdrawConfirm(false)}>Keep it issued</Button></div></div>}</div>}
    </>:user?.role!=="RECEIVER"?<p className="mt-3 text-sm leading-relaxed text-muted">Your {delivered} delivered meals already count toward your impact. The receiving partner can now issue an appreciation poster with optional food feedback and a people-served count. {recognition.data?.status==="WITHDRAWN"?"The previous acknowledgement was withdrawn; its old verification link is no longer valid.":"It will appear here automatically when issued."}</p>:<>
      <p className="mt-3 text-sm leading-relaxed text-muted">Issue a shareable acknowledgement for these {delivered} delivered meals. Only report people you counted; no names or personal details are needed. Food feedback describes your experience, not food safety.</p>
      {!editing?<Button className="mt-4" onClick={()=>setEditing(true)}>Create appreciation</Button>:<form className="mt-4 space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2"><Input label="People served (optional)" type="number" min={1} max={delivered} step={1} value={people} onChange={e=>setPeople(e.target.value)} hint="Leave blank if you did not count."/><label className="text-sm font-semibold">Food feedback (optional)<select className="mt-2 w-full" value={rating} onChange={e=>setRating(e.target.value)}><option value="">Not rated</option>{[5,4,3,2,1].map(n=><option value={n} key={n}>{n} / 5</option>)}</select><span className="mt-1 block text-xs font-normal text-muted">Receiver opinion on the donated food.</span></label></div>
        <label className="block text-sm font-semibold">A note of appreciation (optional)<textarea maxLength={280} rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder="What did this donation mean for your community?" className="mt-2 w-full rounded-xl border border-border bg-white p-3 font-normal"/><span className="text-xs font-normal text-muted">{message.length}/280 · No beneficiary details or safety claims.</span></label>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0"/>I confirm these details on behalf of our organization and permit the donor to share our organization name, feedback and this acknowledgement publicly.</label>
        <div className="flex flex-wrap gap-2"><Button disabled={!consent||mutation.isPending} type="submit">{mutation.isPending?"Issuing…":"Issue appreciation certificate"}</Button><Button variant="ghost" type="button" onClick={()=>setEditing(false)}>Not now</Button></div>
      </form>}
    </>}
    {(error||mutation.isError)&&<p role="alert" className="mt-3 text-sm text-danger">{error||mutation.error?.message}</p>}
  </Card>;
}
