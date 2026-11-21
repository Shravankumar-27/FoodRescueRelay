import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppShell from "../../components/layout/AppShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import Skeleton from "../../components/ui/Skeleton";
import StatusBadge from "../../components/rescue/StatusBadge";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { AdminRescue } from "../../types/api";

const PAGE_SIZE = 50;

export default function AdminRescuesPage() {
  const { token } = useAuth();
  const [offset, setOffset] = useState(0);

  const rescuesQuery = useQuery({
    queryKey: ["admin", "rescues", offset],
    queryFn: () =>
      apiRequest<AdminRescue[]>(`/admin/rescues?limit=${PAGE_SIZE}&offset=${offset}`, {
        token,
      }),
    enabled: !!token,
  });

  const rescues = rescuesQuery.data ?? [];

  return (
    <AppShell title="Rescues" nav="admin">
      <div className="flex flex-col gap-4">
        {rescuesQuery.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rescuesQuery.isError ? (
          <p role="alert" className="text-sm text-red-700">
            {rescuesQuery.error instanceof Error
              ? rescuesQuery.error.message
              : "Could not load rescues."}
          </p>
        ) : rescues.length === 0 ? (
          <EmptyState title="No rescues yet." body="Rescues will appear here once donors create them." />
        ) : (
          <>
            {/* Mobile: stacked cards */}
            <ul className="flex flex-col gap-3 md:hidden">
              {rescues.map((r) => (
                <li key={r.id}>
                  <Card>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{r.display_id}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <p>Donor: {r.donor_organization_name}</p>
                      <p>Servings: {r.total_servings}</p>
                      <p>Pick up by: {formatDateTime(r.pickup_by)}</p>
                      <p>Created: {formatDateTime(r.created_at)}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse text-left text-sm">
                <caption className="mb-2 text-left text-base font-semibold">Rescues</caption>
                <thead>
                  <tr className="border-b border-slate-300">
                    <th scope="col" className="px-3 py-2">Rescue</th>
                    <th scope="col" className="px-3 py-2">Status</th>
                    <th scope="col" className="px-3 py-2">Donor</th>
                    <th scope="col" className="px-3 py-2">Servings</th>
                    <th scope="col" className="px-3 py-2">Pick up by</th>
                    <th scope="col" className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rescues.map((r) => (
                    <tr key={r.id} className="border-b border-slate-200">
                      <td className="px-3 py-2">{r.display_id}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2">{r.donor_organization_name}</td>
                      <td className="px-3 py-2">{r.total_servings}</td>
                      <td className="px-3 py-2">{formatDateTime(r.pickup_by)}</td>
                      <td className="px-3 py-2">{formatDateTime(r.created_at)}</td>
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
            disabled={offset === 0 || rescuesQuery.isFetching}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous page
          </Button>
          <Button
            variant="secondary"
            disabled={rescues.length < PAGE_SIZE || rescuesQuery.isFetching}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next page
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
