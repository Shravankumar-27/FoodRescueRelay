import { useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { saveReminder, WEEKDAYS } from "../../lib/donationReminders";
import type { FoodItem } from "../../types/api";

export default function SaveDonationReminder({ org, getItems }: { org: string; getItems: () => FoodItem[] | null }) {
  const [name, setName] = useState("");
  const [weekly, setWeekly] = useState(true);
  const [weekday, setWeekday] = useState(new Date().getDay());
  const [time, setTime] = useState("20:00");
  const [eventEnd, setEventEnd] = useState("");
  const [message, setMessage] = useState("");

  function save() {
    const items = getItems();
    if (!items) return setMessage("Complete the food items before saving.");
    if (!name.trim()) return setMessage("Enter a name for this donation.");
    if (weekly && !time) return setMessage("Choose an event end time.");
    if (!weekly && !(Date.parse(eventEnd) > Date.now())) return setMessage("Choose a future event end time.");
    try {
      saveReminder(org, { name: name.trim(), food_items: items, ...(weekly ? { weekly: { weekday, time } } : { eventEnd }) });
      setMessage(weekly ? "Weekly template saved." : "Event-end reminder scheduled.");
      setName("");
    } catch {
      setMessage("Could not save the reminder on this device.");
    }
  }

  return <details className="space-y-3 rounded-xl border border-border bg-surface p-4">
    <summary className="cursor-pointer text-sm font-semibold">Save as a weekly template or schedule an event reminder</summary>
    <p className="text-sm text-muted">Reminders appear on the donor dashboard in this browser.</p>
    <Input label="Donation name" value={name} onChange={e => setName(e.target.value)} maxLength={60}/>
    <label className="block text-sm font-semibold">Reminder frequency
      <select className="ml-2 rounded border border-border p-1" value={weekly ? "weekly" : "once"} onChange={e => setWeekly(e.target.value === "weekly")}>
        <option value="weekly">Weekly</option><option value="once">One event</option>
      </select>
    </label>
    {weekly ? <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Event day<select className="mt-2 block w-full rounded border border-border p-2" value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{WEEKDAYS.map((day, i) => <option value={i} key={day}>{day}</option>)}</select></label>
      <Input label="Event end time" type="time" value={time} onChange={e => setTime(e.target.value)}/>
    </div> : <Input label="Event end" type="datetime-local" value={eventEnd} onChange={e => setEventEnd(e.target.value)}/>}
    <Button type="button" variant="secondary" onClick={save}>{weekly ? "Save weekly template" : "Schedule reminder"}</Button>
    {message && <p className="text-sm" role="status">{message}</p>}
  </details>;
}
