import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../components/layout/AppShell";
import ChatBox from "../components/chat/ChatBox";
import Card from "../components/ui/Card";
import FavoritePartner, { useFavoritePartners } from "../components/partners/FavoritePartner";
import { useAuth } from "../features/auth/AuthContext";
import { apiRequest } from "../lib/api";

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
      <div className="space-y-3">
        <Card>
          <h3 className="mb-2 font-bold">{user?.role === "DONOR" ? "Favorite receivers" : "Favorite donors"}</h3>
          {favorites.data?.length ? favorites.data.map(item => <div key={item.id} className="flex items-center justify-between gap-2 border-t border-border">
            <button className="py-2 text-left text-sm font-semibold text-primary" onClick={() => setParams({ partner: item.id })}>{item.name}</button>
            <FavoritePartner id={item.id} name={item.name}/>
          </div>) : <p className="text-sm text-muted">Use the heart to save a partner.</p>}
        </Card>
        <Card>
          <h3 className="mb-2 font-bold">Conversations</h3>
          {inbox.isPending ? <p className="text-sm text-muted">Loading messages…</p> : !inbox.data?.length ?
            <p className="text-sm text-muted">No conversations yet.</p> :
            inbox.data.map(item => <button key={item.partner_id} type="button" onClick={() => setParams({ partner: item.partner_id })}
              className={`mb-1 w-full rounded-lg p-2 text-left ${partner === item.partner_id ? "bg-primaryLight" : "hover:bg-background"}`}>
              <span className="flex justify-between gap-2 text-sm font-semibold">{item.name}
                {item.unread > 0 && <span className="rounded-full bg-primary px-2 text-white">{item.unread}</span>}
              </span>
              <span className="block truncate text-xs text-muted">{item.last_message}</span>
            </button>)}
        </Card>
      </div>
      {partner ? <div>
        <div className="mb-2 flex items-center justify-end text-sm"><FavoritePartner id={partner} name={name ?? "partner"}/></div>
        <ChatBox key={partner} partnerId={partner} defaultOpen/>
      </div> : <Card>Select a partner to chat.</Card>}
    </div>
  </AppShell>;
}
