import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type DonationReminder, dueTime, readReminders, updateReminders, WEEKDAYS } from "../../lib/donationReminders";
import Button from "../ui/Button";
import Card from "../ui/Card";

export default function DonationReminders({ org }: { org: string }) {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState(() => readReminders(org));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(timer);
  }, []);
  if (!reminders.length) return null;

  function update(next: DonationReminder[]) {
    updateReminders(org, next);
    setReminders(next);
  }

  function open(reminder: DonationReminder) {
    const due = dueTime(reminder, now);
    if (due !== null) update(reminders.map(item => item.id === reminder.id ? { ...item, used: due } : item));
    sessionStorage.setItem("rr.repeat", JSON.stringify({ food_items: reminder.food_items, fresh: true }));
    navigate("/donor/rescue/new");
  }

  return <Card className="space-y-3">
    <h2 className="font-bold">Weekly templates and event reminders</h2>
    {reminders.map(reminder => {
      const due = dueTime(reminder, now);
      return <div key={reminder.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background p-3">
        <div><p className="font-semibold">{reminder.name}</p>
          <p className="text-sm text-muted">{reminder.weekly ? `${WEEKDAYS[reminder.weekly.weekday]} at ${reminder.weekly.time}` : new Date(reminder.eventEnd!).toLocaleString("en-IN")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(due !== null || reminder.weekly) && <Button variant="secondary" onClick={() => open(reminder)}>{due !== null ? "Your event ended, post leftovers in 30 seconds" : "Use template"}</Button>}
          <Button variant="ghost" onClick={() => update(reminders.filter(item => item.id !== reminder.id))}>Remove</Button>
        </div>
      </div>;
    })}
  </Card>;
}
