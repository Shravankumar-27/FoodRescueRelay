import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import type { InboxItem } from "../../pages/MessagesPage";
import type { Contribution } from "../../types/contribution";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  MessageCircle,
  History,
  BarChart3,
  BookOpen,
  Settings,
  Users,
  ShieldCheck,
  LogOut,
  Wifi,
  WifiOff,
  Utensils,
  Heart,
  Trophy,
  Sparkles,
  Coins,
} from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";

type NavKey = "donor" | "receiver" | "admin";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV_ITEMS: Record<NavKey, NavItem[]> = {
  donor: [
    { to: "/donor", label: "Home", icon: <Home className="h-5 w-5" />, end: true },
    { to: "/donor/rescues", label: "Rescues", icon: <History className="h-5 w-5" /> },
    { to: "/donor/impact", label: "Impact", icon: <BarChart3 className="h-5 w-5" /> },
    { to: "/leaderboard", label: "Rankings", icon: <Trophy className="h-5 w-5" /> },
    { to: "/contribution", label: "Kindness", icon: <Sparkles className="h-5 w-5" /> },
  ],
  receiver: [
    { to: "/receiver", label: "Available", icon: <Utensils className="h-5 w-5" />, end: true },
    { to: "/receiver/capacity", label: "Settings", icon: <Settings className="h-5 w-5" /> },
    { to: "/receiver/impact", label: "Impact", icon: <BarChart3 className="h-5 w-5" /> },
    { to: "/receiver/history", label: "History", icon: <History className="h-5 w-5" /> },
    { to: "/contribution", label: "Kindness", icon: <Sparkles className="h-5 w-5" /> },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: <BarChart3 className="h-5 w-5" />, end: true },
    { to: "/admin/organizations", label: "Organizations", icon: <Users className="h-5 w-5" /> },
    { to: "/admin/rescues", label: "Rescues", icon: <BookOpen className="h-5 w-5" /> },
    { to: "/admin/recognition", label: "Certificates", icon: <BookOpen className="h-5 w-5" /> },
    { to: "/leaderboard", label: "Rankings", icon: <Trophy className="h-5 w-5" /> },
  ],
};

const ROLE_BADGE: Record<NavKey, { label: string; icon: ReactNode; color: string }> = {
  donor: { label: "Donor", icon: <Utensils className="h-3 w-3" />, color: "text-primary bg-primaryLight" },
  receiver: { label: "NGO / Receiver", icon: <Heart className="h-3 w-3" />, color: "text-info bg-infoLight" },
  admin: { label: "Admin", icon: <ShieldCheck className="h-3 w-3" />, color: "text-warn bg-accentLight" },
};

export default function AppShell({
  title,
  nav,
  children,
  backTo,
}: {
  title: string;
  nav: NavKey;
  children: ReactNode;
  backTo?: string;
}) {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const contribution = useQuery({queryKey:["contribution",user?.id],queryFn:()=>apiRequest<Contribution>("/contribution",{token}),enabled:!!token&&user?.role!=="ADMIN",refetchInterval:15000});
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: () => apiRequest<InboxItem[]>("/partners/inbox", { token }), enabled: !!token && user?.role !== "ADMIN", refetchInterval: 10000 });
  const unread = (inbox.data ?? []).reduce((sum, item) => sum + item.unread, 0);
  const [online, setOnline] = useState<boolean>(() => navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const roleBadge = ROLE_BADGE[nav];
  const links = NAV_ITEMS[nav];

  // Bottom nav for mobile (all roles), sidebar nav for desktop donor, top tabs for desktop others
  const bottomNav = (
    <nav
      aria-label="Main"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm md:hidden"
    >
      <div className="mx-auto flex max-w-5xl">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                    isActive ? "bg-primaryLight text-primary" : "text-muted"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );

  const desktopSidebar = (
    <aside className="hidden w-48 shrink-0 md:block">
      <div className="sticky top-16 flex flex-col gap-1 pt-4">
        {links.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-[44px] items-center gap-3 rounded-button px-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primaryLight text-primary"
                  : "text-muted hover:bg-background hover:text-ink"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:block focus:bg-white focus:p-3">Skip to content</a>
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-black">
              R
            </span>
            <span className="hidden sm:inline">RescueRelay</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {backTo && (
              <button
                type="button"
                aria-label="Go back"
                onClick={() => navigate(backTo)}
                className="text-muted hover:text-ink text-sm"
              >
                ←
              </button>
            )}
            <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold sm:inline-flex ${roleBadge.color}`}
            >
              {roleBadge.icon}
              {roleBadge.label}
            </span>

            {!online && (
              <span
                title="You're offline"
                className="flex items-center gap-1 text-xs text-warn"
                aria-label="Offline"
              >
                <WifiOff className="h-4 w-4" />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}
            {online && (
              <span className="hidden text-muted sm:flex items-center gap-1 text-xs">
                <Wifi className="h-3 w-3 text-success" />
              </span>
            )}

            <span className="hidden text-sm text-muted sm:block">{user?.name ?? ""}</span>

            {contribution.data&&<Link to="/contribution" aria-label={`${contribution.data.coins} kindness coins, view medals`} className="hidden min-h-11 items-center gap-1 rounded-full bg-amber-50 px-3 text-xs font-bold text-amber-800 sm:inline-flex"><Coins size={15}/>{contribution.data.coins.toLocaleString("en-IN")}</Link>}

            {user?.role !== "ADMIN" && <Link to="/messages" aria-label={`Messages${unread ? `, ${unread} unread` : ""}`} className="relative flex h-11 w-11 items-center justify-center rounded-xl text-primary hover:bg-primaryLight"><MessageCircle size={20}/>{unread > 0 && <span className="absolute right-0 top-0 rounded-full bg-urgent px-1.5 text-xs text-white">{unread}</span>}</Link>}
            <button
              aria-label="Log out"
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="flex min-h-[36px] items-center gap-1.5 rounded-button border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-ink hover:text-ink"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Out</span>
            </button>
          </div>
        </div>
      </header>

      {!online && (
        <div
          role="status"
          className="bg-accentLight px-4 py-2 text-center text-xs text-warn"
        >
          You're offline. Data shown may be outdated.
        </div>
      )}

      {/* Main layout: sidebar on desktop, full-width on mobile */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-6 px-4 py-4 md:pb-6">
        {desktopSidebar}
        <main id="main-content" className="min-w-0 flex-1">{children}</main>
      </div>
      <footer className="border-t border-border bg-surface pb-24 md:pb-0">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
          <span className="font-semibold text-ink">RescueRelay</span>
          <Link className="font-semibold text-primary hover:underline" to="/community/impact">Community impact</Link>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      {bottomNav}
    </div>
  );
}
