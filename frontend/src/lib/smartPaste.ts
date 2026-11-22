export function localDateTime(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

interface ClockTime { hour: number; minute: number; meridiem?: string }

function readTime(raw: string): ClockTime | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(raw.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || (meridiem ? hour < 1 || hour > 12 : hour > 23)) return null;
  return { hour, minute, meridiem };
}

function onDate(day: Date, time: ClockTime, hour = time.hour): Date {
  const date = new Date(day);
  date.setHours(hour, time.minute, 0, 0);
  return date;
}

function hourOf(time: ClockTime): number {
  return time.meridiem ? time.hour % 12 + (time.meridiem === "pm" ? 12 : 0) : time.hour;
}

export function parseSurplus(text: string, now: Date) {
  const match = /^(\d+)\s+(?:plates?|meals?|servings?)\s+([^,]+),\s*cooked\s+([^,]+),\s*pick\s*up\s+by\s+([^,]+)$/i.exec(text.trim());
  if (!match) return null;
  const quantity = Number(match[1]);
  const food = match[2].trim();
  const cooked = readTime(match[3]);
  const pickup = readTime(match[4]);
  if (!food || food.length > 120 || !cooked || !pickup || quantity < 1 || quantity > 100000) return null;

  const prepared = onDate(now, cooked, hourOf(cooked));
  if (prepared > now) prepared.setDate(prepared.getDate() - 1);
  const pickupHours = !pickup.meridiem && pickup.hour >= 1 && pickup.hour <= 12 && cooked.meridiem
    ? [pickup.hour % 12, pickup.hour % 12 + 12] : [hourOf(pickup)];
  const deadline = pickupHours.map(hour => {
    const date = onDate(prepared, pickup, hour);
    if (date <= prepared) date.setDate(date.getDate() + 1);
    return date;
  }).sort((a, b) => a.getTime() - b.getTime())[0];

  return { quantity, food, prepared: localDateTime(prepared), pickup: localDateTime(deadline) };
}
