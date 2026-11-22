import type { AllocationGroup } from "../types/contribution";

/** Largest remainders: whole servings, capped at one per person, stable ties. */
export function allocateFairly(groups: AllocationGroup[], available: number): AllocationGroup[] {
  const total = groups.reduce((s,g)=>s+g.people,0);
  if (!total || !Number.isInteger(available) || available < 0 || groups.some(g=>!Number.isInteger(g.people)||g.people<1)) return groups;
  const budget = Math.min(total, available);
  const parts = groups.map((g,i)=>({i, exact:budget*g.people/total, servings:Math.floor(budget*g.people/total)}));
  let left = budget - parts.reduce((s,p)=>s+p.servings,0);
  [...parts].sort((a,b)=>(b.exact-b.servings)-(a.exact-a.servings)||a.i-b.i).forEach(p=>{if(left>0){parts[p.i].servings++;left--;}});
  return groups.map((g,i)=>({...g,servings:parts[i].servings}));
}
