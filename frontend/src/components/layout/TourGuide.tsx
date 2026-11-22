import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { Role, RescueSummary, ReceiverHistoryItem } from "../../types/api";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";

interface TourStep {
  path: string;
  title: string;
  description: string;
  target: string;
  nextLabel?: string;
  clickThrough?: boolean;
}

const TOURS: Record<Role, TourStep[]> = {
  DONOR: [
    { path: "/donor", target: "main .harvest-hero", title: "Good food deserves a destination", description: "Food Rescue Relay connects surplus food from local businesses with nearby community kitchens before it spoils. This dashboard brings your donations, partners and results together." },
    { path: "/donor", target: "[data-tour='post-food-cta']", title: "Start a food rescue", description: "Select Post food to create a listing. The tour will open the form; it will never submit a donation for you.", nextLabel: "Continue", clickThrough: true },
    { path: "/donor/rescue/new?tourStep=1", target: "[data-tour='donation-form']", title: "Tell us what is available", description: "Add the food name, servings, category, diet and known allergens. Smart paste can prefill the form, and you review every detail." },
    { path: "/donor/rescue/new?tourStep=2", target: "[data-tour='donation-handling']", title: "Share handling details", description: "Confirm the food was untouched and describe how it was held. Clear allergen and storage details help receivers decide if they can accept it." },
    { path: "/donor/rescue/new?tourStep=3", target: "[data-tour='donation-deadline']", title: "Set a realistic pickup window", description: "Add when the food was prepared and when it must be collected. The app shows an estimated consume-by time; its defaults are planning estimates, not safety certification." },
    { path: "/donor/rescue/new?tourStep=3", target: "[data-tour='donation-submit']", title: "Post and find a match", description: "When your details are ready, this submits the listing and starts matching. For this tour, choose Continue; no sample donation will be posted.", nextLabel: "Explain matching" },
    { path: "/donor", target: "#receiver-directory", title: "Matching starts nearby", description: "The system checks distance, servings, dietary fit, storage, timing and receiver capacity. Time-limited offers can rotate to the next suitable partner if needed." },
    { path: "/donor-active-rescue", target: "#tour-pickup-code", title: "The pickup code protects the handoff", description: "A short-lived code appears on a claimed rescue. Share it with the assigned receiver at pickup; it confirms collection." },
    { path: "/donor-active-rescue", target: "#tour-rescue-timeline", title: "Follow the rescue to delivery", description: "The timeline records matching, claim, collection and delivery. A rescue counts as delivered only after the receiver records final quantities." },
    { path: "/donor/rescues", target: "[data-tour='rescue-history-list']", title: "Your recent rescue records", description: "Search and filter previous listings, reopen a rescue’s details, and see what is still waiting for a completed handoff." },
    { path: "/donor/impact", target: "[data-tour='impact-summary']", title: "Measure what reached people", description: "Confirmed delivered servings become meals. Food weight and CO₂e are estimates, with their assumptions shown so modeled impact is clear." },
    { path: "/leaderboard", target: "[aria-label='How rankings work']", title: "A community that shows up", description: "Explore donor and receiver contributions, trust signals and milestones. Recognition does not change who can access food." },
    { path: "/contribution", target: ".coin-wallet", title: "Your contribution, recognized", description: "See lifetime coins, medals and appreciation artwork. Coins recognize receiver-confirmed meals; they have no cash or matching advantage." },
    { path: "/pricing", target: "main #value", title: "Explore the proposed donor value", description: "The ROI calculator lets you model disposal and staff-time assumptions. Plans and prices are proposals; billing is not active." },
    { path: "/business/sponsors", target: "main .recognition-print", title: "See the sponsor opportunity", description: "Sponsors can explore a route or neighbourhood and preview cost per rescued meal and an impact report. The figures are synthetic examples." },
    { path: "/business/city", target: "main table", title: "Spot community coverage gaps", description: "The city view compares sample surplus and receiver need to illustrate where a pilot route could help." },
    { path: "/business/economics", target: "main dl", title: "Test the business model", description: "Adjust operating costs, donor pricing and meal volume to explore modeled break-even. These assumptions need real pilot validation." },
  ],
  RECEIVER: [
    { path: "/receiver", target: "main section:first-of-type", title: "A reliable path from surplus to service", description: "Food Rescue Relay helps your organization find nearby surplus, coordinate a time-sensitive pickup and record what was delivered to your community." },
    { path: "/receiver/capacity", target: "main .harvest-hero", title: "Tell matching what your team can use", description: "Set your current capacity, dietary preferences, storage and transport so the system can filter out unsuitable or unworkable offers." },
    { path: "/receiver/capacity", target: "[data-tour='receiver-capacity']", title: "Keep availability current", description: "Update servings you can accept now and your food restrictions. Matching uses these details whenever it looks for a receiver." },
    { path: "/receiver", target: "[data-tour='available-food']", title: "Browse compatible food", description: "Review donor listings by servings, deadline, dietary information, allergens and handling. Map and list views show donors, with approximate locations before a claim." },
    { path: "/receiver", target: "#offers-heading", title: "Decide whether an offer fits", description: "Check the food and pickup window, then accept only if your team can collect and use it. You can message the donor to coordinate." },
    { path: "/receiver-active-pickup", target: "#tour-receiver-pickup", title: "Confirm collection carefully", description: "After a claim, coordinate transport and containers, check in, then enter the donor’s four-digit code and the quantity collected." },
    { path: "/receiver-active-pickup", target: "#tour-receiver-delivery", title: "Record the food delivered", description: "After distribution, record delivered and rejected servings separately. This confirmation updates both partners’ status and impact." },
    { path: "/receiver/planner", target: "main .harvest-hero", title: "Plan a fair distribution", description: "Use the allocation planner to divide a collected batch among community groups and prepare a packing list. It is a planning aid, not a recipient registry." },
    { path: "/receiver/history", target: "main ul", title: "Keep your handoff history", description: "Review pickups, deadlines and delivery outcomes. Open a rescue whenever your team needs to continue a handoff." },
    { path: "/receiver/impact", target: "[data-tour='impact-summary']", title: "Show the difference your team made", description: "Meals are counted from confirmed delivered servings. People served are reported by your organization; climate values are labeled estimates." },
    { path: "/contribution", target: ".coin-wallet", title: "Celebrate your role", description: "Your coordination and completed handoffs earn contribution recognition. Create an appreciation poster to share your organization’s work." },
    { path: "/leaderboard", target: "[aria-label='How rankings work']", title: "Stand with the community", description: "See the organizations helping food reach people. Rankings recognize delivery history and never affect your access to donations." },
    { path: "/business/sponsors", target: "main .recognition-print", title: "See how sponsors can help", description: "A sponsor may support a route or neighbourhood. This dashboard uses sample figures to show a possible funding and impact report." },
  ],
  ADMIN: [
    { path: "/admin", target: "main .harvest-hero", title: "Coordinate a dependable network", description: "Food Rescue Relay brings donors and receivers together to move surplus food before its useful pickup window closes." },
    { path: "/admin", target: "main .grid", title: "Monitor the rescue pipeline", description: "Review active and expired listings, partner queues and receiver-confirmed meals to spot operational gaps." },
    { path: "/admin/organizations", target: "main .section-heading", title: "Review partner organizations", description: "Check organization records and identity status. Verification records an identity check; it is not a food-safety certification." },
    { path: "/admin/rescues", target: "main ul", title: "Follow rescue operations", description: "Inspect current statuses and handoffs, especially rescues that are collected but still need delivery confirmation." },
    { path: "/admin/recognition", target: "main .grid", title: "Review appreciation records", description: "Keep receiver-issued recognition connected to completed deliveries and consent." },
    { path: "/community/impact", target: "[data-tour='impact-summary']", title: "Read the community impact", description: "Review confirmed meal totals and the transparent assumptions behind estimated food and climate outcomes." },
    { path: "/business/sponsors", target: "main .recognition-print", title: "Explain the sponsor case", description: "Explore illustrative route sponsorship and cost-per-meal reporting. The proposal is not active billing or validated revenue." },
  ],
};

