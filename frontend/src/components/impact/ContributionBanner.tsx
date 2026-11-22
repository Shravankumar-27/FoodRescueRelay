import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Coins, ArrowUpRight } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { apiRequest } from "../../lib/api";
import type { Contribution } from "../../types/contribution";

export default function ContributionBanner() {
  const {token,user}=useAuth();
  const q=useQuery({queryKey:["contribution",user?.id],queryFn:()=>apiRequest<Contribution>("/contribution",{token}),refetchInterval:15000});
  if(!q.data) return null;
  return <Link to="/contribution" className="contribution-banner"><div className="coin-mark"><Coins size={24}/></div><div className="min-w-0 flex-1"><p className="font-extrabold">{q.data.coins.toLocaleString("en-IN")} kindness coins <span className="font-normal text-muted">· {q.data.medal}</span></p><p className="mt-1 text-sm text-muted">{user?.role==="RECEIVER"?"Your care gives good food a future.":"Your generosity is becoming a community legacy."} See medals, posters & benefits.</p></div><ArrowUpRight className="shrink-0" size={21}/></Link>;
}
