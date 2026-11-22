import { printImpact } from "../lib/impactPrint";
import { lifetimePosterSvg } from "../lib/lifetimePoster";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Award, Coins, Download, Flame, Leaf, LockKeyhole, Sparkles, ArrowUpRight, HeartHandshake } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../features/auth/AuthContext";
import { useToast } from "../features/toast/ToastContext";
import { apiRequest } from "../lib/api";
import { downloadPoster, type PosterTheme } from "../lib/recognitionPoster";
import type { Contribution } from "../types/contribution";

export default function ContributionPage() {
  const {token,user}=useAuth();
  const [params] = useSearchParams();
  const posterOnly = params.get("view") === "poster";
  const toast = useToast();
  const receiver=user?.role==="RECEIVER";
  const q=useQuery({queryKey:["contribution",user?.id],queryFn:()=>apiRequest<Contribution>("/contribution",{token})});
  const [theme,setTheme]=useState<PosterTheme>("midnight");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [exported,setExported]=useState<{url:string;svg:string}|null>(null);
  const d=q.data;
  const svg=useMemo(()=>d?lifetimePosterSvg(d,theme):"",[d,theme]);
  async function exportImage(){setBusy(true);setNotice("");try{const url=await downloadPoster(svg,"RescueRelay-lifetime-contribution.png");setExported({url,svg});setNotice("Lifetime poster ready.");}catch(e){toast.error(e instanceof Error?e.message:"Export failed");}finally{setBusy(false);}}
  function exportLedger(){
    if(!d)return;
    const csv=["Synthetic demo data. Not a food-safety certification.","Rescue,Confirmed UTC,Meals,Kindness coins (no cash value)",...d.ledger.map(r=>`${r.display_id},${r.at},${r.meals},${r.coins}`)].join("\r\n");
    try {
      const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="RescueRelay-contribution-ledger.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      toast.success("Coin activity exported.");
    } catch {
      toast.error("Could not export coin activity.");
    }
  }
  async function copyStory(){if(!d)return;try{await navigator.clipboard.writeText(`${d.organization_name} helped ${receiver?"receive and distribute":"share"} ${d.impact.total_meals_rescued} confirmed meal servings through ${d.impact.completed_rescues} food rescues. ${d.coins} kindness coins recognize this contribution. ${d.medal}. Food-weight estimate: ${d.impact.food_kg_estimate} kg at 0.4 kg per meal.`);setNotice("Community story copied. Review it before publishing.");}catch{toast.error("Could not copy your community story.");}}
  const tools=receiver?[
    {title:"Allocation planner",to:"/receiver/planner",icon:HeartHandshake},
    {title:"Appreciation",to:"/recognition",icon:Sparkles},
    {title:"Impact",to:"/receiver/impact",icon:Leaf},
  ]:[
    {title:"Appreciation",to:"/recognition",icon:Sparkles},
    {title:"Impact",to:"/donor/impact",icon:Leaf},
    {title:"Nearby receivers",to:"/donor",icon:HeartHandshake},
  ];
  return <AppShell title={posterOnly ? "Overall appreciation" : "Kindness club"} nav={receiver?"receiver":"donor"}>
    {q.isPending ? <Card>Loading contribution…</Card> : q.isError ? <Button onClick={() => void q.refetch()}>Retry contribution</Button> : d && <div className="space-y-4">
    {posterOnly && <nav aria-label="Appreciation type" className="recognition-controls flex flex-wrap gap-2"><Link to="/recognition" className="view-toggle">Per-delivery posters</Link><Link to="/contribution?view=poster" aria-current="page" className="view-toggle selected">Overall appreciation</Link><Link to="/contribution" className="view-toggle">Coins & medals</Link></nav>}
    {!posterOnly && <>
    <div className="recognition-controls flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-bold">{d.organization_name}</h2>
      <Link className="view-toggle" to="/leaderboard">Community rankings</Link>
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] recognition-controls"><Card className="coin-wallet"><div className="flex items-center justify-between"><span className="eyebrow text-muted">Lifetime kindness coins</span><Coins className="text-amber-700"/></div><p className="my-3 text-5xl font-extrabold tracking-tight">{d.coins.toLocaleString("en-IN")}</p><p className="text-sm text-muted">{d.impact.total_meals_rescued.toLocaleString("en-IN")} confirmed meals × {d.coins_per_meal} coins</p>{d.next_medal?<><div className="mt-5 flex justify-between gap-3 text-xs font-semibold"><span>Next: {d.next_medal.name}</span><span>{d.next_medal.remaining.toLocaleString("en-IN")} coins to go</span></div><progress className="reward-progress mt-2 w-full" aria-label={`Progress to ${d.next_medal.name}`} value={d.coins} max={d.next_medal.threshold}/><p className="mt-2 text-xs text-muted">{Math.ceil(d.next_medal.remaining/d.coins_per_meal).toLocaleString("en-IN")} more delivered meals to the next milestone. Share only genuine surplus.</p></>:<p className="mt-4 font-bold text-primary">You’ve earned our highest contribution medal.</p>}</Card><Card><Flame className="text-orange-600"/><h3 className="mt-3 text-xl font-bold">Small habits. Lasting change.</h3><p className="mt-2 text-sm text-muted">{d.weekly_streak?`${d.weekly_streak} consecutive active ${d.weekly_streak===1?"week":"weeks"}. Thank you for showing up.`:"Your first completed rescue starts your contribution story."} Weeks run Monday–Sunday UTC; the current week has time to grow.</p><p className="mt-4 rounded-xl bg-primaryLight p-3 text-sm"><strong>{d.impact.food_kg_estimate.toLocaleString("en-IN")} kg of food</strong> represented by your delivered meals. Your {receiver?"coordination":"generosity"} helped put that food to use.</p><p className="mt-2 text-xs text-muted">Estimate: meals × 0.4 kg. This does not establish what would otherwise have been wasted.</p></Card></div>
    <section className="recognition-controls"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-xl font-bold">Your medal cabinet</h3><Link to="/leaderboard" className="text-sm font-semibold text-primary">Community rankings →</Link></div><div className="medal-grid">{d.milestones.map((m,i)=><div className={`medal-card ${m.earned?"earned":""}`} key={m.name}><div className={`medal-icon medal-${i}`}>{m.earned?<Award size={28}/>:<LockKeyhole size={23}/>}</div><h4 className="mt-3 font-bold">{m.name}</h4><p className="mt-1 text-xs text-muted">{m.threshold.toLocaleString("en-IN")} coins · {(m.threshold/10).toLocaleString("en-IN")} {m.threshold===10?"meal":"meals"}</p><span className="mt-3 text-xs font-bold text-primary">{m.earned?"EARNED":"AHEAD OF YOU"}</span></div>)}</div><p className="mt-3 text-xs text-muted">Medals recognize delivery volume, not food safety or an organization’s worth. Every contribution matters.</p></section>
    <div className="recognition-controls flex flex-wrap gap-2">{tools.map(tool => <Link key={tool.title} to={tool.to} className="view-toggle">
      <tool.icon size={16}/>{tool.title}<ArrowUpRight size={14}/>
    </Link>)}</div>
    </>}
    <section id="lifetime-poster" className="grid items-start gap-5 lg:grid-cols-[1.1fr_1fr]"><div className="recognition-print rounded-2xl border border-border bg-white p-2"><img className="w-full rounded-xl" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} alt={`Overall appreciation for ${d.organization_name}: ${d.impact.total_meals_rescued} delivered meals, ${d.medal}`}/></div><div className="space-y-4 recognition-controls"><Card><p className="eyebrow text-primary">Your whole story, beautifully told</p><h3 className="mt-2 text-2xl font-bold">Your total contribution.<br/>One beautiful tribute.</h3><p className="mt-3 text-sm leading-relaxed text-muted">A platform-issued lifetime contribution record for your storefront, team wall or community update. Individual receiver-issued appreciation stays in the appreciation studio.</p><div className="my-4 flex gap-2">{(["garden","midnight"] as const).map(t=><button key={t} className={`view-toggle ${theme===t?"selected":""}`} aria-pressed={theme===t} onClick={()=>setTheme(t)}>{t==="garden"?"Harvest cream":"Forest & gold"}</button>)}</div><div className="grid gap-2"><Button disabled={busy||d.coins===0} onClick={()=>void exportImage()}><Download size={17}/>{busy?"Creating artwork…":"Download overall poster"}</Button><Button variant="secondary" disabled={d.coins===0} onClick={printImpact}>Print / save certificate PDF</Button><Button variant="secondary" onClick={()=>void copyStory()}>Copy your community story</Button></div>{d.coins===0&&<p className="mt-3 text-sm text-muted">Preview your certificate now; your first confirmed delivered meal enables export.</p>}{exported?.svg===svg&&<a className="mt-3 block text-sm text-primary underline" download="RescueRelay-lifetime-contribution.png" href={exported.url}>Save generated PNG again</a>}<p className="mt-4 text-xs text-muted">Estimated figures are labeled on the certificate.</p></Card><Card><h3 className="font-bold">The maths behind your recognition</h3><p className="mt-3 text-sm leading-relaxed text-muted">{d.rules}</p><p className="mt-3 text-sm text-muted">Medals are automatic platform recognition. No paid endorsements, partner discounts or financial redemption are currently offered.</p></Card></div></section>
    {notice&&<p role="status" className="recognition-controls rounded-xl bg-primaryLight p-3 text-sm">{notice}</p>}
    {!posterOnly && <Card className="recognition-controls"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-bold">Every coin has a story</h3><Button variant="secondary" onClick={exportLedger} disabled={!d.ledger.length}>Export coin activity CSV</Button></div><p className="mt-2 text-xs text-muted">Latest 100 confirmed rescues. Lifetime balance includes every delivery; retries and poster reissues earn no extra coins.</p><div className="mt-3 divide-y divide-border">{d.ledger.map(r=><Link key={r.rescue_id} to={receiver?`/receiver/pickup/${r.rescue_id}`:`/donor/rescue/${r.rescue_id}`} className="flex min-h-16 items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{r.display_id} · {r.meals} meals</p><p className="text-xs text-muted">{new Date(r.at).toLocaleDateString("en-IN")}</p></div><span className="shrink-0 rounded-full bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">+{r.coins.toLocaleString("en-IN")} coins</span></Link>)}{!d.ledger.length&&<p className="py-4 text-sm text-muted">Your first completed delivery will appear here.</p>}</div></Card>}
    </div>}
  </AppShell>;
}
