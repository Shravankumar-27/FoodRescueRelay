import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Utensils, LogIn, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
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

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
        {/* Branding */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primaryLight">
              <Utensils className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">
            Surplus food has a deadline.{" "}
            <span className="font-semibold text-primary">RescueRelay beats it.</span>
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-9 text-muted hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <div role="alert" className="rounded-input border border-danger bg-dangerLight p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={submitting}>
            <LogIn className="h-4 w-4" />
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {/* Demo accounts */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <p className="text-xs font-semibold text-muted">DEMO ACCOUNTS · password: demo123</p>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className={`flex min-h-[44px] items-center gap-3 rounded-button border bg-surface px-3 text-left transition-all ${account.color}`}
                onClick={() => fillDemo(account.email)}
              >
                <span className="inline-flex rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-muted">
                  {account.label}
                </span>
                <span className="text-sm font-medium text-ink">{account.role}</span>
              </button>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-muted">
          🔒 Sample data only. No real personal information.
        </p>
      </div>
    </div>
  );
}
