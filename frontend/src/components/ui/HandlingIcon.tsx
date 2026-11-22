import { CircleHelp, Flame, Package, Snowflake, Thermometer, Utensils, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  HOT_HELD: Flame, HOT: Flame,
  REFRIGERATED: Snowflake, CHILLED: Snowflake, FROZEN: Snowflake,
  ROOM_TEMPERATURE: Thermometer, AMBIENT: Thermometer,
  PREPARED: Utensils, OTHER: Package, UNKNOWN: CircleHelp,
};

/** Decorative companion to a visible handling label, never a safety indicator. */
export default function HandlingIcon({type, className = "h-4 w-4 shrink-0"}:{type:string;className?:string}) {
  const Icon = ICONS[type] ?? CircleHelp;
  return <Icon className={className} aria-hidden="true" strokeWidth={1.75}/>;
}
