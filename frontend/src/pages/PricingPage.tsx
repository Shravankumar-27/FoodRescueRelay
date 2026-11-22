import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import { BusinessShell, money, NumberField, PROPOSAL, SYNTHETIC } from "./BusinessShell";

const plans = [
  { name: "Community", price: 0, description: "Receiving is always free. Post or accept compatible food and track deliveries.", to: "/login", action: "Sign in" },
  { name: "Donor Pro", price: 999, description: "Weekly templates, event reminders and client impact reports.", to: "#value", action: "Calculate donor ROI" },
  { name: "Neighbourhood sponsor", price: 4999, description: "Fund an illustrative route and view delivery outcomes.", to: "/business/sponsors", action: "Explore sponsorship" },
];

export default function PricingPage() {
  const [weeklySurplus, setWeeklySurplus] = useState(30);
  const [disposalRate, setDisposalRate] = useState(10);
  const [meals, setMeals] = useState(60);
  const [minutes, setMinutes] = useState(45);
  const [hourly, setHourly] = useState(300);
  const [price, setPrice] = useState(plans[1].price);
  const weekly = weeklySurplus * disposalRate + minutes / 60 * hourly;

  return <BusinessShell title="Plans and sponsors">
    <section className="harvest-hero"><h2 className="text-3xl font-bold">Fund local food rescue coordination</h2><p className="mt-3 text-white/80">Receiving is always free.</p></section>
    <div className="grid gap-4 lg:grid-cols-3">{plans.map(plan => <Card key={plan.name}>
      <h3 className="text-xl font-bold">{plan.name}</h3>
      <p className="mt-2 text-2xl font-extrabold text-primary">{plan.price ? money(plan.price) + " / month" : "Free"}</p>
      <p className="my-3 text-sm text-muted">{plan.description}</p>
      <p className="my-3 text-xs text-muted">{PROPOSAL}</p>
      {plan.to.startsWith("#") ? <a className="hero-cta" href={plan.to}>{plan.action}</a> : <Link className="hero-cta" to={plan.to}>{plan.action}</Link>}
    </Card>)}</div>
    <Card id="value"><h2 className="text-xl font-bold">Donor ROI calculator</h2><p className="mt-2 text-sm text-muted">{SYNTHETIC}. Not a food-safety certification.</p>
      <div className="my-4 grid gap-4 sm:grid-cols-3">
        <NumberField label="Weekly surplus (kg)" value={weeklySurplus} onChange={setWeeklySurplus}/>
        <NumberField label="Disposal cost saved per kg (INR)" value={disposalRate} onChange={setDisposalRate}/>
        <NumberField label="Meals rescued per week" value={meals} onChange={setMeals}/>
        <NumberField label="Staff minutes saved per week" value={minutes} onChange={setMinutes}/>
        <NumberField label="Staff cost per hour (INR)" value={hourly} onChange={setHourly}/>
        <label className="text-sm font-semibold">Donor plan<select className="mt-2 block min-h-12 w-full rounded-xl border border-border px-3" value={price} onChange={e => setPrice(Number(e.target.value))}>{plans.slice(0, 2).map(p => <option key={p.name} value={p.price}>{p.name}</option>)}</select></label>
      </div>
      <p className="text-sm text-muted">Weekly value = surplus × disposal savings per kg + staff minutes ÷ 60 × hourly cost. Uses 52 weeks per year. Meals are tracked separately from savings.</p>
      <table className="mt-4 w-full text-left text-sm"><thead><tr><th>Estimate</th><th>Monthly</th><th>Yearly</th></tr></thead><tbody>
        {[["Value", money(weekly * 52 / 12), money(weekly * 52)], ["Plan price", money(price), money(price * 12)], ["Value after plan", money(weekly * 52 / 12 - price), money(weekly * 52 - price * 12)], ["Meals rescued", Math.round(meals * 52 / 12), meals * 52]].map(([label, month, year]) => <tr className="border-t border-border" key={label}><th className="py-2">{label}</th><td>{month}</td><td>{year}</td></tr>)}
      </tbody></table>
    </Card>
  </BusinessShell>;
}
