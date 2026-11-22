import { CheckCircle2, Leaf, Utensils } from "lucide-react";

export default function DeliveryImpact({meals}:{meals:number}) {
  const format = (value:number) => value.toLocaleString("en-IN", {maximumFractionDigits:1});
  return <div>
    <h3 className="flex items-center gap-2 text-base font-semibold"><Leaf size={18} className="text-primary" aria-hidden="true"/>Delivery impact</h3>
    <div className="mt-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primaryLight/70 to-background p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Estimated climate benefit</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-2 text-primaryDark"><strong className="text-4xl font-extrabold tracking-tight">{format(meals * .4 * 2.5)}</strong><span className="text-base font-semibold">kg CO₂e avoided</span></p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary/15 pt-4">
        <div><p className="flex items-center gap-1.5 text-xs text-muted"><Utensils size={14} aria-hidden="true"/>Meals delivered</p><p className="mt-1 text-lg font-bold">{format(meals)}</p></div>
        <div><p className="text-xs text-muted">Estimated food weight</p><p className="mt-1 text-lg font-bold">{format(meals * .4)} kg</p></div>
      </div>
    </div>
    <p className="mt-3 flex items-start gap-1.5 text-xs text-muted"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true"/>Based on receiver-confirmed delivered servings.</p>
    <details className="mt-3 text-xs text-muted"><summary className="cursor-pointer font-semibold text-primary">Estimate assumptions</summary><p className="mt-2 leading-relaxed">Delivered meals × 0.4 kg food × 2.5 kg CO₂e per kg food. Illustrative estimate, not measured emissions or carbon credits. Rejected servings are excluded.</p></details>
  </div>;
}
