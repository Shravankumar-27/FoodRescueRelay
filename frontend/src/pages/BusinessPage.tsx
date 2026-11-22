import { useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import { BusinessShell, money, NumberField, PROPOSAL, SAFETY, SYNTHETIC } from "./BusinessShell";
import { printImpact } from "../lib/impactPrint";

const neighbourhoods = [
  { name: "Cedar Market", surplus: 840, need: 620, minutes: 34, trips: 24, meals: 720, cost: 7200 },
  { name: "Lakeview East", surplus: 360, need: 700, minutes: 57, trips: 12, meals: 310, cost: 4200 },
  { name: "Mill Quarter", surplus: 520, need: 520, minutes: 42, trips: 16, meals: 480, cost: 5600 },
  { name: "Garden Ward", surplus: 275, need: 540, minutes: 63, trips: 9, meals: 240, cost: 3150 },
];
const kgPerMeal = 0.4;
const co2PerKg = 2.5;

function Sponsor() {
  const [index, setIndex] = useState(0);
  const [sponsor, setSponsor] = useState("Cedar Circle (demo)");
  const [scope, setScope] = useState("Neighbourhood");
  const [pledge, setPledge] = useState(() => localStorage.getItem("rr-demo-pledge") ?? "");
  const area = neighbourhoods[index];
  return <BusinessShell title="Sponsor dashboard">
    <Card><div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Neighbourhood<select value={index} onChange={e => setIndex(Number(e.target.value))} className="mt-2 block min-h-12 w-full rounded-xl border border-border px-3">
        {neighbourhoods.map((n, i) => <option key={n.name} value={i}>{n.name}</option>)}
      </select></label>
      <Input label="Demo sponsor name" value={sponsor} maxLength={80} onChange={e => setSponsor(e.target.value)}/>
    </div></Card>
    <Card className="recognition-print space-y-4">
      <p className="text-sm text-muted">{PROPOSAL} {SYNTHETIC}</p>
      <h2 className="text-2xl font-bold text-primary">{sponsor.trim() || "Demo sponsor"}</h2>
      <h3 className="text-lg font-semibold">{area.name} monthly impact</h3>
      <dl className="grid gap-4 sm:grid-cols-4">{[
        ["Cost per rescued meal", money(area.cost / area.meals)], ["Trips funded", area.trips],
        ["Meals delivered", area.meals], ["Estimated CO₂e avoided", (area.meals * kgPerMeal * co2PerKg).toFixed(1) + " kg"],
      ].map(([title, value]) => <div key={title}><dt className="text-sm text-muted">{title}</dt><dd className="text-xl font-bold">{value}</dd></div>)}</dl>
      <p className="text-sm text-muted">Cost per meal = {money(area.cost)} illustrative transport spend ÷ {area.meals} delivered meals. CO₂e estimate = meals × {kgPerMeal} kg per meal × {co2PerKg} kg CO₂e per kg. Transport emissions are excluded.</p>
      <p className="text-sm">{SAFETY}</p>
    </Card>
    <Button variant="secondary" onClick={printImpact}>Print / save sponsor PDF</Button>
    <Card><h2 className="font-bold">Sponsor a route or neighbourhood</h2>
      <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={e => {e.preventDefault();
        const pledgedArea = scope === "Route" ? area.name + " collection route" : area.name;
        localStorage.setItem("rr-demo-pledge", pledgedArea);
        setPledge(pledgedArea);}}>
        <label className="text-sm font-semibold">Pledge scope<select className="mt-2 block min-h-10 rounded-xl border border-border px-3" value={scope} onChange={e => setScope(e.target.value)}><option>Neighbourhood</option><option>Route</option></select></label>
        <Button type="submit">Record demo pledge</Button>
      </form>{pledge && <p role="status" className="mt-3 text-sm">Demo pledge recorded for {pledge}.</p>}
    </Card>
  </BusinessShell>;
}

function City() {
  return <BusinessShell title="City coverage"><Card>
    <h2 className="text-xl font-bold">Neighbourhood coverage</h2>
    <p className="my-3 text-sm text-muted">{SYNTHETIC}. Monthly servings. Amber marks unmet need, green marks a surplus, and grey marks a balance.</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm">
      <thead><tr>{["Neighbourhood", "Surplus", "Receiver need", "Median time to rescue", "Coverage gap"].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead>
      <tbody>{neighbourhoods.map(n => <tr key={n.name} className={n.need > n.surplus ? (n.need - n.surplus > 300 ? "bg-amber-200" : "bg-amber-100") : n.surplus > n.need ? "bg-emerald-100" : "bg-slate-100"}>
        <th className="p-3">{n.name}</th><td className="p-3">{n.surplus}</td><td className="p-3">{n.need}</td><td className="p-3">{n.minutes} min</td><td className="p-3">{n.need > n.surplus ? `Yes · ${n.need - n.surplus} servings` : "No"}</td>
      </tr>)}</tbody>
    </table></div><p className="mt-4 text-sm">{SAFETY}</p>
  </Card></BusinessShell>;
}

function Economics() {
  const [fixed, setFixed] = useState(30000);
  const [variable, setVariable] = useState(180);
  const [meals, setMeals] = useState(48);
  const [donors, setDonors] = useState(40);
  const [price, setPrice] = useState(999);
  const [paid, setPaid] = useState(80);
  const revenue = price * Math.min(paid, 100) / 100;
  const margin = revenue - variable;
  return <BusinessShell title="Unit economics"><Card>
    <h2 className="text-xl font-bold">Monthly operating assumptions</h2><p className="my-2 text-sm text-muted">{SYNTHETIC}</p>
    <div className="my-4 grid gap-4 sm:grid-cols-3">
      <NumberField label="Fixed operating cost (INR)" value={fixed} onChange={setFixed}/>
      <NumberField label="Variable cost per donor (INR)" value={variable} onChange={setVariable}/>
      <NumberField label="Delivered meals per donor" value={meals} onChange={setMeals}/>
      <NumberField label="Active donors" value={donors} onChange={setDonors}/>
      <NumberField label="Price per paid donor (INR)" value={price} onChange={setPrice}/>
      <NumberField label="Paid donors (%)" value={paid} onChange={v => setPaid(Math.min(100, v))}/>
    </div>
    <dl className="space-y-4">
      <div><dt className="font-semibold">Cost per meal</dt><dd>{donors * meals ? money((fixed + variable * donors) / (donors * meals)) : "Requires delivered meals"}<br/><span className="text-sm text-muted">(Fixed cost + variable cost per donor × active donors) ÷ (delivered meals per donor × active donors)</span></dd></div>
      <div><dt className="font-semibold">Revenue per donor</dt><dd>{money(revenue)}<br/><span className="text-sm text-muted">Price per paid donor × paid donor share</span></dd></div>
      <div><dt className="font-semibold">Break-even donor count</dt><dd>{margin > 0 ? Math.ceil(fixed / margin) : "Requires a positive margin per donor"}<br/><span className="text-sm text-muted">Fixed cost ÷ (revenue per donor − variable cost per donor), rounded up</span></dd></div>
    </dl><p className="mt-4 text-sm">{SAFETY}</p>
  </Card></BusinessShell>;
}

function Pilot() {
  const [notes, setNotes] = useState<string[]>(() => JSON.parse(localStorage.getItem("rr-pilot-notes") || "[]"));
  const [note, setNote] = useState("");
  return <BusinessShell title="Pilot feedback"><Card>
    <h2 className="text-xl font-bold">Real conversation notes</h2>
    <p className="my-3 text-sm text-muted">This section is reserved for anonymised notes from real pilot conversations. Entries stay in this browser and are separate from the synthetic dashboards and exports.</p>
    <form className="space-y-3" onSubmit={e => {
      e.preventDefault();
      if (!note.trim()) return;
      const next = [note.trim(), ...notes];
      localStorage.setItem("rr-pilot-notes", JSON.stringify(next)); setNotes(next); setNote("");
    }}>
      <label className="block text-sm font-semibold">Short conversation note<textarea maxLength={500} required value={note} onChange={e => setNote(e.target.value)} className="mt-2 block w-full rounded-xl border border-border p-3" /></label>
      <Button type="submit">Save note</Button>
    </form>
    {notes.length ? <ul className="mt-4 space-y-2">{notes.map((entry, i) => <li className="rounded-xl bg-background p-3 text-sm" key={i}>{entry}</li>)}</ul> : <p className="mt-4 text-sm text-muted">No real conversations recorded.</p>}
  </Card></BusinessShell>;
}

export default function BusinessPage() {
  const { section } = useParams();
  if (section === "sponsors") return <Sponsor/>;
  if (section === "city") return <City/>;
  if (section === "economics") return <Economics/>;
  return <Pilot/>;
}
