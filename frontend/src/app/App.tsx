import { useState, lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { ToastProvider } from "../features/toast/ToastContext";
import Skeleton from "../components/ui/Skeleton";
import RequireRole from "./RequireRole";
const LandingPage = lazy(() => import("../pages/LandingPage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const DonorHomePage = lazy(() => import("../pages/donor/DonorHomePage"));
const CreateRescuePage = lazy(() => import("../pages/donor/CreateRescuePage"));
const ActiveRescuePage = lazy(() => import("../pages/donor/ActiveRescuePage"));
const RescueHistoryPage = lazy(() => import("../pages/donor/RescueHistoryPage"));
const CommunityImpactPage = lazy(() => import("../pages/CommunityImpactPage"));
const LeaderboardPage = lazy(() => import("../pages/LeaderboardPage"));
const PricingPage = lazy(() => import("../pages/PricingPage"));
const MessagesPage = lazy(() => import("../pages/MessagesPage"));
const ReceiverHomePage = lazy(() => import("../pages/receiver/ReceiverHomePage"));
const ActivePickupPage = lazy(() => import("../pages/receiver/ActivePickupPage"));
const CapacitySettingsPage = lazy(() => import("../pages/receiver/CapacitySettingsPage"));
const ReceiverHistoryPage = lazy(() => import("../pages/receiver/ReceiverHistoryPage"));
const AdminOverviewPage = lazy(() => import("../pages/admin/AdminOverviewPage"));
const AdminOrganizationsPage = lazy(() => import("../pages/admin/AdminOrganizationsPage"));
const AdminRescuesPage = lazy(() => import("../pages/admin/AdminRescuesPage"));

function RoleHome() {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-24 w-64" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === "DONOR") {
    return <Navigate to="/donor" replace />;
  }
  if (user.role === "RECEIVER") {
    return <Navigate to="/receiver" replace />;
  }
  return <Navigate to="/admin" replace />;
}

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="p-6"><Skeleton className="h-64 w-full" /></div>}>
            <Routes>
              <Route path="/community/impact" element={<CommunityImpactPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/leaderboard" element={<RequireRole roles={["DONOR", "RECEIVER", "ADMIN"]}><LeaderboardPage /></RequireRole>} />
              <Route path="/messages" element={<RequireRole roles={["DONOR", "RECEIVER"]}><MessagesPage /></RequireRole>} />
              <Route path="/receiver/impact" element={<RequireRole roles={["RECEIVER"]}><CommunityImpactPage personal /></RequireRole>} />
              {/* Public routes */}
              <Route path="/home" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<RoleHome />} />

              {/* Donor routes */}
              <Route
                path="/donor"
                element={
                  <RequireRole roles={["DONOR"]}>
                    <DonorHomePage />
                  </RequireRole>
                }
              />
              <Route
                path="/donor/rescue/new"
                element={
                  <RequireRole roles={["DONOR"]}>
                    <CreateRescuePage />
                  </RequireRole>
                }
              />
              <Route
                path="/donor/rescue/:id"
                element={
                  <RequireRole roles={["DONOR"]}>
                    <ActiveRescuePage />
                  </RequireRole>
                }
              />
              <Route
                path="/donor/rescues"
                element={
                  <RequireRole roles={["DONOR"]}>
                    <RescueHistoryPage />
                  </RequireRole>
                }
              />
              <Route
                path="/donor/impact"
                element={
                  <RequireRole roles={["DONOR"]}>
                    <CommunityImpactPage personal />
                  </RequireRole>
                }
              />

              {/* Receiver routes */}
              <Route
                path="/receiver"
                element={
                  <RequireRole roles={["RECEIVER"]}>
                    <ReceiverHomePage />
                  </RequireRole>
                }
              />
              <Route
                path="/receiver/pickup/:rescueId"
                element={
                  <RequireRole roles={["RECEIVER"]}>
                    <ActivePickupPage />
                  </RequireRole>
                }
              />
              <Route
                path="/receiver/capacity"
                element={
                  <RequireRole roles={["RECEIVER"]}>
                    <CapacitySettingsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/receiver/history"
                element={
                  <RequireRole roles={["RECEIVER"]}>
                    <ReceiverHistoryPage />
                  </RequireRole>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <RequireRole roles={["ADMIN"]}>
                    <AdminOverviewPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/organizations"
                element={
                  <RequireRole roles={["ADMIN"]}>
                    <AdminOrganizationsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/rescues"
                element={
                  <RequireRole roles={["ADMIN"]}>
                    <AdminRescuesPage />
                  </RequireRole>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
