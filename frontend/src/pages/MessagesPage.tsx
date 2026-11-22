import { Heart, MessageSquare } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import ChatBox from "../components/chat/ChatBox";
import Card from "../components/ui/Card";
import FavoritePartner, { useFavoritePartners } from "../components/partners/FavoritePartner";
import { useAuth } from "../features/auth/AuthContext";
import { apiRequest } from "../lib/api";
import { timeAgo } from "../lib/format";

export interface InboxItem {
  partner_id: string;
  name: string;
  last_message: string;
  unread: number;
  updated_at: string;
}

export default function MessagesPage() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const partner = params.get("partner");
  const favorites = useFavoritePartners();
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: () => apiRequest<InboxItem[]>("/partners/inbox", { token }), refetchInterval: 5000 });
  const name = inbox.data?.find(item => item.partner_id === partner)?.name
    ?? favorites.data?.find(item => item.id === partner)?.name;

  return <AppShell title="Messages" nav={user?.role === "DONOR" ? "donor" : "receiver"}>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)]">
      <aside className="min-w-0 space-y-4" aria-label="Message folders">
        <Card className="space-y-2">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><MessageSquare size={17} className="text-primary"/>Conversations</h2>
          {inbox.isPending ? <p className="text-sm text-muted">Loading messages…</p> : inbox.isError ?
            <button type="button" className="view-toggle" onClick={() => void inbox.refetch()}>Retry conversations</button> : !inbox.data?.length ?
            <p className="text-sm text-muted">No conversations yet.</p> :
            inbox.data.map(item => <button key={item.partner_id} type="button" onClick={() => setParams({ partner: item.partner_id })}
              aria-pressed={partner === item.partner_id}
              className={"w-full rounded-xl border px-3 py-2.5 text-left " + (partner === item.partner_id ? "border-primary/30 bg-primaryLight" : "border-border hover:bg-background")}>
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="min-w-0 truncate">{item.name}</span>
                {item.unread > 0 && <span className="shrink-0 rounded-full bg-primary px-2 text-white" aria-label={item.unread + " unread"}>{item.unread}</span>}
              </span>
              <span className="mt-1 block truncate text-xs text-muted">{item.last_message}</span>
              <span className="mt-1 block text-xs text-muted">{timeAgo(item.updated_at)}</span>
            </button>)}
        </Card>
        <Card>
          <h2 className="mb-2 flex items-center gap-2 font-bold"><Heart size={17} className="text-primary"/>Saved partners</h2>
          {favorites.data?.length ? favorites.data.map(item => <div key={item.id} className="flex items-center justify-between gap-2 border-t border-border">
            <button type="button" aria-pressed={partner === item.id} className="min-h-11 text-left text-sm font-semibold text-primary"
              onClick={() => setParams({ partner: item.id })}>{item.name}</button>
            <FavoritePartner id={item.id} name={item.name}/>
          </div>) : <p className="text-sm text-muted">No saved partners yet.</p>}
        </Card>
      </aside>
      {partner ? <ChatBox key={partner} partnerId={partner} recipientName={name}
        headerAction={<FavoritePartner id={partner} name={name ?? "partner"}/>}/> :
        <Card className="grid min-h-64 place-items-center text-center">
          <div>
            <MessageSquare size={28} className="mx-auto mb-3 text-primary" aria-hidden="true"/>
            <h2 className="font-bold">Select a conversation</h2>
            <p className="mt-1 text-sm text-muted">Choose a conversation or a saved partner.</p>
          </div>
        </Card>}
    </div>
  </AppShell>;
}
