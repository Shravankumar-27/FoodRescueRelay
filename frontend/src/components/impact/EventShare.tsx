import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import Button from "../ui/Button";
import Card from "../ui/Card";

export default function EventShare({ rescueId }: { rescueId: string }) {
  const { token } = useAuth();
  const share = useMutation({
    mutationFn: () => apiRequest<{ token: string }>(`/rescues/${rescueId}/event-share`, { method: "POST", token }),
  });
  return <Card>
    <h3 className="font-bold">Client event report</h3>
    <p className="my-2 text-sm text-muted">Share meals delivered, estimated impact and the receiving organisation for this donation. Anyone with the link can view the report.</p>
    {share.data ? <Link to={`/events/impact/${share.data.token}`} className="view-toggle">Open shareable event report</Link>
      : <Button type="button" variant="secondary" disabled={share.isPending} onClick={() => share.mutate()}>Create shareable event report</Button>}
    {share.isError && <p role="alert" className="mt-2 text-sm text-urgent">{share.error.message}</p>}
  </Card>;
}
