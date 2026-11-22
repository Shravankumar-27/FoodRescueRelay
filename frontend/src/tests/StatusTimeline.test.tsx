import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusTimeline from "../components/rescue/StatusTimeline";

function stepLabels(): string[] {
  return screen
    .getAllByRole("listitem")
    .map((li) => (li.textContent ?? "").split(" (")[0]);
}

describe("StatusTimeline", () => {
  it("renders the five timeline steps in order", () => {
    render(<StatusTimeline events={[]} status="POSTED" />);
    expect(stepLabels()).toEqual(["Posted", "Matched", "Claimed", "Collection", "Delivered"]);
  });

  it("marks earlier steps done, the current step current, and later steps pending", () => {
    render(<StatusTimeline events={[]} status="COLLECTED" />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items).toEqual([
      "Posted (done)",
      "Matched (done)",
      "Claimed (done)",
      "Collection (current)",
      "Delivered (pending)",
    ]);
    expect(screen.getAllByRole("listitem")[3]).toHaveAttribute("aria-current", "step");
  });

  it("treats OFFERED as the matched step", () => {
    render(<StatusTimeline events={[]} status="OFFERED" />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items[1]).toBe("Matched (current)");
  });

  it("marks delivered and collection done when the confirmed delivery arrives", () => {
    const { rerender } = render(<StatusTimeline events={[]} status="COLLECTED"/>);
    expect(screen.getAllByRole("listitem")[3]).toHaveTextContent("Collection (current)");
    rerender(<StatusTimeline events={[{ to_status: "DELIVERED", created_at: "2026-11-22T08:13:00Z" }]} status="DELIVERED"/>);
    expect(screen.getAllByRole("listitem")[3]).toHaveTextContent("Collection (done)");
    expect(screen.getAllByRole("listitem")[4]).toHaveTextContent("Delivered (done)");
    expect(screen.getAllByRole("listitem")[4]).toHaveTextContent("1:43 pm");
  });

  it("does not describe an unmatched rescue as matched", () => {
    render(<StatusTimeline events={[]} status="MATCHING" />);
    expect(screen.getAllByRole("listitem")[1]).toHaveTextContent("Matching (current)");
  });

  it("preserves claimed progress on expiry without implying collection", () => {
    render(<StatusTimeline events={[{to_status:"CLAIMED",created_at:"2026-11-22T00:00:00Z"}]} status="EXPIRED" />);
    const items = screen.getAllByRole("listitem");
    expect(items[2]).toHaveTextContent("Claimed (done)");
    expect(items[3]).toHaveTextContent("Collection (pending)");
    expect(screen.getByText(/Pickup window expired/)).toBeVisible();
  });
});
