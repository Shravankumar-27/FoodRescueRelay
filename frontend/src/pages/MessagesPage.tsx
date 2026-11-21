import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import ChatBox from "../components/chat/ChatBox";
import Card from "../components/ui/Card";
import { useAuth } from "../features/auth/AuthContext";
import { apiRequest } from "../lib/api";
export interface InboxItem { partner_id: string; name: string; last_message: string; unread: number; updated_at: string }
export default function MessagesPage() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const partner = params.get("partner");
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: () => apiRequest<InboxItem[]>("/partners/inbox", { token }), refetchInterval: 5000 });
  return <AppShell title="Partner messages" nav={user?.role === "DONOR" ? "donor" : "receiver"}><div className="mb-5"><p className="eyebrow text-primary">Plan a better handoff</p><h2 className="mt-2 text-2xl font-bold">A quick conversation goes a long way.</h2><p className="mt-2 text-sm text-muted">Confirm capacity, dietary needs and packaging before posting. Messages stay in the app; chat does not reserve food.</p></div><div className="grid items-start gap-4 lg:grid-cols-[260px_1fr]"><Card><h3 className="mb-3 font-bold">Conversations</h3>{inbox.isError && <p role="alert" className="text-danger">{inbox.error.message}</p>}{inbox.isPending ? <p className="text-sm text-muted">Loading messages…</p> : !inbox.data?.length ? <p className="text-sm text-muted">Choose a partner from the dashboard to start a conversation.</p> : inbox.data.map(item => <button key={item.partner_id} onClick={() => setParams({partner:item.partner_id})} className={`mb-2 w-full rounded-xl p-3 text-left ${partner === item.partner_id ? "bg-primaryLight" : "bg-background"}`}><span className="flex justify-between gap-2 text-sm font-bold">{item.name}{item.unread > 0 && <span className="rounded-full bg-primary px-2 text-white">{item.unread}</span>}</span><span className="mt-1 block truncate text-sm text-muted">{item.last_message}</span></button>)}</Card>{partner ? <ChatBox key={partner} partnerId={partner} defaultOpen/> : <Card className="py-14 text-center"><MessageCircle className="mx-auto mb-3 text-primary"/><h3 className="font-bold">Your community, one conversation away</h3><p className="mt-2 text-sm text-muted">Select a conversation to read and reply.</p></Card>}</div></AppShell>;
}
