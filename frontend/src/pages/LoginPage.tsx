import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Utensils, LogIn, Eye, EyeOff, CheckCircle2, HeartHandshake } from "lucide-react";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import AuthLayout from "../features/auth/AuthLayout";
import { useToast } from "../features/toast/ToastContext";
import { ApiError } from "../lib/api";

const DEMO_PASSWORD = "demo123";

const DEMO_ACCOUNTS: { email: string; label: string; role: string; color: string }[] = [
  {
    email: "donor@rescuerelay.demo",
    label: "Donor",
    role: "Madhapur Grand Events",
    color: "border-primary/40 hover:border-primary hover:bg-primaryLight",
  },
  {
    email: "hope@rescuerelay.demo",
    label: "NGO",
    role: "Hope Community Kitchen",
    color: "border-info/40 hover:border-info hover:bg-infoLight",
  },
  {
    email: "shelter@rescuerelay.demo",
    label: "NGO",
    role: "ShelterServe Community Shelter",
    color: "border-info/40 hover:border-info hover:bg-infoLight",
  },
  {
    email: "cityfood@rescuerelay.demo",
    label: "NGO",
    role: "City Food Relief",
    color: "border-info/40 hover:border-info hover:bg-infoLight",
  },
  {
    email: "admin@rescuerelay.demo",
    label: "Admin",
    role: "Food Rescue Relay Admin",
    color: "border-muted/40 hover:border-muted hover:bg-background",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from landing page ?demo= param
  useEffect(() => {
    const demoEmail = searchParams.get("demo");
    if (demoEmail) {
      setEmail(demoEmail);
      setPassword(DEMO_PASSWORD);
    }
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : "Could not sign in. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <AuthLayout>
        <section className="rounded-3xl border border-border bg-surface p-6 shadow-card md:rounded-r-none md:p-10 lg:p-12">
          <div className="mb-6">
            <div className="mb-4 flex">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primaryLight">
                <Utensils className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="eyebrow mb-3 text-primary">Welcome to the community</p>
            <h1 className="text-3xl font-bold tracking-tight text-ink">Good food.<br/>A fresh start.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">Sign in to Food Rescue Relay to share surplus, coordinate a pickup, or see the difference you make.</p>
          </div>

          {/* Login form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                className="pr-12"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-7 grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-background hover:text-ink"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button type="submit" size="lg" disabled={submitting}>
              <LogIn className="h-4 w-4" />
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-sm text-muted">
            New to Food Rescue Relay? <Link to="/signup" className="font-semibold text-primary underline underline-offset-4">Create an account</Link>
          </p>
        </section>
        <section className="harvest-hero rounded-3xl p-6 md:rounded-l-none md:p-10 lg:p-12" aria-labelledby="quick-access">
          <HeartHandshake className="mb-5 h-9 w-9 text-amber-200" aria-hidden="true"/>
          <h2 id="quick-access" className="text-2xl font-bold">One community.<br/>Many ways to help.</h2>
          <p className="mb-5 mt-3 text-sm leading-relaxed text-white/80">Choose your workspace to fill the sign-in form.</p>
          <div className="grid grid-cols-1 gap-3">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                aria-pressed={email === account.email}
                className={`flex min-h-14 items-center gap-3 rounded-xl border bg-surface px-3 py-3 text-left transition-all ${email === account.email ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-primaryDark" : ""} ${account.color}`}
                onClick={() => fillDemo(account.email)}
              >
                <span className="inline-flex w-14 shrink-0 justify-center rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted">
                  {account.label}
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">{account.role}</span>
                {email === account.email && <CheckCircle2 size={18} className="shrink-0 text-primary" aria-hidden="true"/>}
              </button>
            ))}
          </div>
        </section>

    </AuthLayout>
  );
}
