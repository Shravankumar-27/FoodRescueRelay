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
  });

  it("treats OFFERED as the matched step", () => {
    render(<StatusTimeline events={[]} status="OFFERED" />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(items[1]).toBe("Matched (current)");
  });
});
