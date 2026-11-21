import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import Button from "../../components/ui/Button";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import type { AdminOrg } from "../../types/api";

const PAGE_SIZE = 50;

export default function AdminOrganizationsPage() {
  const { token } = useAuth();
  const [offset, setOffset] = useState(0);

  const orgsQuery = useQuery({
    queryKey: ["admin", "organizations", offset],
    queryFn: () =>
      apiRequest<AdminOrg[]>(`/admin/organizations?limit=${PAGE_SIZE}&offset=${offset}`, {
        token,
      }),
    enabled: !!token,
  });

  const orgs = orgsQuery.data ?? [];

  return (
    <AppShell title="Organizations" nav="admin">
      <div className="flex flex-col gap-4">
        {orgsQuery.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : orgsQuery.isError ? (
          <p role="alert" className="text-sm text-red-700">
            {orgsQuery.error instanceof Error
              ? orgsQuery.error.message
              : "Could not load organizations."}
          </p>
        ) : orgs.length === 0 ? (
          <EmptyState title="No organizations yet." body="Organizations will appear here once they register." />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="flex flex-col gap-3 md:hidden">
              {orgs.map((org) => (
                <li key={org.id}>
                  <Card>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="font-medium">Name</dt>
                      <dd>{org.name}</dd>
                      <dt className="font-medium">Type</dt>
                      <dd>{org.organization_type}</dd>
                      <dt className="font-medium">Verification</dt>
                      <dd>{org.verification_status}</dd>
                      <dt className="font-medium">Locality</dt>
                      <dd>{org.locality}</dd>
                      <dt className="font-medium">Reliability</dt>
                      <dd>{Math.round(org.reliability * 100)}%</dd>
                    </dl>
                  </Card>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse text-left text-sm">
                <caption className="mb-2 text-left text-base font-semibold">
                  Organizations
                </caption>
                <thead>
                  <tr className="border-b border-slate-300">
                    <th scope="col" className="px-3 py-2">Name</th>
                    <th scope="col" className="px-3 py-2">Type</th>
                    <th scope="col" className="px-3 py-2">Verification</th>
                    <th scope="col" className="px-3 py-2">Locality</th>
                    <th scope="col" className="px-3 py-2">Reliability</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id} className="border-b border-slate-200">
                      <td className="px-3 py-2">{org.name}</td>
                      <td className="px-3 py-2">{org.organization_type}</td>
                      <td className="px-3 py-2">{org.verification_status}</td>
                      <td className="px-3 py-2">{org.locality}</td>
                      <td className="px-3 py-2">{Math.round(org.reliability * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            disabled={offset === 0 || orgsQuery.isFetching}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous page
          </Button>
          <Button
            variant="secondary"
            disabled={orgs.length < PAGE_SIZE || orgsQuery.isFetching}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next page
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