interface SavedTour { active: boolean; index: number }
interface TourBounds { top: number; left: number; width: number; height: number; bottom: number }

function readTour(key: string): SavedTour {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "null") as SavedTour | null;
    return value && typeof value.active === "boolean" && Number.isInteger(value.index) ? value : { active: false, index: 0 };
  } catch { return { active: false, index: 0 }; }
}

function readBounds(key: string): TourBounds | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as TourBounds | null;
    return value && [value.top, value.left, value.width, value.height, value.bottom].every(Number.isFinite) ? value : null;
  } catch { return null; }
}

const pathnameOf = (path: string) => path.split("?")[0];
const ACTIVE_DONOR_STATUSES = ["CLAIMED", "COLLECTED", "OFFERED", "MATCHING", "POSTED"];
const ACTIVE_RECEIVER_STATUSES = ["CLAIMED", "COLLECTED"];

export default function TourGuide({ role, userId }: { role: Role; userId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const storageKey = `rr.tour.${userId}`;
  const boundsKey = `rr.tour.bounds.${userId}`;
  const seenKey = `rr.tour.seen.${userId}`;
  const steps = useMemo(() => TOURS[role], [role]);
  const [saved, setSaved] = useState<SavedTour>(() => readTour(storageKey));
  const [targetRect, setTargetRect] = useState<TourBounds | null>(() => readBounds(boundsKey));
  const dialogRef = useRef<HTMLElement>(null);
  const [dialogPosition, setDialogPosition] = useState({ top: 12, left: 12, below: true });
  const donorRescues = useQuery({
    queryKey: ["rescues", "mine"],
    queryFn: () => apiRequest<RescueSummary[]>("/rescues/mine", { token }),
    enabled: saved.active && role === "DONOR" && !!token,
  });
  const receiverHistory = useQuery({
    queryKey: ["receiver", "history"],
    queryFn: () => apiRequest<ReceiverHistoryItem[]>("/offers/history", { token }),
    enabled: saved.active && role === "RECEIVER" && !!token,
  });
  const current = steps[Math.min(saved.index, steps.length - 1)];
  const latestDonorRescue = [...(donorRescues.data ?? [])]
    .filter(rescue => ACTIVE_DONOR_STATUSES.includes(rescue.status))
    .sort((a, b) => ACTIVE_DONOR_STATUSES.indexOf(a.status) - ACTIVE_DONOR_STATUSES.indexOf(b.status) || b.created_at.localeCompare(a.created_at))[0] ?? donorRescues.data?.[0];
  const receiverEntries = [...(receiverHistory.data ?? [])];
  const latestReceiverPickup = receiverEntries
    .filter(rescue => ACTIVE_RECEIVER_STATUSES.includes(rescue.status))
    .sort((a, b) => ACTIVE_RECEIVER_STATUSES.indexOf(a.status) - ACTIVE_RECEIVER_STATUSES.indexOf(b.status) || b.pickup_by.localeCompare(a.pickup_by))[0]
    ?? receiverEntries.sort((a, b) => b.pickup_by.localeCompare(a.pickup_by))[0];

  function pathFor(step: TourStep) {
    if (step.path === "/donor-active-rescue") return latestDonorRescue ? `/donor/rescue/${latestDonorRescue.id}` : "/donor/rescues";
    if (step.path === "/receiver-active-pickup") return latestReceiverPickup ? `/receiver/pickup/${latestReceiverPickup.rescue_id}` : "/receiver/history";
    return step.path;
  }

  const actualTarget = current?.path === "/donor-active-rescue" && latestDonorRescue?.status !== "CLAIMED"
    ? "#tour-rescue-timeline"
    : current?.path === "/receiver-active-pickup" && latestReceiverPickup?.status === "COLLECTED"
      ? "#tour-receiver-delivery"
      : current?.path === "/receiver-active-pickup" && latestReceiverPickup?.status === "DELIVERED"
        ? "#tour-receiver-delivered"
      : current?.path === "/receiver-active-pickup" && latestReceiverPickup?.status === "CLAIMED" && current.target === "#tour-receiver-delivery"
        ? "#tour-receiver-pickup"
      : current?.target;

  const focusHeight = Math.min(360, window.innerHeight * 0.42);
  const focusWidth = targetRect ? Math.min(targetRect.width + 10, window.innerWidth - 16) : 0;
  const focus = targetRect ? {
    top: targetRect.height > focusHeight ? Math.max(8, (window.innerHeight - focusHeight) / 2) : Math.max(8, targetRect.top - 5),
    left: Math.max(8, Math.min(targetRect.left - 5, window.innerWidth - focusWidth - 8)),
    width: focusWidth,
    height: Math.min(targetRect.height + 10, focusHeight, window.innerHeight - 16),
  } : null;

  function updateBounds(rect: DOMRect) {
    const bounds = { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom };
    sessionStorage.setItem(boundsKey, JSON.stringify(bounds));
    setTargetRect(bounds);
  }

  useEffect(() => {
    if (!saved.active || !current) return;
    // Clicking the highlighted Post food CTA also advances into the form.
    const next = steps[saved.index + 1];
    if (current.clickThrough && next && location.pathname !== pathnameOf(current.path) && location.pathname === pathnameOf(next.path)) {
      const advanced = { active: true, index: saved.index + 1 };
      localStorage.setItem(storageKey, JSON.stringify(advanced));
      setSaved(advanced);
      return;
    }
  }, [current, location.pathname, saved.active, saved.index, steps, storageKey]);

  useEffect(() => {
    if (!saved.active || !actualTarget) return;
    let frame = 0;
    let attempts = 0;
    let cleanup: void | (() => void);
    const locate = () => {
      let target = document.querySelector<HTMLElement>(actualTarget);
      if (!target && attempts++ < 120) {
        frame = window.requestAnimationFrame(locate);
        return;
      }
      target = target ?? document.querySelector<HTMLElement>("main h2") ?? document.querySelector<HTMLElement>("main");
      if (!target) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      const measure = () => updateBounds(target.getBoundingClientRect());
      measure();
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, true);
      const settle = window.setTimeout(measure, 450);
      cleanup = () => {
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure, true);
        window.clearTimeout(settle);
      };
    };
    frame = window.requestAnimationFrame(locate);
    return () => {
      window.cancelAnimationFrame(frame);
      cleanup?.();
    };
  }, [actualTarget, location.pathname, saved.active]);

  useEffect(() => {
    if (location.pathname.replace(/\/$/, "") !== `/${role.toLowerCase()}` || localStorage.getItem(seenKey)) return;
    localStorage.setItem(seenKey, "true");
    const first = { active: true, index: 0 };
    localStorage.setItem(storageKey, JSON.stringify(first));
    setSaved(first);
  }, [location.pathname, role, seenKey, storageKey]);

  function start() {
    const first = { active: true, index: 0 };
    localStorage.setItem(storageKey, JSON.stringify(first));
    setSaved(first);
    navigate(pathFor(steps[0]));
  }

  function close() {
    const next = { ...saved, active: false };
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(next);
    if (location.pathname === "/donor/rescue/new" && location.search.includes("tourStep=")) navigate("/donor/rescue/new", { replace: true });
  }

  function goTo(index: number) {
    if (index < 0 || index >= steps.length) return;
    const next = { active: true, index };
    localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(next);
    navigate(pathFor(steps[index]));
  }

  let description = current?.description ?? "";
  if (current?.path === "/donor-active-rescue" && latestDonorRescue?.status !== "CLAIMED") {
    description = latestDonorRescue?.status === "DELIVERED"
      ? "The temporary code is shown only during an active claim and expires after collection. This rescue is already complete; on a new claim, share the code with the assigned receiver at pickup."
      : latestDonorRescue
      ? "A temporary code appears here after a receiver claims the listing. Share it at pickup so collection can be confirmed. Your current rescue has not reached that step yet."
      : "After a receiver claims a rescue, a temporary code appears on its detail page. Share it at pickup so collection can be confirmed. No rescue is available in this account yet.";
  }
  if (current?.path === "/receiver-active-pickup" && !latestReceiverPickup) {
    description = "After you claim a donation, this page guides your team through pickup checks, the donor’s code, collected servings and delivery confirmation. Claim a listing to use the live handoff.";
  } else if (current?.path === "/receiver-active-pickup" && latestReceiverPickup?.status === "COLLECTED") {
    description = "After collection, record delivered and rejected servings separately. The confirmed delivery updates both partners’ status and impact.";
  } else if (current?.path === "/receiver-active-pickup" && latestReceiverPickup?.status === "DELIVERED") {
    description = "This handoff is complete. During an active pickup, your team confirms collection with the donor’s temporary code, then records delivered and rejected servings here.";
  } else if (current?.path === "/receiver-active-pickup" && latestReceiverPickup?.status === "CLAIMED" && current.target === "#tour-receiver-delivery") {
    description = "Once the food is collected and reaches your team, this delivery panel appears. Record delivered and rejected servings separately to update the rescue and impact totals.";
  }

  useLayoutEffect(() => {
    if (!saved.active || !focus) return;
    const placeDialog = () => {
      const card = dialogRef.current;
      if (!card) return;
      const margin = 12;
      const cardHeight = Math.min(card.getBoundingClientRect().height, window.innerHeight - margin * 2);
      const belowTop = focus.top + focus.height + margin;
      const aboveTop = focus.top - cardHeight - margin;
      const fitsBelow = belowTop + cardHeight <= window.innerHeight - margin;
      const fitsAbove = aboveTop >= margin;
      let top: number;
      let below: boolean;
      if (fitsBelow) {
        top = belowTop;
        below = true;
      } else if (fitsAbove) {
        top = aboveTop;
        below = false;
      } else {
        top = Math.max(margin, Math.min(belowTop, window.innerHeight - cardHeight - margin));
        below = top >= focus.top + focus.height / 2;
      }
      const left = Math.max(margin, Math.min(focus.left + (focus.width - card.offsetWidth) / 2, window.innerWidth - card.offsetWidth - margin));
      setDialogPosition({ top, left, below });
    };
    placeDialog();
    window.addEventListener("resize", placeDialog);
    return () => window.removeEventListener("resize", placeDialog);
  }, [focus?.top, focus?.left, focus?.width, focus?.height, saved.active, saved.index, location.pathname, description]);

  return <>
    <button type="button" onClick={start} title="Take a guided tour" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-primary hover:bg-primaryLight">
      <BookOpen size={16}/><span className="hidden sm:inline">Tour guide</span>
    </button>
    {saved.active && current && focus && <div className="pointer-events-none fixed inset-0 z-[100]" aria-label="Guided tour">
      <div className="pointer-events-auto absolute inset-x-0 top-0 bg-transparent" style={{ height: focus.top }} />
      <div className="pointer-events-auto absolute bg-transparent" style={{ top: focus.top, left: 0, width: focus.left, height: focus.height }} />
      <div className="pointer-events-auto absolute right-0 bg-transparent" style={{ top: focus.top, width: Math.max(0, window.innerWidth - focus.left - focus.width), height: focus.height }} />
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 bg-transparent" style={{ top: focus.top + focus.height }} />
      {!current.clickThrough && <div aria-hidden="true" className="pointer-events-auto absolute" style={focus} />}
      <div aria-hidden="true" className="pointer-events-none fixed z-[101] rounded-2xl ring-2 ring-primary ring-offset-4 ring-offset-transparent transition-[top,left,width,height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]" style={focus}/>
      <section ref={dialogRef} key={`${location.pathname}-${saved.index}`} role="dialog" aria-modal="true" aria-labelledby="tour-title" className="tour-card-enter pointer-events-auto fixed z-[102] w-[calc(100vw-24px)] max-w-sm overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl transition-[top,left] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5" style={{ top: dialogPosition.top, left: dialogPosition.left, maxHeight: "min(68dvh, 440px)" }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary"><BookOpen size={16}/>{role === "DONOR" ? "Donor tour" : role === "RECEIVER" ? "Receiver tour" : "Admin tour"}</div>
          <button type="button" onClick={close} aria-label="Close tour" className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-background"><X size={18}/></button>
        </div>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((saved.index + 1) / steps.length) * 100}%` }}/></div>
        <p className="text-xs font-semibold text-muted">STOP {saved.index + 1} OF {steps.length}</p>
        <h2 id="tour-title" className="mt-2 text-xl font-bold text-ink">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
        {current.clickThrough && <p className="mt-2 text-xs font-semibold text-primary">Click the highlighted Post food button, or choose Continue.</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={close} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-background">End tour</button>
          <div className="flex gap-2">
            <button type="button" onClick={() => goTo(saved.index - 1)} disabled={saved.index === 0} className="grid h-11 w-11 place-items-center rounded-xl border border-border disabled:opacity-40" aria-label="Previous tour step"><ChevronLeft size={18}/></button>
            {saved.index === steps.length - 1
              ? <button type="button" onClick={close} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white">Finish tour</button>
              : <button type="button" onClick={() => goTo(saved.index + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white">{current.nextLabel ?? "Continue"}<ChevronRight size={17}/></button>}
          </div>
        </div>
        <span aria-hidden="true" className={dialogPosition.below ? "absolute -top-2 left-8 h-4 w-4 rotate-45 border-l border-t border-border bg-surface" : "absolute -bottom-2 left-8 h-4 w-4 rotate-[225deg] border-l border-t border-border bg-surface"}/>
      </section>
    </div>}
  </>;
}
