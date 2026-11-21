import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warn";

interface ToastOptions {
  variant?: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

interface Toast {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions | string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 shrink-0 text-success" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-danger" />,
  info: <Info className="h-5 w-5 shrink-0 text-info" />,
  warn: <AlertTriangle className="h-5 w-5 shrink-0 text-warn" />,
};

const BG: Record<ToastVariant, string> = {
  success: "bg-successLight border-success/30",
  error: "bg-dangerLight border-danger/30",
  info: "bg-infoLight border-info/30",
  warn: "bg-accentLight border-accent/30",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex min-w-[280px] max-w-sm items-start gap-3 rounded-card border p-3 shadow-card animate-slide-in-right ${BG[toast.variant]}`}
    >
      {ICON[toast.variant]}
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-semibold text-ink">{toast.title}</p>}
        <p className="text-sm text-ink">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 text-muted hover:text-ink"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timerRef.current[id]);
    delete timerRef.current[id];
  }, []);

  const toast = useCallback(
    (options: ToastOptions | string, variant: ToastVariant = "info", duration?: number) => {
      const id = crypto.randomUUID();
      let t: Toast;
      if (typeof options === "string") {
        t = { id, message: options, variant, duration: duration ?? 4000 };
      } else {
        t = {
          id,
          title: options.title,
          message: options.message,
          variant: options.variant ?? variant,
          duration: options.duration ?? duration ?? 4000,
        };
      }
      setToasts((prev) => [...prev.slice(-4), t]);
      timerRef.current[id] = setTimeout(() => {
        dismiss(id);
      }, t.duration);
    },
    [dismiss],
  );

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error = useCallback((m: string) => toast(m, "error", 6000), [toast]);
  const info = useCallback((m: string) => toast(m, "info"), [toast]);
  const warn = useCallback((m: string) => toast(m, "warn"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warn }}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-label="Notifications"
          className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 md:bottom-6 md:right-6"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
