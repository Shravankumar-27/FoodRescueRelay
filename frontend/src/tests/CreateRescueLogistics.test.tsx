import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import CreateRescuePage from "../pages/donor/CreateRescuePage";
import { ToastProvider } from "../features/toast/ToastContext";
import { apiRequest } from "../lib/api";

vi.mock("../features/auth/AuthContext", () => ({ useAuth: () => ({ token: "test-token" }) }));
vi.mock("../lib/api", () => ({ apiRequest: vi.fn() }));
vi.mock("../components/layout/AppShell", () => ({ default: ({ children }: { children: ReactNode }) => children }));

function localDateTime(milliseconds: number) {
  const date = new Date(milliseconds);
  return new Date(milliseconds - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

describe("Posting logistics", () => {
  it("omits the two logistics checks and ignores their values from old drafts", async () => {
    const now = Date.now();
    localStorage.setItem("rr.draft", JSON.stringify({
      rows: [{ name: "Rice", quantity: "20", dietary_type: "VEG", food_category: "COOKED_MEAL",
        allergens: "", allergen_info_unknown: false }],
      untouched: "yes", holding: "HOT_HELD", packaging: true, delivery: true, attest: true,
      prepared: localDateTime(now - 600000), pickup: localDateTime(now + 3600000),
    }));
    vi.mocked(apiRequest).mockResolvedValueOnce({ id: "saved" });
    const client = new QueryClient();
    try {
      render(<MemoryRouter><QueryClientProvider client={client}><ToastProvider>
        <CreateRescuePage/>
      </ToastProvider></QueryClientProvider></MemoryRouter>);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
      expect(screen.queryByText("Packaging / containers are available for transfer")).not.toBeInTheDocument();
      expect(screen.queryByText(/our team can deliver/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Post & find a match" }));
      await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));
      const [path, options] = vi.mocked(apiRequest).mock.calls[0];
      expect(path).toBe("/rescues");
      expect(options?.body).toMatchObject({ handling_type: "HOT_HELD", safety_attestation: true });
      expect(options?.body).not.toHaveProperty("packaging_available");
      expect(options?.body).not.toHaveProperty("donor_transport_available");
    } finally {
      localStorage.removeItem("rr.draft");
    }
  });
});
