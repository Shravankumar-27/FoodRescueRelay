import type { FoodItem } from "../types/api";
import { randomId } from "./randomId";

export interface DonationReminder {
  id: string;
  name: string;
  food_items: FoodItem[];
  weekly?: { weekday: number; time: string };
  eventEnd?: string;
  used?: number;
}

const key = (org: string) => `rr.reminders.${org}`;

export function readReminders(org: string): DonationReminder[] {
  try {
    return JSON.parse(localStorage.getItem(key(org)) ?? "[]");
  } catch {
    return [];
  }
}

export function saveReminder(org: string, reminder: Omit<DonationReminder, "id">) {
  localStorage.setItem(key(org), JSON.stringify([...readReminders(org), { ...reminder, id: randomId() }]));
}

export function updateReminders(org: string, reminders: DonationReminder[]) {
  localStorage.setItem(key(org), JSON.stringify(reminders));
}

export function dueTime(reminder: DonationReminder, now: Date): number | null {
  if (reminder.eventEnd) {
    const end = Date.parse(reminder.eventEnd);
    return end <= now.getTime() && end > (reminder.used ?? 0) ? end : null;
  }
  if (!reminder.weekly) return null;
  const date = new Date(now);
  const daysAgo = (now.getDay() - reminder.weekly.weekday + 7) % 7;
  const [hours, minutes] = reminder.weekly.time.split(":").map(Number);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  const elapsed = now.getTime() - date.getTime();
  return elapsed >= 0 && elapsed < 86_400_000 && date.getTime() > (reminder.used ?? 0) ? date.getTime() : null;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
