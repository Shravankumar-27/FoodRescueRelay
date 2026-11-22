import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import BackButton from "../../components/ui/BackButton";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const page = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    page.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, []);

  return (
    <div ref={page} className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 via-white to-green-50">
      <header className="border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 font-bold text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-white" aria-hidden="true">R</span>
            Food Rescue Relay
          </Link>
          <BackButton fallback="/home" />
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 content-center gap-5 px-4 py-8 md:grid-cols-2 md:gap-0 md:px-8">
        {children}
      </main>
    </div>
  );
}
