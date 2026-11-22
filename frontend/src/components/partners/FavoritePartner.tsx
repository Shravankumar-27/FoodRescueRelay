import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";

interface Partner {
  id: string;
  name: string;
  locality: string;
}

const key = ["favorite-partners"];

export function useFavoritePartners() {
  const { token } = useAuth();
  return useQuery({
    queryKey: key,
    queryFn: () => apiRequest<Partner[]>("/partners/favorites", { token }),
    enabled: !!token,
  });
}

export default function FavoritePartner({ id, name }: { id: string; name: string }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const favorites = useFavoritePartners();
  const saved = !!favorites.data?.some(partner => partner.id === id);
  const update = useMutation({
    mutationFn: (favorite: boolean) => apiRequest(`/partners/${id}/favorite`, { method: "PUT", token, body: { favorite } }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const label = saved ? `Remove ${name} from favorites` : `Favorite ${name}`;
  return <button type="button" aria-label={label} title={label} aria-pressed={saved}
    disabled={!favorites.data || update.isPending} onClick={() => update.mutate(!saved)}
    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primaryLight disabled:opacity-60">
    <Heart className={saved ? "h-5 w-5 fill-current" : "h-5 w-5"}/>
  </button>;
}
