import type { ImpactSummary } from "./api";
export interface Contribution {
  organization_name: string;
  role: "DONOR" | "RECEIVER";
  generated_at: string;
  coins: number;
  coins_per_meal: number;
  medal: string;
  next_medal: {name:string; threshold:number; remaining:number} | null;
  milestones: {name:string; threshold:number; earned:boolean}[];
  active_weeks: number;
  weekly_streak: number;
  impact: ImpactSummary;
  ledger: {rescue_id:string; display_id:string; at:string; meals:number; coins:number}[];
  rules: string;
}
export interface AllocationGroup {name:string; people:number; servings:number; dietary_notes:string}
export interface AllocationPlan {
  rescue_id:string; display_id:string; status:string; available_servings:number;
  groups:AllocationGroup[]; revision:number; updated_at:string|null; needs_revision:boolean;
  handling_type:string; handling_notes:string|null;
  food_items:{name:string; dietary_type:string; allergens:string[]; allergen_info_unknown:boolean}[];
}
