import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, Download, Copy, Printer, ShieldCheck } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../features/auth/AuthContext";
import { apiRequest } from "../lib/api";
import { downloadPoster, recognitionPosterSvg, verificationUrl, type PosterTheme } from "../lib/recognitionPoster";
import type { DonationRecognition } from "../types/recognition";

export default function RecognitionPage({ publicView = false }: {publicView?:boolean}) {
  const {token,user} = useAuth();
  const {verificationToken=""} = useParams();
  const [params,setParams] = useSearchParams();
  const [audience,setAudience] = useState<"donor"|"receiver">(user?.role==="RECEIVER"?"receiver":"donor");
  const [theme,setTheme] = useState<PosterTheme>("garden");
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  const [exported,setExported] = useState<{url:string;filename:string}|null>(null);
  const records = useQuery({queryKey:["recognition","mine"],queryFn:()=>apiRequest<DonationRecognition[]>("/recognition/mine",{token}),enabled:!publicView,refetchInterval:15000});
  const verified = useQuery({queryKey:["recognition","verify",verificationToken],queryFn:()=>apiRequest<DonationRecognition>(`/recognition/verify/${verificationToken}`),enabled:publicView,retry:false,refetchInterval:15000});
  const current = publicView ? verified.isError ? undefined : verified.data : (records.data?.find(r=>r.rescue_id===params.get("rescue")) ?? (!params.has("rescue")?records.data?.find(r=>r.status==="ISSUED"):undefined));
  const active = current?.status === "ISSUED";
  const svg = useMemo(()=>current&&active?recognitionPosterSvg(current,theme,window.location.origin,audience):"",[current,theme,active,audience]);
  useEffect(()=>setExported(null),[svg]);
  async function exportPoster() {
    if(!current||!active) return;
    setBusy(true);setNotice("");
    try {
      // Recheck publication before generating a fresh promotional image.
      await apiRequest(`/recognition/verify/${current.public_token}`);
      const filename=`RescueRelay-${current.display_id}.png`;
      const url=await downloadPoster(svg,filename);
      setExported({url,filename});
      setNotice("Your 1080 × 1350 poster is ready. No links or QR codes are printed on the artwork.");
    } catch(e) {setNotice(e instanceof Error?e.message:"Could not export this poster.");}
    finally {setBusy(false);}
  }
  async function copy(kind:"link"|"caption") {
    if(!current) return;
    try {
      const url=verificationUrl(current);
      await navigator.clipboard.writeText(kind==="link"?url:`We ${audience==="receiver"?`received ${current.delivered_servings} meal servings from ${current.donor_name} for our community`:`shared ${current.delivered_servings} meal servings with ${current.receiver_name}`}, confirmed by the receiving partner. ${current.people_served ? `${current.people_served} people served in this delivery, as reported by the receiver. `:""}Thank you to everyone who helped. Verify: ${url}\nSynthetic RescueRelay demo. Receiver acknowledgement, not food-safety certification.`);
      setNotice(kind==="link"?"Verification link copied.":"Caption copied. Review it before posting.");
    } catch {setNotice("Clipboard access is unavailable. Select the verification link below and copy it.");}
  }
  const loading=publicView?verified.isPending:records.isPending;
  const error=publicView?verified.error:records.error;
  const content=<div className="space-y-5">
    {!publicView&&<Link className="recognition-controls inline-flex text-sm font-bold text-primary" to="/contribution">← Kindness coins, medals & lifetime certificate</Link>}<section className="harvest-hero recognition-controls"><Award className="mb-3 text-amber-200"/><p className="eyebrow text-white/70">{publicView?"Check the story behind the poster":"Your community story"}</p><h2 className="mt-2 text-3xl font-extrabold">Good food makes a difference.<br/>Let that story travel.</h2><p className="mt-3 max-w-2xl text-sm text-white/80">Appreciation issued by the receiving organization after a confirmed delivery. Made for your storefront, team and community.</p></section>
    {error&&<Card><h3 className="font-bold">{publicView?"This acknowledgement cannot be verified":"Recognition could not load"}</h3><p role="alert" className="mt-2 text-sm text-danger">{error.message}</p><Button variant="secondary" className="mt-3" onClick={()=>publicView?void verified.refetch():void records.refetch()}>Check again</Button></Card>}
    {loading?<Card>Loading receiver acknowledgements…</Card>:!error&&!current?<Card><h3 className="text-xl font-bold">Your next good deed starts a story.</h3><p className="mt-2 text-sm text-muted">A poster appears after a receiver issues an acknowledgement for a delivered donation. Completed meals already count in your impact, even without a certificate.</p><Link className="hero-cta mt-4" to={user?.role==="RECEIVER"?"/receiver/history":"/donor/rescues"}>Open donation history</Link></Card>:null}
    {current&&!active&&<Card><h3 className="font-bold">Acknowledgement withdrawn</h3><p className="mt-2 text-sm text-muted">The receiver withdrew this poster. Its old verification link is unavailable. Open the donation to view the current delivery record.</p></Card>}
    {active&&current&&<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
      <div className="recognition-print rounded-2xl border border-border bg-white p-2 shadow-sm"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`Contribution poster for ${audience==="donor"?current.donor_name:current.receiver_name}: ${current.delivered_servings} meals, issued by ${current.receiver_name}`} className="h-auto w-full rounded-xl"/></div>
      <div className="space-y-4 recognition-controls"><Card><div className="flex items-center gap-2 font-bold text-primary"><ShieldCheck size={20}/>Receiver-issued acknowledgement</div><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-muted">Issued to</dt><dd className="font-bold">{current.donor_name}</dd></div><div><dt className="text-muted">Confirmed by</dt><dd className="font-bold">{current.receiver_name}</dd></div><div><dt className="text-muted">Confirmed delivery</dt><dd>{current.delivered_servings} meals · {new Date(current.delivered_at).toLocaleDateString("en-IN")}</dd></div><div><dt className="text-muted">People served in this delivery</dt><dd>{current.people_served??"Not reported"}</dd></div><div><dt className="text-muted">Food feedback</dt><dd>{current.food_rating?`${current.food_rating} / 5 · receiver opinion`:"Not rated"}</dd></div></dl>{current.message&&<blockquote className="mt-4 border-l-2 border-primary pl-3 text-sm leading-relaxed">“{current.message}”</blockquote>}<p className="mt-4 text-xs leading-relaxed text-muted">{current.disclaimer} A downloaded image can be edited; this live page is the current record.</p></Card>
      <Card><h3 className="font-bold">Make it yours</h3><div className="mt-3 flex flex-wrap gap-2">{(["donor","receiver"] as const).map(a=><button key={a} className={`view-toggle ${audience===a?"selected":""}`} aria-pressed={audience===a} onClick={()=>setAudience(a)}>{a==="donor"?"Donor appreciation":"Receiver pride"}</button>)}</div><div className="my-3 flex gap-2">{(["garden","midnight"] as const).map(t=><button key={t} aria-pressed={theme===t} onClick={()=>setTheme(t)} className={`view-toggle ${theme===t?"selected":""}`}>{t==="garden"?"Warm ivory":"Forest green"}</button>)}</div><div className="grid gap-2"><Button disabled={busy} onClick={exportPoster}><Download size={17}/>{busy?"Preparing poster…":"Download poster PNG"}</Button><Button variant="secondary" onClick={()=>window.print()}><Printer size={17}/>Print / save PDF</Button><Button variant="secondary" onClick={()=>void copy("caption")}><Copy size={17}/>Copy promotional caption</Button><Button variant="ghost" onClick={()=>void copy("link")}>Copy verification link</Button></div>{exported&&<a className="mt-3 block text-sm font-semibold text-primary underline" href={exported.url} download={exported.filename}>Save generated PNG again</a>}<a className="mt-3 block break-all text-xs text-primary underline" href={verificationUrl(current)}>{verificationUrl(current)}</a><p className="mt-3 text-xs text-muted">Sharing is your choice. Artwork includes the demo label and contributing organizations. No links or QR codes are printed.</p></Card>{notice&&<p role="status" className="rounded-xl bg-primaryLight p-3 text-sm">{notice}</p>}</div>
    </div>}
    {!publicView&&(records.data?.length??0)>0&&<Card className="recognition-controls"><h3 className="mb-3 font-bold">Your appreciation archive</h3><div className="grid gap-2 sm:grid-cols-2">{records.data?.map(r=><button key={r.rescue_id} onClick={()=>{setParams({rescue:r.rescue_id});setNotice("");}} className={`rounded-xl border p-3 text-left ${current?.rescue_id===r.rescue_id?"border-primary bg-primaryLight/30":"border-border"}`}><span className="block text-sm font-bold">{r.delivered_servings} meals · {r.receiver_name}</span><span className="mt-1 block text-xs text-muted">{r.display_id} · {r.status==="ISSUED"?"Issued":"Withdrawn"}</span></button>)}</div><p className="mt-3 text-xs text-muted">Latest 100 acknowledgements. Open the delivery record to issue or withdraw one.</p></Card>}
  </div>;
  return publicView?<main className="recognition-public mx-auto max-w-6xl p-4 sm:p-8"><Link to="/home" className="recognition-controls mb-4 inline-block font-bold text-primary">RescueRelay</Link>{content}</main>:<AppShell title="Appreciation studio" nav={user?.role==="RECEIVER"?"receiver":"donor"}>{content}</AppShell>;
}
