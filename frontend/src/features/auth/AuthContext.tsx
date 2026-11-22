import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiRequest } from "../../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { LoginData, MeData, OrganizationOut, UserOut } from "../../types/api";
import { useToast } from "../toast/ToastContext";

const STORAGE_KEY = "rr.session";

interface Session {
  token: string;
  user: UserOut;
  organization: OrganizationOut;
}

interface AuthContextValue {
  user: UserOut | null;
  organization: OrganizationOut | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginData>;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Session | null;
    return parsed && typeof parsed.token === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null): void {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const [initial] = useState<Session | null>(() => readSession());
  const [session, setSession] = useState<Session | null>(initial);
  const [isReady, setIsReady] = useState<boolean>(initial === null);

  useEffect(() => {
    if (!initial) {
      return;
    }
    let cancelled = false;
    apiRequest<MeData>("/auth/me", { token: initial.token })
      .then((me) => {
        if (cancelled) return;
        const next: Session = {
          token: initial.token,
          user: me.user,
          organization: me.organization,
        };
        writeSession(next);
        setSession(next);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Only a 401 invalidates the stored session; other failures (e.g. offline) keep the cached one.
        if (err instanceof ApiError && err.status === 401) {
          writeSession(null);
          setSession(null);
        }
        toastError(err instanceof Error ? err.message : "Could not verify your session.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initial, toastError]);

  const login = useCallback(async (email: string, password: string): Promise<LoginData> => {
    const data = await apiRequest<LoginData>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const next: Session = {
      token: data.token,
      user: data.user,
      organization: data.organization,
    };
    await queryClient.cancelQueries();
    queryClient.clear();
    localStorage.removeItem("rr.draft");
    sessionStorage.removeItem("rr.repeat");
    writeSession(next);
    setSession(next);
    setIsReady(true);
    return data;
  }, [queryClient]);

  const logout = useCallback(() => {
    void queryClient.cancelQueries();
    queryClient.clear();
    localStorage.removeItem("rr.draft");
    sessionStorage.removeItem("rr.repeat");
    writeSession(null);
    setSession(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      organization: session?.organization ?? null,
      token: session?.token ?? null,
      login,
      logout,
      isReady,
    }),
    [session, login, logout, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
