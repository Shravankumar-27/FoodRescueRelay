import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { useAuth } from "../../features/auth/AuthContext";

type NavKey = "donor" | "receiver" | "admin";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: Record<NavKey, NavItem[]> = {
  donor: [
    { to: "/donor", label: "Home", end: true },
    { to: "/donor/rescues", label: "Rescues" },
    { to: "/donor/impact", label: "Impact" },
  ],
  receiver: [
    { to: "/receiver", label: "Available", end: true },
    { to: "/receiver/capacity", label: "Capacity" },
    { to: "/receiver/history", label: "History" },
  ],
  admin: [
    { to: "/admin", label: "Overview", end: true },
    { to: "/admin/organizations", label: "Organizations" },
    { to: "/admin/rescues", label: "Rescues" },
  ],
};

export default function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: NavKey;
  children: ReactNode;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
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

  const isDonor = nav === "donor";

  const links = NAV_ITEMS[nav].map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        isDonor
          ? `flex min-h-[44px] flex-1 items-center justify-center px-2 text-sm font-medium ${
              isActive ? "text-primary" : "text-muted"
            }`
          : `flex min-h-[44px] items-center whitespace-nowrap rounded-button px-3 text-sm font-medium ${
              isActive ? "bg-primary/10 text-primary" : "text-muted hover:text-ink"
            }`
      }
    >
      {item.label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 p-4">
          <Link to="/" className="font-semibold text-primary">
            RescueRelay
          </Link>
          <h1 className="truncate text-lg font-semibold text-ink">{title}</h1>
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
        {!isDonor && (
          <nav aria-label="Main" className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3">
            {links}
          </nav>
        )}
      </header>

      {!online && (
        <div
          role="status"
          className="border-b border-accent bg-amber-50 px-4 py-2 text-center text-sm text-ink"
        >
          You're offline. Your latest data may be outdated.
        </div>
      )}

      <main className="mx-auto max-w-5xl p-4 pb-24">{children}</main>

      {isDonor && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 border-t border-border bg-surface"
        >
          <div className="mx-auto flex max-w-5xl">{links}</div>
        </nav>
      )}
    </div>
  );
}
