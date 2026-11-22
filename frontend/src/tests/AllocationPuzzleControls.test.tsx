import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AllocationPuzzle from "../components/rescue/AllocationPuzzle";
import { apiRequest } from "../lib/api";

vi.mock("../features/auth/AuthContext", () => ({ useAuth: () => ({ token: "test-token" }) }));
vi.mock("../lib/api", () => ({ apiRequest: vi.fn() }));

describe("Allocation puzzle controls", () => {
  it("recalculates the posted plan when the donor changes an NGO’s capacity", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      items: [{ id: "rice", name: "Rice", diet: "VEG", servings: 200 }],
      requires_refrigeration: false,
      pickup_by: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      receivers: [
        { id: "a", name: "Kitchen A", capacity: 30, volunteers: null, refrigeration: false, pickup_minutes: 12, eligible_items: ["rice"] },
        { id: "b", name: "Kitchen B", capacity: 60, volunteers: null, refrigeration: false, pickup_minutes: 15, eligible_items: ["rice"] },
        { id: "c", name: "Kitchen C", capacity: 120, volunteers: 50, refrigeration: true, pickup_minutes: 18, eligible_items: ["rice"] },
      ],
    });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><AllocationPuzzle rescueId="rescue-1"/></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Explore split plan" }));
    expect(await screen.findByText("140 of 200 servings allocated")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: "Volunteer capacity (50 servings)" }), { target: { value: "110" } });
    expect(screen.getByText("200 of 200 servings allocated")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset to receiver settings" }));
    expect(screen.getByText("140 of 200 servings allocated")).toBeInTheDocument();
  });

  it("sends only checked portions and shows the notification in the plan", async () => {
    const item = { id: "rice", name: "Rice", diet: "VEG", servings: 90 };
    vi.mocked(apiRequest).mockResolvedValueOnce({
      items: [item],
      requires_refrigeration: false,
      pickup_by: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      receivers: [
        { id: "a", name: "Kitchen A", capacity: 30, volunteers: null, refrigeration: false, pickup_minutes: 12, eligible_items: ["rice"] },
        { id: "b", name: "Kitchen B", capacity: 60, volunteers: null, refrigeration: false, pickup_minutes: 15, eligible_items: ["rice"] },
      ],
    }).mockResolvedValueOnce({
      notices: [{ receiver_id: "b", items: [{ ...item, servings: 60 }], sent_at: new Date().toISOString(), read_at: null }],
      sent: 1,
    });
    const client = new QueryClient();
    render(<MemoryRouter><QueryClientProvider client={client}><AllocationPuzzle rescueId="rescue-2"/></QueryClientProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Explore split plan" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Notify Kitchen B" }));
    fireEvent.click(screen.getByRole("button", { name: "Notify 1 selected" }));

    expect(await screen.findByText("Sent 1 allocation proposal.")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith("/rescues/rescue-2/allocation-puzzle/notify", {
      method: "POST", token: "test-token",
      body: { proposals: [{ receiver_id: "b", items: [{ item_id: "rice", servings: 60 }] }] },
    });
    expect(screen.getByRole("link", { name: "Open conversation" })).toHaveAttribute("href", "/messages?partner=b");
    expect(screen.queryByRole("checkbox", { name: "Notify Kitchen B of this update" })).not.toBeInTheDocument();
  });
});
