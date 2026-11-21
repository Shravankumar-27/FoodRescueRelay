import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../features/auth/AuthContext";
import { ApiError } from "../lib/api";

const DEMO_PASSWORD = "demo123";

const DEMO_ACCOUNTS: { email: string; label: string }[] = [
  { email: "donor@rescuerelay.demo", label: "Donor — Madhapur Grand Events" },
  { email: "hope@rescuerelay.demo", label: "Receiver — Hope Community Kitchen" },
  { email: "shelter@rescuerelay.demo", label: "Receiver — ShelterServe" },
  { email: "cityfood@rescuerelay.demo", label: "Receiver — City Food Relief" },
  { email: "admin@rescuerelay.demo", label: "Admin" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-4">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-primary">RescueRelay</h1>
        <p className="mt-2 text-muted">Surplus food has a deadline. RescueRelay beats it.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-sm">
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <div role="alert" className="rounded-input border border-danger bg-red-50 p-3 text-sm text-danger">
            {error}
          </div>
        )}
        <Button type="submit" disabled={submitting}>
          Sign in
        </Button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted">Demo accounts (demo use only, synthetic data)</h2>
        <div className="flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              variant="secondary"
              className="justify-start"
              onClick={() => fillDemo(account.email)}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
