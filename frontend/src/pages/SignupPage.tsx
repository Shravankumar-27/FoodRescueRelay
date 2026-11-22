import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake, ShieldCheck, UserPlus, Utensils } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import AuthLayout from "../features/auth/AuthLayout";
import { useAuth } from "../features/auth/AuthContext";
import { ApiError, apiRequest } from "../lib/api";
import type { SignupRequest } from "../types/api";

export default function SignupPage() {
  const { signup, user, isReady } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const localities = useQuery({
    queryKey: ["auth", "signup-localities"],
    queryFn: () => apiRequest<string[]>("/auth/signup/localities"),
    enabled: isReady && !user,
    meta: { silent: true },
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady || submitting || !localities.data) return;

    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name")).trim();
    const organizationName = String(fields.get("organization_name")).trim();
    const locality = String(fields.get("locality"));
    const streetAddress = String(fields.get("street_address")).trim();
    const password = String(fields.get("password"));
    if (!name || !organizationName || !streetAddress || !localities.data.includes(locality)) {
      setError("Enter your name, organization name, and street address, and choose a neighborhood.");
      return;
    }
    if (Array.from(password).length < 8 || new TextEncoder().encode(password).length > 72) {
      setError("Use at least 8 characters and no more than 72 bytes for your password.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await signup({
        name,
        email: String(fields.get("email")).trim(),
        password,
        organization_name: organizationName,
        organization_type: fields.get("organization_type") as SignupRequest["organization_type"],
        locality,
        street_address: streetAddress,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your account. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isReady && user) return <Navigate to="/" replace />;

  return (
    <AuthLayout>
      <section className="min-w-0 rounded-3xl border border-border bg-surface p-6 shadow-card md:rounded-r-none md:p-8 lg:p-10" aria-labelledby="signup-title">
        <div className="mb-6">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primaryLight text-primary">
            <UserPlus className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 id="signup-title" className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Create your account</h1>
          <p className="mt-2 text-base text-muted">Join Food Rescue Relay with your organization.</p>
        </div>

        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <fieldset disabled={submitting} className="min-w-0 space-y-4">
            <legend className="sr-only">Account and organization details</legend>
            <Input label="Full name" name="name" autoComplete="name" maxLength={120} required />
            <Input label="Work email" name="email" type="email" autoComplete="username" maxLength={255} required />
            <Input label="Password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} hint="Use at least 8 characters." required />

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <Input label="Organization name" name="organization_name" autoComplete="organization" maxLength={200} required />
              <Select label="Organization type" name="organization_type" defaultValue="" required>
                <option value="" disabled>Choose a type</option>
                <option value="CATERER">Caterer or event venue</option>
                <option value="NGO">NGO</option>
                <option value="COMMUNITY_KITCHEN">Community kitchen</option>
                <option value="SHELTER">Shelter</option>
              </Select>
            </div>
            <Input label="Street address" name="street_address" autoComplete="address-line1" maxLength={250} placeholder="Building or plot number and street" required />
            <Select label="Hyderabad neighborhood" name="locality" defaultValue="" required disabled={!localities.data} hint="We use your neighborhood to estimate distances to nearby partners.">
              <option value="" disabled>{localities.isError ? "Neighborhoods unavailable" : localities.isPending ? "Loading neighborhoods…" : "Choose a neighborhood"}</option>
              {localities.data?.map((locality) => <option key={locality} value={locality}>{locality}</option>)}
            </Select>
            {localities.isError && (
              <Button type="button" variant="secondary" disabled={localities.isFetching} onClick={() => void localities.refetch()}>
                {localities.isFetching ? "Loading neighborhoods…" : "Retry loading neighborhoods"}
              </Button>
            )}
            {error && <p role="alert" className="rounded-xl bg-danger/5 p-3 text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={!localities.data || submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </fieldset>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="font-semibold text-primary underline underline-offset-4">Sign in</Link>
        </p>
      </section>

      <aside className="harvest-hero flex flex-col justify-center md:rounded-l-none md:p-8 lg:p-12" aria-labelledby="partner-title">
        <HeartHandshake className="mb-5 h-10 w-10 text-amber-200" aria-hidden="true" />
        <h2 id="partner-title" className="max-w-sm text-3xl font-bold tracking-tight sm:text-4xl">Get good food to people who need it.</h2>
        <ul className="mt-7 divide-y divide-white/20 border-y border-white/20">
          <li className="flex items-start gap-3 py-4">
            <Utensils className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
            <div><h3 className="font-semibold">Donate surplus food</h3><p className="mt-1 text-sm leading-relaxed text-white/80">Caterers and event venues can post food and coordinate pickups.</p></div>
          </li>
          <li className="flex items-start gap-3 py-4">
            <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
            <div><h3 className="font-semibold">Receive food for your community</h3><p className="mt-1 text-sm leading-relaxed text-white/80">NGOs, community kitchens, and shelters can set their capacity and find nearby donations.</p></div>
          </li>
        </ul>
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/10 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-white/90">You can open your dashboard right away. An administrator reviews your organization before you can post or claim food.</p>
        </div>
      </aside>
    </AuthLayout>
  );
}
