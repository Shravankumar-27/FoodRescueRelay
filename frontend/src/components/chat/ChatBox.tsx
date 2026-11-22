import { useState, useRef, useEffect, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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
}

export default function ChatBox({ rescueId, partnerId, recipientName, defaultOpen = false }: ChatBoxProps) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const endpoint = partnerId ? `/partners/${partnerId}/chat` : `/rescues/${rescueId}/chat`;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatQuery = useQuery({
    queryKey: ["chat", partnerId ?? rescueId],
    queryFn: () => apiRequest<ChatData>(endpoint, { token }),
    enabled: !!token && !!(partnerId || rescueId) && isOpen,
    refetchInterval: isOpen ? 3500 : 15000,
  });

  const sendMutation = useMutation({
    mutationFn: (msg: string) =>
      apiRequest<{ id: string; created_at: string }>(endpoint, {
        method: "POST",
        token,
        body: { message: msg },
      }),
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["chat", partnerId ?? rescueId] });
    },
  });

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [chatQuery.data?.messages, isOpen]);

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

  return (
    <div className="rounded-2xl border border-primary/20 bg-surface shadow-card overflow-hidden">
      {/* Header bar / Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 bg-primaryLight/40 hover:bg-primaryLight/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm text-ink">
              <span>Chat with {recipientName ?? chatQuery.data?.partner_name ?? "partner"}</span>
              {messages.length > 0 && (
                <span className="rounded-full bg-primary text-white text-xs font-bold px-1.5 py-0.2">
                  {messages.length}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">Coordinate handoff & live timing</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <span>{isOpen ? "Collapse" : "Open Chat"}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Collapsible Chat Body */}
      {isOpen && (
        <div className="p-3.5 flex flex-col gap-3">
          {chatQuery.isError && <Button variant="secondary" size="sm" onClick={() => void chatQuery.refetch()}>Retry messages</Button>}
          {/* Messages list */}
          <div role="log" aria-live="polite" className="max-h-56 min-h-24 overflow-y-auto flex flex-col gap-2 p-1 rounded-xl bg-background border border-border/60">
            {chatQuery.isLoading ? (
              <p className="text-xs text-muted text-center py-4">Loading messages...</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-6 px-4">
                <p className="text-xs font-semibold text-ink">No messages yet</p>
                <p className="text-xs text-muted mt-0.5">
                  Send a quick update or choose a suggested message below.
                </p>
              </div>
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
                      className={`rounded-2xl px-3.5 py-2 break-words text-sm font-medium leading-relaxed shadow-sm ${
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
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div>
            <div className="flex items-center gap-1 text-xs font-semibold text-muted mb-1.5">
              <Sparkles className="h-3 w-3 text-accent" />
              <span>Suggested quick messages:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
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
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              aria-label="Message"
              type="text"
              placeholder="Type message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
              maxLength={500}
            />
            <Button
              aria-label="Send message"
              type="submit"
              size="sm"
              variant="primary"
              disabled={!messageText.trim() || sendMutation.isPending}
              className="px-3 min-h-[36px]"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
