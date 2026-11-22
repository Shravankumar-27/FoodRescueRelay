import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../features/toast/ToastContext";
import { ApiError, apiRequest } from "../lib/api";
import ActiveRescuePage from "../pages/donor/ActiveRescuePage";

vi.mock("../components/layout/AppShell", () => ({
  default: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock("../features/auth/AuthContext", () => ({
  useAuth: () => ({ token: "test-token", user: { role: "DONOR" } }),
}));
vi.mock("../lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/api")>(),
  apiRequest: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function renderRescue() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/donor/rescue/rr-test"]}>
        <ToastProvider>
          <Routes>
            <Route path="/donor/rescue/:id" element={<ActiveRescuePage/>}/>
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("delivered rescue details", () => {
  it("keeps the impact summary short and opens the completed handoff chat on demand", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        status: "DELIVERED",
        display_id: "RR-12345678",
        food_items: [],
        total_servings: 24,
        pickup_by: "2026-01-01T12:00:00Z",
        handling_type: "HOT_HELD",
        impact: { delivered_servings: 24 },
        claimed_receiver: { name: "City Food Relief" },
      })
      .mockResolvedValueOnce({
        messages: [{ id: "m1", sender_name: "City Food Relief", sender_role: "RECEIVER", message: "Delivery confirmed.", created_at: "2026-01-01T12:00:00Z" }],
        suggested: [],
      });

    renderRescue();
    expect(await screen.findByText("Estimated climate benefit")).toBeVisible();
    expect(screen.getByText("kg CO₂e avoided")).toBeVisible();
    expect(screen.getByText("9.6 kg")).toBeVisible();
    expect(screen.getByText("Meals delivered")).toBeVisible();
    expect(screen.queryByText("How we calculate this")).toBeNull();
    const chat = screen.getByRole("button", { name: "Messages with City Food Relief" });
    expect(chat).toHaveAttribute("aria-expanded", "false");
    expect(apiRequest).toHaveBeenCalledTimes(1);

    await userEvent.click(chat);
    const transcript = await screen.findByRole("log");
    expect(await within(transcript).findByText("Delivery confirmed.")).toBeVisible();
    expect(apiRequest).toHaveBeenLastCalledWith("/rescues/rr-test/chat", { token: "test-token" });
  });

  it("links to rescue history when a saved rescue URL no longer exists", async () => {
    vi.mocked(apiRequest).mockRejectedValue(new ApiError("RESCUE_NOT_FOUND", "Rescue not found.", 404));
    renderRescue();

    expect(await screen.findByText("Rescue unavailable")).toBeVisible();
    expect(screen.getByRole("link", { name: "View rescue history" })).toHaveAttribute("href", "/donor/rescues");
  });
});
