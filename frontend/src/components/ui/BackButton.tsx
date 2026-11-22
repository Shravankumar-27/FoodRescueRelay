import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export default function BackButton({ fallback = "/home" }: { fallback?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  return <button type="button" onClick={() => {
    // A directly opened page has no in-app history to return to.
    const index = window.history.state?.idx;
    if (typeof index === "number" ? index > 0 : location.key !== "default") navigate(-1);
    else navigate(fallback, { replace: true });
  }} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:bg-background hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
    <ArrowLeft size={17} aria-hidden="true"/>Back
  </button>;
}
