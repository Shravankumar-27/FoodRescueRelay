import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { solveAllocation, type PuzzleItem, type PuzzleReceiver } from "../../lib/allocationPuzzle";
import { foodLabel } from "../../lib/food";
import { formatDateTime } from "../../lib/format";
import Card from "../ui/Card";
import Button from "../ui/Button";

interface Puzzle {
  items: PuzzleItem[];
  receivers: PuzzleReceiver[];
  requires_refrigeration: boolean;
  pickup_by: string;
  notices?: Notice[];
}

interface Notice {
  receiver_id: string;
  items: PuzzleItem[];
  sent_at: string;
  read_at: string | null;
}

interface Proposal {
  receiver_id: string;
  items: { item_id: string; servings: number }[];
}

function proposalItems(items: PuzzleItem[]): Proposal["items"] {
  return items.map(item => ({ item_id: item.id, servings: item.servings }))
    .sort((a, b) => a.item_id.localeCompare(b.item_id));
}

export default function AllocationPuzzle({ rescueId, children }: { rescueId: string; children?: ReactNode }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<PuzzleReceiver>>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const key = ["allocation-puzzle", rescueId];
  const path = `/rescues/${rescueId}/allocation-puzzle`;
  const query = useQuery({
    queryKey: key,
    queryFn: () => apiRequest<Puzzle>(path, { token }),
    enabled: open,
    refetchInterval: 15000,
  });
  const notify = useMutation({
    mutationFn: (proposals: Proposal[]) => apiRequest<{ notices: Notice[]; sent: number }>(`${path}/notify`, {
      method: "POST", token, body: { proposals },
    }),
    onSuccess: ({ notices }) => {
      setSelected({});
      client.setQueryData<Puzzle>(key, cached => cached && ({
        ...cached,
        notices: [...notices, ...(cached.notices ?? []).filter(notice => !notices.some(sent => sent.receiver_id === notice.receiver_id))],
      }));
      for (const notice of notices) void client.invalidateQueries({ queryKey: ["chat", notice.receiver_id] });
      void client.invalidateQueries({ queryKey: ["inbox"] });
    },
    onError: () => void query.refetch(),
  });
  const data = query.data;
  const total = data?.items.reduce((sum, item) => sum + item.servings, 0) ?? 0;
  const minutesLeft = data ? (Date.parse(data.pickup_by) - Date.now()) / 60000 : 0;
  const plan = data && solveAllocation(data.items, [...data.receivers].sort((a, b) => a.pickup_minutes - b.pickup_minutes || a.name.localeCompare(b.name)).map(receiver => ({
    ...receiver, ...edits[receiver.id],
  })), data.requires_refrigeration, minutesLeft, true);
  const allocated = total - (plan?.unallocated.reduce((sum, item) => sum + item.servings, 0) ?? 0);
  const rows = data && plan ? plan.allocations.map(({ receiver, items }) => {
    const original = data.receivers.find(candidate => candidate.id === receiver.id)!;
    const notice = data.notices?.find(sent => sent.receiver_id === receiver.id);
    const proposal = { receiver_id: receiver.id, items: proposalItems(items) };
    const signature = JSON.stringify(proposal.items);
    const servings = items.reduce((sum, item) => sum + item.servings, 0);
    const simulated = servings > Math.min(original.capacity, original.volunteers ?? original.capacity)
      || (data.requires_refrigeration && !original.refrigeration);
    const alreadySent = notice && signature === JSON.stringify(proposalItems(notice.items));
    const selectable = items.length > 0 && !simulated && !alreadySent;
    return { receiver, items, original, notice, proposal, signature, simulated, alreadySent, selectable, servings };
  }) : [];
  const eligible = rows.filter(row => row.selectable);
  const proposals = eligible.filter(row => selected[row.receiver.id] === row.signature).map(row => row.proposal);
  function update(id: string, patch: Partial<PuzzleReceiver>) {
    setEdits(previous => ({ ...previous, [id]: { ...previous[id], ...patch } }));
    setSelected({});
  }

  return <Card>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-semibold">Match and allocate</h3>
      <Button variant="secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide plan" : "Explore split plan"}</Button>
    </div>
    {children}
    {open && <div className="mt-4 space-y-3 border-t border-border pt-4">
      {query.isPending && <p role="status">Loading receiver capacity…</p>}
      {query.isError && <Button variant="secondary" onClick={() => void query.refetch()}>Retry plan</Button>}
      {data && plan && <>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="font-semibold">{allocated} of {total} servings allocated{data.requires_refrigeration ? " · refrigeration required" : ""}</p>
          <button type="button" className="text-sm font-semibold text-primary underline" onClick={() => { setEdits({}); setSelected({}); }}>Reset to receiver settings</button>
        </div>
        <div className="divide-y divide-border rounded-xl border border-border sm:max-h-96 sm:overflow-auto">
        {rows.filter(row => row.items.length || row.notice || row.original.eligible_items.length).map(({ receiver, items, original, notice, signature, simulated, alreadySent, selectable, servings }) => {
          const maximum = Math.max(original.capacity, original.volunteers ?? 0, total);
          const timeLimit = Math.max(1, Math.ceil(minutesLeft), Math.ceil(receiver.pickup_minutes));
          return <div key={receiver.id} className="p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{receiver.name}</p>
                <p className="text-sm text-muted">{servings ? items.map(item => `${item.servings} × ${item.name}`).join(", ") : "No servings assigned"}</p>
              </div>
              {selectable && <label className="inline-flex min-h-9 items-center gap-2 text-sm">
                <input type="checkbox" checked={selected[receiver.id] === signature} disabled={notify.isPending}
                  onChange={event => setSelected(previous => ({ ...previous, [receiver.id]: event.target.checked ? signature : "" }))}/>
                <span>Notify<span className="sr-only"> {receiver.name}{notice ? " of this update" : ""}</span></span>
              </label>}
            </div>
            <details className="mt-1">
              <summary className="cursor-pointer text-sm font-semibold text-primary">Adjust {receiver.name}</summary>
              <div className="mt-2 grid gap-3 rounded-lg bg-background p-3 text-sm sm:grid-cols-2">
              <label>Capacity ({receiver.capacity} servings)<input className="mt-1 block w-full" type="range" min={0} max={maximum} value={receiver.capacity} onChange={event => update(receiver.id, { capacity: event.target.valueAsNumber })}/></label>
              <label>Volunteer capacity ({receiver.volunteers ?? receiver.capacity} servings)<input className="mt-1 block w-full" type="range" min={0} max={maximum} value={receiver.volunteers ?? receiver.capacity} onChange={event => update(receiver.id, { volunteers: event.target.valueAsNumber })}/></label>
              <label>Pickup within ({receiver.latestPickup ?? Math.max(0, Math.ceil(minutesLeft))} min)<input className="mt-1 block w-full" type="range" min={0} max={timeLimit} value={receiver.latestPickup ?? Math.max(0, Math.ceil(minutesLeft))} onChange={event => update(receiver.id, { latestPickup: event.target.valueAsNumber })}/></label>
              <label>Dietary requirement<select className="mt-1 block w-full" value={receiver.diet ?? ""} onChange={event => update(receiver.id, { diet: event.target.value })}>
                <option value="">Use receiver preferences</option>
                {[...new Set(data.items.map(item => item.diet))].map(diet => <option key={diet} value={diet}>{foodLabel(diet)} only</option>)}
              </select></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={receiver.refrigeration} onChange={event => update(receiver.id, { refrigeration: event.target.checked })}/>Refrigeration available</label>
              <p className="text-muted">Estimated pickup with buffer · {Math.ceil(receiver.pickup_minutes)} min</p>
            </div>
            </details>
            {items.length > 0 && simulated && <p className="mt-2 text-sm text-warn">Preview only. This allocation exceeds the receiver’s current capacity or refrigeration settings.</p>}
            {notice && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{alreadySent ? "This proposal" : "Previous proposal"} {notice.read_at ? "read" : "sent"} {formatDateTime(notice.read_at ?? notice.sent_at)}</span>
              <Link to={`/messages?partner=${receiver.id}`} className="font-semibold text-primary underline">Open conversation</Link>
            </div>}
          </div>;
        })}
        </div>
        {plan.unallocated.length > 0 && <p className="text-sm font-semibold text-warn">Unallocated · {plan.unallocated.map(item => `${item.servings} × ${item.name}`).join(", ")}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
        {eligible.length > 1 && <Button type="button" variant="ghost" disabled={notify.isPending} onClick={() => setSelected(
          proposals.length === eligible.length ? {} : Object.fromEntries(eligible.map(row => [row.receiver.id, row.signature]))
        )}>{proposals.length === eligible.length ? "Clear selection" : "Select all eligible"}</Button>}
        <Button type="button" disabled={!proposals.length || notify.isPending || query.isError} onClick={() => notify.mutate(proposals)}>
          {notify.isPending ? "Sending proposals…" : proposals.length ? `Notify ${proposals.length} selected` : "Notify selected"}
        </Button>
        </div>
        {notify.isSuccess && <p role="status" className="text-sm">{notify.data.sent ? `Sent ${notify.data.sent} allocation proposal${notify.data.sent === 1 ? "" : "s"}.` : "These proposals were already sent."}</p>}
      </>}
    </div>}
  </Card>;
}
