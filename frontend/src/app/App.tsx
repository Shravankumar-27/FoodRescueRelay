import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { ToastProvider } from "../features/toast/ToastContext";
import Skeleton from "../components/ui/Skeleton";
import RequireRole from "./RequireRole";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import DonorHomePage from "../pages/donor/DonorHomePage";
import CreateRescuePage from "../pages/donor/CreateRescuePage";
import ActiveRescuePage from "../pages/donor/ActiveRescuePage";
import RescueHistoryPage from "../pages/donor/RescueHistoryPage";
import DonorImpactPage from "../pages/donor/DonorImpactPage";
import ReceiverHomePage from "../pages/receiver/ReceiverHomePage";
import ActivePickupPage from "../pages/receiver/ActivePickupPage";
import CapacitySettingsPage from "../pages/receiver/CapacitySettingsPage";
import ReceiverHistoryPage from "../pages/receiver/ReceiverHistoryPage";
import AdminOverviewPage from "../pages/admin/AdminOverviewPage";
import AdminOrganizationsPage from "../pages/admin/AdminOrganizationsPage";
import AdminRescuesPage from "../pages/admin/AdminRescuesPage";

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
            <Routes>
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
                    <DonorImpactPage />
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
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
