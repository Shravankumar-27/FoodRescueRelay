import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import Skeleton from "../components/ui/Skeleton";
import { useAuth } from "../features/auth/AuthContext";
import type { Role } from "../types/api";

export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return <Skeleton className="m-4 h-24" />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
