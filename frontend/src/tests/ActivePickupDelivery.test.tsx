import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ActivePickupPage from "../pages/receiver/ActivePickupPage";
import { ToastProvider } from "../features/toast/ToastContext";
import ApiErrorToasts from "../features/toast/ApiErrorToasts";
import { apiRequest } from "../lib/api";

vi.mock("../features/auth/AuthContext", () => ({ useAuth: () => ({ token: "test-token" }) }));
vi.mock("../lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../components/layout/AppShell", () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock("../components/rescue/RecognitionCard", () => ({ default: () => null }));
vi.mock("../components/rescue/PartnerRating", () => ({ default: () => null }));
vi.mock("../components/rescue/MealFeedback", () => ({ default: () => null }));
vi.mock("../components/chat/ChatBox", () => ({ default: () => null }));

const collected = {
  id: "test-rescue", display_id: "RR-TEST", status: "COLLECTED", donor_organization_name: "Demo Donor",
  food_items: [], collected_servings: 20, total_servings: 20, handling_type: "HOT_HELD", prepared_at: "2026-11-22T08:00:00Z",
  status_events: [{ to_status: "COLLECTED", created_at: "2026-11-22T08:13:00Z" }],
};

function renderPickup() {
  const client = new QueryClient();
  render(<MemoryRouter initialEntries={["/receiver/pickup/test-rescue"]}>
    <QueryClientProvider client={client}>
      <ToastProvider><ApiErrorToasts/><Routes>
        <Route path="/receiver/pickup/:rescueId" element={<ActivePickupPage/>}/>
      </Routes></ToastProvider>
    </QueryClientProvider>
  </MemoryRouter>);
}

describe("Pickup delivery", () => {
  it("updates the timeline from the confirmed response without waiting for a refetch", async () => {
    vi.mocked(apiRequest).mockReset().mockResolvedValueOnce(collected).mockResolvedValueOnce({
      rescue: { ...collected, status: "DELIVERED", impact: { delivered_servings: 20 },
        status_events: [...collected.status_events, { to_status: "DELIVERED", created_at: "2026-11-22T08:20:00Z" }] },
    });
    renderPickup();
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Servings delivered" }), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm delivery" }));
    expect(await screen.findByRole("heading", { name: "20 meals delivered" })).toBeVisible();
    expect(screen.getAllByRole("listitem")[4]).toHaveTextContent("Delivered (done)");
    expect(screen.getByRole("alert")).toHaveTextContent("Delivery confirmed.");
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it("shows a toast when confirmation fails and leaves the pickup collected", async () => {
    vi.mocked(apiRequest).mockReset().mockResolvedValue(collected)
      .mockResolvedValueOnce(collected).mockRejectedValueOnce(new Error("Delivery could not be saved."));
    renderPickup();
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Servings delivered" }), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm delivery" }));
    expect(await screen.findByText("Delivery could not be saved.")).toBeVisible();
    expect(screen.getAllByRole("listitem")[3]).toHaveTextContent("Collection (current)");
  });
});
