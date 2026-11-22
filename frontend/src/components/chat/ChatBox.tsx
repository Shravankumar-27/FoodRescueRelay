import { useState, useRef, useEffect, type FormEvent, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import VerifiedBadge from "../partners/VerifiedBadge";
import Button from "../ui/Button";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { formatDateTime, timeAgo } from "../../lib/format";
import { foodLabel } from "../../lib/food";
import type { ChatData } from "../../types/api";

interface ChatBoxProps {
  rescueId?: string;
  partnerId?: string;
  recipientName?: string;
  defaultOpen?: boolean;
  headerAction?: ReactNode;
}

export default function ChatBox({ rescueId, partnerId, recipientName, defaultOpen = false, headerAction }: ChatBoxProps) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const endpoint = partnerId ? `/partners/${partnerId}/chat` : `/rescues/${rescueId}/chat`;
  const [expanded, setExpanded] = useState(defaultOpen);
  const isOpen = !!partnerId || expanded;
  const [messageText, setMessageText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  const chatQuery = useQuery({
    queryKey: ["chat", partnerId ?? rescueId],
    queryFn: () => apiRequest<ChatData>(endpoint, { token }),
    enabled: !!token && !!(partnerId || rescueId) && isOpen,
    refetchInterval: isOpen ? 3500 : 15000,
  });

  const sendMutation = useMutation({meta: { errorDisplay: "inline" }, 
    mutationFn: (msg: string) =>
      apiRequest<{ id: string; created_at: string }>(endpoint, {
        method: "POST",
        token,
        body: { message: msg },
      }),
    onSuccess: (_data, sent) => {
      setMessageText(current => current.trim() === sent ? "" : current);
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["chat", partnerId ?? rescueId] });
    },
  });

  const lastMessageId = chatQuery.data?.messages.slice(-1)[0]?.id;
  useEffect(() => {
    if (isOpen) {
      const log = logRef.current;
      if (log) log.scrollTop = log.scrollHeight;
    }
  }, [lastMessageId, isOpen]);

  const messages = chatQuery.data?.messages ?? [];
  const suggested = chatQuery.data?.suggested ?? [
    "On our way! ETA 10m",
    "Food is packed and hot",
    "Ready for pickup",
    "Thank you!",
  ];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(messageText.trim());
  }

  function handleSendSuggestion(suggestion: string) {
    if (sendMutation.isPending) return;
    sendMutation.mutate(suggestion);
  }

  const partner = recipientName ?? chatQuery.data?.partner_name ?? "Partner";
  const title = <span className="flex min-w-0 items-center gap-3">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primaryLight text-primary">
      <MessageSquare size={18} aria-hidden="true"/>
    </span>
    <span className="min-w-0 break-words text-sm font-bold">{partnerId ? partner : "Messages with " + partner}</span>
  </span>;

  return (
    <section aria-label="Messages" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      {partnerId ? <header className="flex min-h-16 items-center justify-between gap-3 px-4">
        {title}{headerAction}
      </header> : <button type="button" onClick={() => setExpanded(open => !open)} aria-expanded={isOpen}
        className="flex min-h-16 w-full items-center justify-between gap-3 px-4 text-left hover:bg-background">
        {title}{isOpen ? <ChevronUp size={18} className="shrink-0"/> : <ChevronDown size={18} className="shrink-0"/>}
      </button>}
      {partnerId && chatQuery.data?.partner_id_checked !== undefined && <div className="px-4 pb-3"><VerifiedBadge checked={chatQuery.data.partner_id_checked}/></div>}
      {isOpen && (
        <div className="flex flex-col gap-3 border-t border-border p-3 sm:p-4">
          {chatQuery.isError && <Button variant="secondary" size="sm" onClick={() => void chatQuery.refetch()}>Retry messages</Button>}
          {/* Messages list */}
          <div role="log" aria-live="polite" ref={logRef} className={partnerId ? "flex h-80 flex-col gap-3 overflow-y-auto rounded-xl bg-background p-3" : "flex h-52 flex-col gap-3 overflow-y-auto rounded-xl bg-background p-3"}>
            {chatQuery.isLoading ? (
              <p className="text-xs text-muted text-center py-4">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="m-auto text-sm text-muted">No messages yet</p>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_role === user?.role;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[85%] ${
                      isMe ? "ml-auto" : "mr-auto"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-xs text-muted mb-0.5 px-1">
                      <span>{isMe ? "You" : m.sender_name}</span>
                      <span>·</span>
                      <span>{timeAgo(m.created_at)}</span>
                    </div>
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-3.5 py-2 break-words text-sm font-medium leading-relaxed shadow-sm ${
                        isMe
                          ? "bg-primary text-white rounded-br-none"
                          : "bg-surface border border-border text-ink rounded-bl-none"
                      }`}
                    >
                      {m.allocation_proposal ? <div className="space-y-1">
                        <p className="font-bold">{m.message}</p>
                        <ul className="list-inside list-disc">
                          {m.allocation_proposal.items.map(item => <li key={item.id}>{item.servings} × {item.name} · {foodLabel(item.diet)}</li>)}
                        </ul>
                        <p>Pickup by {formatDateTime(m.allocation_proposal.pickup_by)} IST · {m.allocation_proposal.locality}</p>
                        <p>{m.allocation_proposal.status === "open" ? "Reply to confirm availability and coordinate pickup."
                          : m.allocation_proposal.status === "closed" ? "This rescue is closed to proposals."
                          : "A newer proposal replaced this one."}</p>
                      </div> : m.message}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <details>
            <summary className="cursor-pointer text-sm font-semibold text-primary">Quick replies</summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggested.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSendSuggestion(s)}
                  disabled={sendMutation.isPending}
                  className="rounded-full border border-primary/30 bg-primaryLight/50 px-2.5 py-1 text-xs font-medium text-primaryDark hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </details>

          {/* Input form */}
          {sendMutation.isError && <p role="alert" className="text-sm text-danger">Message not sent. Your draft is saved here; please try again.</p>}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              aria-label="Message"
              rows={2}
              placeholder="Write a message…"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); handleSubmit(event); } }}
              className="min-w-0 flex-1 resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
              maxLength={500}
            />
            <Button
              aria-label="Send message"
              type="submit"
              size="sm"
              variant="primary"
              disabled={!messageText.trim() || sendMutation.isPending}
              className="min-h-11 px-3"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
          <p className="text-xs text-muted">Enter to send · Shift + Enter for a new line <span className="float-right">{messageText.length}/500</span></p>
        </div>
      )}
    </section>
  );
}
