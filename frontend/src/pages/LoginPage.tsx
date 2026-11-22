import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Utensils, LogIn, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
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
    role: "ShelterServe",
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
    role: "RescueRelay Admin",
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-50 via-background to-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-black">
              R
            </span>
            RescueRelay
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-4 px-4 py-8 md:grid-cols-2 md:gap-0 md:px-8">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-card md:rounded-r-none md:p-10">
          <div className="mb-6">
            <div className="mb-4 flex">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primaryLight">
                <Utensils className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-ink">Sign in to RescueRelay</h1>
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
        </section>
        <section className="rounded-2xl border border-border bg-primaryLight p-6 md:rounded-l-none md:border-l-0 md:p-10" aria-labelledby="quick-access">
          <h2 id="quick-access" className="text-xl font-bold text-primaryDark">Quick access</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Select an account to fill the sign-in form.</p>
          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className={`flex min-h-12 items-center gap-3 rounded-xl border bg-surface px-3 text-left transition-all ${account.color}`}
                onClick={() => fillDemo(account.email)}
              >
                <span className="inline-flex w-14 shrink-0 justify-center rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted">
                  {account.label}
                </span>
                <span className="text-sm font-medium text-ink">{account.role}</span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
